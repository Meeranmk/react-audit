/**
 * Rule: no-autofocus
 * Flags autoFocus attribute usage on elements.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { hasJSXAttribute } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-autofocus',
    category: 'accessibility',
    severity: 'info',
    description: 'Avoid using autoFocus.',
    docs: 'autoFocus can be disorienting for screen reader users and disrupts the natural tab order. It can also cause issues on mobile devices. Consider managing focus programmatically when needed.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXOpeningElement](node: any) {
        if (hasJSXAttribute(node, 'autoFocus')) {
          context.report({
            message: 'Avoid using autoFocus — it can be disorienting for screen reader users.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Manage focus programmatically with useRef and element.focus() when appropriate.',
          });
        }
      },
    };
  },
};

export default rule;
