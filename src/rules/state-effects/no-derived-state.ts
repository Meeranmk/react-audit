/**
 * Rule: no-derived-state
 * Flags useState that stores values derivable from props or other state.
 * Heuristic: useState initialized from props, then synced via useEffect.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall, walkAST } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-derived-state',
    category: 'state-effects',
    severity: 'warning',
    description: 'Avoid storing derived values in state.',
    docs: 'If a value can be computed from props or other state, compute it during render instead of storing it in useState and syncing it with useEffect. This reduces complexity and prevents sync bugs.',
  },
  create(context) {
    const setterToStateName = new Map<string, { line: number; column: number }>();

    return {
      [AST_NODE_TYPES.CallExpression](node: any) {
        // Look for: const [value, setValue] = useState(prop)
        if (!isHookCall(node, 'useState')) return;

        const parent = findVariableDeclarator(node);
        if (!parent) return;

        if (parent.id?.type === AST_NODE_TYPES.ArrayPattern) {
          const elements = parent.id.elements;
          if (elements.length >= 2) {
            const setter = elements[1];
            if (setter?.type === AST_NODE_TYPES.Identifier) {
              setterToStateName.set(setter.name, {
                line: node.loc?.start.line ?? 0,
                column: node.loc?.start.column ?? 0,
              });
            }
          }
        }
      },
      // After collecting useState declarations, check if any setter is called inside useEffect
      // This is a heuristic for "sync state from props/other state"
      [AST_NODE_TYPES.Program](node: any) {
        // Second pass: look for useEffect that calls a setter
        walkAST(node, {
          [AST_NODE_TYPES.CallExpression](effectNode: any) {
            if (!isHookCall(effectNode, 'useEffect')) return;

            const callback = effectNode.arguments?.[0];
            if (!callback) return;

            walkAST(callback, {
              [AST_NODE_TYPES.CallExpression](innerCall: any) {
                if (innerCall.callee?.type === AST_NODE_TYPES.Identifier) {
                  const name = innerCall.callee.name;
                  const stateInfo = setterToStateName.get(name);
                  if (stateInfo) {
                    context.report({
                      message: `State setter "${name}" is called inside useEffect — this state may be derivable from props or other state.`,
                      line: stateInfo.line,
                      column: stateInfo.column,
                      suggestion: 'Compute the value directly during render instead of syncing via useEffect.',
                    });
                  }
                }
              },
            });
          },
        });
      },
    };
  },
};

function findVariableDeclarator(node: any): any {
  let current = node;
  // Walk up to find VariableDeclarator — simplified since we don't have parent pointers
  // This relies on the visitor being called in the right context
  return current.parent?.type === AST_NODE_TYPES.VariableDeclarator ? current.parent : null;
}

export default rule;
