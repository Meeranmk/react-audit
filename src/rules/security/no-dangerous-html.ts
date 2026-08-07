/**
 * Rule: no-dangerous-html
 * Flags dangerouslySetInnerHTML usage.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-dangerous-html',
    category: 'security',
    severity: 'error',
    description: 'Avoid using dangerouslySetInnerHTML.',
    docs: 'dangerouslySetInnerHTML bypasses React\'s XSS protection and can expose your app to cross-site scripting attacks if the HTML content is not properly sanitized.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.JSXAttribute](node: any) {
        if (
          node.name?.type === AST_NODE_TYPES.JSXIdentifier &&
          node.name.name === 'dangerouslySetInnerHTML'
        ) {
          context.report({
            message: 'Using dangerouslySetInnerHTML exposes the app to XSS attacks.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Use a sanitization library like DOMPurify before setting inner HTML, or use React\'s built-in JSX escaping.',
          });
        }
      },
    };
  },
};

export default rule;
