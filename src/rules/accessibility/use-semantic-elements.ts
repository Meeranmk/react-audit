/**
 * Rule: use-semantic-elements
 * Flags <div> or <span> used as clickable elements instead of <button>.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { getJSXElementName, hasJSXAttribute } from '../../utils/ast-helpers';

const NON_SEMANTIC_ELEMENTS = new Set(['div', 'span']);

const rule: RuleModule = {
  meta: {
    name: 'use-semantic-elements',
    category: 'accessibility',
    severity: 'warning',
    description: 'Use semantic HTML elements instead of divs for interactive elements.',
    docs: '<div> and <span> with onClick handlers should be <button> or <a> elements instead. Semantic elements provide built-in keyboard interaction, focus management, and screen reader support.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXOpeningElement](node: any) {
        const name = getJSXElementName(node);
        if (!NON_SEMANTIC_ELEMENTS.has(name.toLowerCase())) return;

        if (hasJSXAttribute(node, 'onClick')) {
          // Check if it has role="button" (at least partially accessible)
          if (hasJSXAttribute(node, 'role')) return;

          context.report({
            message: `<${name}> with onClick should be a <button> element for accessibility.`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Use <button> instead of <div onClick>. It provides keyboard support, focus, and screen reader semantics automatically.',
          });
        }
      },
    };
  },
};

export default rule;
