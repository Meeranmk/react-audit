/**
 * Rule: no-unescaped-entities
 * Flags unescaped HTML entities in JSX text content.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const ENTITIES_TO_CHECK = [
  { char: '>', entity: '&gt;' },
  { char: '"', entity: '&quot;' },
  { char: "'", entity: '&apos;' },
  { char: '}', entity: '&#125;' },
];

const rule: RuleModule = {
  meta: {
    name: 'no-unescaped-entities',
    category: 'security',
    severity: 'warning',
    description: 'Escape special characters in JSX text.',
    docs: 'Unescaped entities like >, ", and \' in JSX can cause rendering issues. Use HTML entities or wrap them in expressions.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXText](node: any) {
        const text = node.value;
        if (!text || typeof text !== 'string') return;

        for (const { char, entity } of ENTITIES_TO_CHECK) {
          if (text.includes(char)) {
            // Skip if it looks intentional (inside a sentence context)
            const trimmed = text.trim();
            if (trimmed === char) continue; // single character, likely intended

            context.report({
              message: `Unescaped "${char}" in JSX text. Use ${entity} or wrap in an expression.`,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              suggestion: `Replace "${char}" with ${entity} or {'${char}'}.`,
            });
            break; // Only report once per text node
          }
        }
      },
    };
  },
};

export default rule;
