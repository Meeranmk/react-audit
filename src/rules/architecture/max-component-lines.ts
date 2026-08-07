/**
 * Rule: max-component-lines
 * Flags components exceeding a line count threshold.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isReactComponent, getNodeLineCount } from '../../utils/ast-helpers';

const MAX_LINES = 250;

const rule: RuleModule = {
  meta: {
    name: 'max-component-lines',
    category: 'architecture',
    severity: 'warning',
    description: `Component should not exceed ${MAX_LINES} lines.`,
    docs: `Large components are harder to maintain, test, and understand. Consider breaking components over ${MAX_LINES} lines into smaller, focused sub-components.`,
  },
  create(context) {
    return {
      [AST_NODE_TYPES.FunctionDeclaration](node: any) {
        if (!isReactComponent(node)) return;
        const lines = getNodeLineCount(node);
        if (lines > MAX_LINES) {
          context.report({
            message: `Component "${node.id?.name}" is ${lines} lines long (max: ${MAX_LINES}).`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Break this into smaller sub-components or extract logic into custom hooks.',
          });
        }
      },
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        if (!isReactComponent(node)) return;
        const init = node.init;
        if (init) {
          const lines = getNodeLineCount(init);
          if (lines > MAX_LINES) {
            const name = node.id?.type === AST_NODE_TYPES.Identifier ? node.id.name : 'Anonymous';
            context.report({
              message: `Component "${name}" is ${lines} lines long (max: ${MAX_LINES}).`,
              line: init.loc?.start.line ?? 0,
              column: init.loc?.start.column ?? 0,
              suggestion: 'Break this into smaller sub-components or extract logic into custom hooks.',
            });
          }
        }
      },
    };
  },
};

export default rule;
