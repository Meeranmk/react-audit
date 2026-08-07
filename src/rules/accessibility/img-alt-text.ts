/**
 * Rule: img-alt-text
 * Flags <img> elements without alt attributes.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { getJSXElementName, hasJSXAttribute } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'img-alt-text',
    category: 'accessibility',
    severity: 'error',
    description: 'Images must have alt text.',
    docs: 'Every <img> element must have an alt attribute for screen readers and when images fail to load. Use alt="" for decorative images.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXOpeningElement](node: any) {
        const name = getJSXElementName(node);
        if (name !== 'img') return;

        if (!hasJSXAttribute(node, 'alt')) {
          context.report({
            message: '<img> element is missing an "alt" attribute.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Add an alt attribute describing the image, or alt="" for decorative images.',
          });
        }
      },
    };
  },
};

export default rule;
