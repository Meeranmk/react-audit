/**
 * Rule: no-object-literal-in-jsx
 * Flags object literal expressions passed as props to custom components.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-object-literal-in-jsx',
    category: 'performance',
    severity: 'info',
    description: 'Avoid passing object literals directly as props to components.',
    docs: 'Passing an object literal as a prop creates a new reference on every render, which breaks shallow equality checks and can cause unnecessary re-renders.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXAttribute](node: any) {
        const attrName = node.name?.name;
        if (typeof attrName !== 'string') return;
        // Skip style — covered by no-inline-styles rule
        if (attrName === 'style') return;
        // Only flag on custom components
        const parent = node.parent;
        if (
          !parent ||
          parent.type !== AST_NODE_TYPES.JSXOpeningElement ||
          parent.name?.type !== AST_NODE_TYPES.JSXIdentifier ||
          !/^[A-Z]/.test(parent.name.name)
        ) {
          return;
        }

        const value = node.value;
        if (
          value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
          value.expression?.type === AST_NODE_TYPES.ObjectExpression
        ) {
          context.report({
            message: `Object literal passed as prop "${attrName}" to <${parent.name.name}> creates a new reference on every render.`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Extract the object into a useMemo or a constant outside the component.',
          });
        }
      },
    };
  },
};

export default rule;
