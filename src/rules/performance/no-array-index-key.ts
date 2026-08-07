/**
 * Rule: no-array-index-key
 * Flags using array index as the `key` prop in .map() renders.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-array-index-key',
    category: 'performance',
    severity: 'warning',
    description: 'Avoid using array index as key in rendered lists.',
    docs: 'Using the array index as a key can cause issues with component state and performance when items are reordered, inserted, or deleted. Use a unique identifier instead.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXAttribute](node: any) {
        // Check if this is a `key` attribute
        if (
          node.name?.type === AST_NODE_TYPES.JSXIdentifier &&
          node.name.name === 'key'
        ) {
          const value = node.value;
          if (!value) return;

          // key={index} or key={i}
          if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
            const expr = value.expression;
            if (expr.type === AST_NODE_TYPES.Identifier) {
              const name = expr.name.toLowerCase();
              if (name === 'index' || name === 'i' || name === 'idx' || name === 'key') {
                context.report({
                  message: `Avoid using array index "${expr.name}" as key. Use a unique identifier instead.`,
                  line: node.loc?.start.line ?? 0,
                  column: node.loc?.start.column ?? 0,
                  suggestion: 'Use a unique id property from your data (e.g., key={item.id}).',
                });
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
