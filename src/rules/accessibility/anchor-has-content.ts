/**
 * Rule: anchor-has-content
 * Flags empty <a> elements (no text content or aria-label).
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { getJSXElementName, hasJSXAttribute } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'anchor-has-content',
    category: 'accessibility',
    severity: 'error',
    description: 'Anchor elements must have content.',
    docs: 'Anchor elements must have text content, an aria-label, or an aria-labelledby attribute for screen readers to understand the purpose of the link.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXElement](node: any) {
        const opening = node.openingElement;
        if (!opening) return;

        const name = getJSXElementName(opening);
        if (name !== 'a') return;

        // Check for aria-label or aria-labelledby
        if (hasJSXAttribute(opening, 'aria-label') || hasJSXAttribute(opening, 'aria-labelledby')) {
          return;
        }

        // Check for children
        const children = node.children;
        if (!children || children.length === 0) {
          context.report({
            message: '<a> element has no content. Screen readers cannot determine its purpose.',
            line: opening.loc?.start.line ?? 0,
            column: opening.loc?.start.column ?? 0,
            suggestion: 'Add text content, an aria-label, or an aria-labelledby attribute.',
          });
          return;
        }

        // Check if all children are whitespace-only text
        const hasContent = children.some((child: any) => {
          if (child.type === AST_NODE_TYPES.JSXText) {
            return child.value?.trim().length > 0;
          }
          // Any non-text child (element, expression) counts as content
          return child.type !== AST_NODE_TYPES.JSXText;
        });

        if (!hasContent) {
          context.report({
            message: '<a> element has only whitespace content. Screen readers cannot determine its purpose.',
            line: opening.loc?.start.line ?? 0,
            column: opening.loc?.start.column ?? 0,
            suggestion: 'Add meaningful text content or an aria-label attribute.',
          });
        }
      },
    };
  },
};

export default rule;
