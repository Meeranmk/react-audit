/**
 * Rule: no-target-blank
 * Flags target="_blank" without rel="noopener noreferrer".
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { getJSXAttributes, getJSXElementName, getJSXAttributeValue } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-target-blank',
    category: 'security',
    severity: 'warning',
    description: 'Add rel="noopener noreferrer" when using target="_blank".',
    docs: 'Links with target="_blank" without rel="noopener noreferrer" can expose your app to tab-nabbing attacks where the opened page can access window.opener.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXOpeningElement](node: any) {
        const elemName = getJSXElementName(node);
        if (elemName !== 'a') return;

        const attrs = getJSXAttributes(node);

        // Check for target="_blank"
        const targetAttr = attrs.find(
          (a) =>
            a.name?.type === AST_NODE_TYPES.JSXIdentifier &&
            a.name.name === 'target'
        );

        if (!targetAttr) return;

        const targetValue = getJSXAttributeValue(targetAttr);
        if (targetValue !== '_blank') return;

        // Check for rel attribute
        const relAttr = attrs.find(
          (a) =>
            a.name?.type === AST_NODE_TYPES.JSXIdentifier &&
            a.name.name === 'rel'
        );

        if (!relAttr) {
          context.report({
            message: 'target="_blank" without rel="noopener noreferrer" is a security risk.',
            line: targetAttr.loc?.start.line ?? 0,
            column: targetAttr.loc?.start.column ?? 0,
            suggestion: 'Add rel="noopener noreferrer" to the anchor element.',
          });
          return;
        }

        const relValue = getJSXAttributeValue(relAttr);
        if (relValue && !relValue.includes('noopener')) {
          context.report({
            message: 'target="_blank" requires rel to include "noopener".',
            line: relAttr.loc?.start.line ?? 0,
            column: relAttr.loc?.start.column ?? 0,
            suggestion: 'Add "noopener" to the rel attribute.',
          });
        }
      },
    };
  },
};

export default rule;
