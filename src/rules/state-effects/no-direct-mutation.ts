/**
 * Rule: no-direct-mutation
 * Flags direct state mutations (e.g., state.push, state.splice, state.property = value).
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall } from '../../utils/ast-helpers';

const MUTATING_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill'];

const rule: RuleModule = {
  meta: {
    name: 'no-direct-mutation',
    category: 'state-effects',
    severity: 'error',
    description: 'Avoid directly mutating state.',
    docs: 'React state should be treated as immutable. Directly mutating state (e.g., array.push(), object.property = value) won\'t trigger a re-render and can cause subtle bugs.',
  },
  create(context) {
    const stateNames = new Set<string>();

    return {
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        const init = node.init;
        if (!init || !isHookCall(init, 'useState')) return;

        if (node.id?.type === AST_NODE_TYPES.ArrayPattern) {
          const stateVar = node.id.elements?.[0];
          if (stateVar?.type === AST_NODE_TYPES.Identifier) {
            stateNames.add(stateVar.name);
          }
        }
      },
      [AST_NODE_TYPES.CallExpression](node: any) {
        // Check for state.push(), state.splice(), etc.
        const callee = node.callee;
        if (callee?.type !== AST_NODE_TYPES.MemberExpression) return;

        const obj = callee.object;
        const prop = callee.property;

        if (
          obj?.type === AST_NODE_TYPES.Identifier &&
          stateNames.has(obj.name) &&
          prop?.type === AST_NODE_TYPES.Identifier &&
          MUTATING_METHODS.includes(prop.name)
        ) {
          context.report({
            message: `Direct mutation of state variable "${obj.name}" via .${prop.name}(). React state should be immutable.`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: `Use the setter function with a new array/object: setState(prev => [...prev, newItem])`,
          });
        }
      },
      [AST_NODE_TYPES.AssignmentExpression](node: any) {
        // Check for state.property = value
        const left = node.left;
        if (
          left?.type === AST_NODE_TYPES.MemberExpression &&
          left.object?.type === AST_NODE_TYPES.Identifier &&
          stateNames.has(left.object.name)
        ) {
          context.report({
            message: `Direct mutation of state variable "${left.object.name}" via property assignment. React state should be immutable.`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: `Use the setter function with a new object: setState(prev => ({ ...prev, property: value }))`,
          });
        }
      },
    };
  },
};

export default rule;
