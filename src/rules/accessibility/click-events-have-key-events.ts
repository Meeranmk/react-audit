/**
 * Rule: click-events-have-key-events
 * Flags onClick handlers without corresponding keyboard event handlers.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { getJSXElementName, hasJSXAttribute } from '../../utils/ast-helpers';

// Native interactive elements that handle keyboard events natively
const INTERACTIVE_ELEMENTS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);

const rule: RuleModule = {
  meta: {
    name: 'click-events-have-key-events',
    category: 'accessibility',
    severity: 'warning',
    description: 'onClick handlers should have keyboard event alternatives.',
    docs: 'Non-interactive elements with onClick handlers must also have onKeyDown, onKeyUp, or onKeyPress for keyboard accessibility. Interactive elements like <button> handle this natively.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXOpeningElement](node: any) {
        const name = getJSXElementName(node);

        // Skip natively interactive elements
        if (INTERACTIVE_ELEMENTS.has(name.toLowerCase())) return;
        // Skip custom components (they may handle accessibility internally)
        if (/^[A-Z]/.test(name)) return;

        if (!hasJSXAttribute(node, 'onClick')) return;

        const hasKeyHandler =
          hasJSXAttribute(node, 'onKeyDown') ||
          hasJSXAttribute(node, 'onKeyUp') ||
          hasJSXAttribute(node, 'onKeyPress');

        if (!hasKeyHandler) {
          context.report({
            message: `<${name}> has onClick but no keyboard event handler (onKeyDown/onKeyUp).`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Add onKeyDown or onKeyUp handler, or use a <button> element instead.',
          });
        }
      },
    };
  },
};

export default rule;
