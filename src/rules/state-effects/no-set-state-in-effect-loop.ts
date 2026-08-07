/**
 * Rule: no-set-state-in-effect-loop
 * Detects setState called in useEffect without proper deps (potential infinite loop).
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall, walkAST } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-set-state-in-effect-loop',
    category: 'state-effects',
    severity: 'error',
    description: 'Avoid setting state in useEffect without proper dependencies.',
    docs: 'Calling setState inside useEffect without a dependency array (or with the state variable in the deps) can cause infinite render loops.',
  },
  create(context) {
    // Collect setter names from useState calls
    const setterNames = new Set<string>();

    return {
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        const init = node.init;
        if (!init || !isHookCall(init, 'useState')) return;

        if (node.id?.type === AST_NODE_TYPES.ArrayPattern) {
          const setter = node.id.elements?.[1];
          if (setter?.type === AST_NODE_TYPES.Identifier) {
            setterNames.add(setter.name);
          }
        }
      },
      [AST_NODE_TYPES.CallExpression](node: any) {
        if (!isHookCall(node, 'useEffect')) return;

        const args = node.arguments;
        if (!args || args.length < 1) return;

        const callback = args[0];
        const depsArg = args[1];

        // No dependency array — runs every render
        if (!depsArg) {
          // Check if callback calls a setter
          walkAST(callback, {
            [AST_NODE_TYPES.CallExpression](innerCall: any) {
              if (
                innerCall.callee?.type === AST_NODE_TYPES.Identifier &&
                setterNames.has(innerCall.callee.name)
              ) {
                context.report({
                  message: `"${innerCall.callee.name}" is called inside useEffect without a dependency array — this will cause an infinite render loop.`,
                  line: node.loc?.start.line ?? 0,
                  column: node.loc?.start.column ?? 0,
                  suggestion: 'Add a dependency array to limit when the effect runs.',
                });
              }
            },
          });
        }
      },
    };
  },
};

export default rule;
