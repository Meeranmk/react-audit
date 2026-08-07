/**
 * Rule: no-commented-code
 * Flags large blocks of commented-out code.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

// Heuristic patterns that suggest commented-out code (not regular comments)
const CODE_PATTERNS = [
  /^\s*(const|let|var|function|class|import|export|return|if|else|for|while|switch)\s/,
  /^\s*<[A-Z][a-zA-Z]*/, // JSX component
  /^\s*[a-zA-Z]+\s*\(.*\)\s*[;{]?$/, // function call
  /^\s*[a-zA-Z]+\.[a-zA-Z]+\(/, // method call
  /^\s*\{.*\}/, // object literal
  /=>/,  // arrow function
];

const MIN_COMMENTED_LINES = 3;

const rule: RuleModule = {
  meta: {
    name: 'no-commented-code',
    category: 'dead-code',
    severity: 'info',
    description: 'Remove commented-out code blocks.',
    docs: 'Large blocks of commented-out code clutter the codebase. Use version control to track deleted code instead.',
  },
  create(context) {
    // We'll analyze the source code directly for multi-line comments
    // and consecutive single-line comments that look like code
    return {
      [AST_NODE_TYPES.Program](_node: any) {
        const lines = context.sourceCode.split('\n');
        let consecutiveCommentedCode = 0;
        let blockStart = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Check single-line comments
          if (line.startsWith('//')) {
            const commentContent = line.slice(2).trim();

            if (looksLikeCode(commentContent)) {
              if (consecutiveCommentedCode === 0) {
                blockStart = i + 1; // 1-indexed
              }
              consecutiveCommentedCode++;
            } else {
              if (consecutiveCommentedCode >= MIN_COMMENTED_LINES) {
                reportBlock(context, blockStart, consecutiveCommentedCode);
              }
              consecutiveCommentedCode = 0;
            }
          } else {
            if (consecutiveCommentedCode >= MIN_COMMENTED_LINES) {
              reportBlock(context, blockStart, consecutiveCommentedCode);
            }
            consecutiveCommentedCode = 0;
          }
        }

        // Check final block
        if (consecutiveCommentedCode >= MIN_COMMENTED_LINES) {
          reportBlock(context, blockStart, consecutiveCommentedCode);
        }
      },
    };
  },
};

function looksLikeCode(text: string): boolean {
  if (text.length < 3) return false;
  // Skip TODO/FIXME/NOTE comments
  if (/^(TODO|FIXME|NOTE|HACK|XXX|BUG|REVIEW)/i.test(text)) return false;

  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

function reportBlock(context: any, startLine: number, lineCount: number): void {
  context.report({
    message: `${lineCount} lines of commented-out code. Use version control instead.`,
    line: startLine,
    column: 0,
    suggestion: 'Delete commented-out code and rely on git history to recover it if needed.',
  });
}

export default rule;
