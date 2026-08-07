/**
 * Rule: no-inline-styles
 * Flags inline style={{...}} objects that create new references each render.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-inline-styles',
    category: 'performance',
    severity: 'info',
    description: 'Avoid inline style objects in JSX.',
    docs: 'Inline style objects create a new object reference on every render, preventing memoization from working. Move style objects outside the component or use useMemo.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXAttribute](node: any) {
        if (
          node.name?.type === AST_NODE_TYPES.JSXIdentifier &&
          node.name.name === 'style'
        ) {
          const value = node.value;
          if (
            value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
            value.expression?.type === AST_NODE_TYPES.ObjectExpression
          ) {
            context.report({
              message: 'Inline style object creates a new reference on every render.',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              suggestion: 'Move the style object to a constant outside the component or use useMemo.',
            });
          }
        }
      },
    };
  },
};

export default rule;
