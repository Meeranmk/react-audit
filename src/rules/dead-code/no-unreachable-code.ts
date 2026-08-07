/**
 * Rule: no-unreachable-code
 * Flags code after return/throw/break/continue statements.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const TERMINATING_TYPES = new Set([
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.BreakStatement,
  AST_NODE_TYPES.ContinueStatement,
]);

const rule: RuleModule = {
  meta: {
    name: 'no-unreachable-code',
    category: 'dead-code',
    severity: 'warning',
    description: 'Remove unreachable code after return/throw statements.',
    docs: 'Code after return, throw, break, or continue statements is never executed and should be removed.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.BlockStatement](node: any) {
        const body = node.body;
        if (!Array.isArray(body)) return;

        let foundTerminator = false;

        for (const stmt of body) {
          if (foundTerminator) {
            // This statement is unreachable
            // Skip function/class declarations (they are hoisted)
            if (
              stmt.type === AST_NODE_TYPES.FunctionDeclaration ||
              stmt.type === AST_NODE_TYPES.ClassDeclaration
            ) {
              continue;
            }

            context.report({
              message: 'Unreachable code detected after a return/throw statement.',
              line: stmt.loc?.start.line ?? 0,
              column: stmt.loc?.start.column ?? 0,
              suggestion: 'Remove the unreachable code or restructure the logic.',
            });
            break; // Only report once per block
          }

          if (TERMINATING_TYPES.has(stmt.type)) {
            foundTerminator = true;
          }
        }
      },
    };
  },
};

export default rule;
