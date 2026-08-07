/**
 * Rule: no-effect-as-handler
 * Flags useEffect used as an event handler proxy pattern.
 * Detects: useEffect that runs setter based on a "trigger" state variable.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-effect-as-handler',
    category: 'state-effects',
    severity: 'warning',
    description: 'Avoid using useEffect as an event handler.',
    docs: 'useEffect is for synchronizing with external systems, not for responding to user events. If you need to run code in response to an event, put it in the event handler directly.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.CallExpression](node: any) {
        if (!isHookCall(node, 'useEffect')) return;

        const args = node.arguments;
        if (!args || args.length < 2) return;

        const depsArg = args[1];
        if (depsArg?.type !== AST_NODE_TYPES.ArrayExpression) return;

        // Heuristic: useEffect with exactly one boolean-looking dep
        // and body that calls a setter followed by resetting the trigger
        const deps = depsArg.elements;
        if (deps.length === 1 && deps[0]?.type === AST_NODE_TYPES.Identifier) {
          const depName = deps[0].name;
          if (
            depName.startsWith('should') ||
            depName.startsWith('is') ||
            depName.startsWith('trigger') ||
            depName.startsWith('do')
          ) {
            context.report({
              message: `useEffect depends on trigger variable "${depName}" — this looks like an event handler disguised as an effect.`,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              suggestion: 'Move this logic into the event handler that sets the trigger variable.',
            });
          }
        }
      },
    };
  },
};

export default rule;
