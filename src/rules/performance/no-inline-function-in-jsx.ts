/**
 * Rule: no-inline-function-in-jsx
 * Flags inline arrow functions or function expressions as JSX props.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-inline-function-in-jsx',
    category: 'performance',
    severity: 'warning',
    description: 'Avoid inline functions as JSX props.',
    docs: 'Inline functions create new function references on every render, which can cause unnecessary re-renders of child components. Extract them into useCallback or define them outside the render.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXAttribute](node: any) {
        const value = node.value;
        if (!value || value.type !== AST_NODE_TYPES.JSXExpressionContainer) return;

        const expr = value.expression;
        if (
          expr.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          expr.type === AST_NODE_TYPES.FunctionExpression
        ) {
          // Skip event handlers on native HTML elements (common and mostly harmless)
          const attrName = node.name?.name;
          if (typeof attrName === 'string' && /^on[A-Z]/.test(attrName)) {
            // Check if parent element is a custom component (starts with uppercase)
            const parent = node.parent;
            if (
              parent?.type === AST_NODE_TYPES.JSXOpeningElement &&
              parent.name?.type === AST_NODE_TYPES.JSXIdentifier &&
              /^[A-Z]/.test(parent.name.name)
            ) {
              context.report({
                message: `Inline function passed as prop "${attrName}" to <${parent.name.name}>. This creates a new reference on every render.`,
                line: node.loc?.start.line ?? 0,
                column: node.loc?.start.column ?? 0,
                suggestion: 'Extract the handler using useCallback or define it as a stable reference.',
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
