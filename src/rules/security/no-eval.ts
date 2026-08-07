/**
 * Rule: no-eval
 * Flags eval() and new Function() usage.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-eval',
    category: 'security',
    severity: 'error',
    description: 'Avoid using eval() and new Function().',
    docs: 'eval() and new Function() execute arbitrary code strings and can lead to code injection vulnerabilities. They also prevent JavaScript engine optimizations.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.CallExpression](node: any) {
        // Check for eval()
        if (
          node.callee?.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'eval'
        ) {
          context.report({
            message: 'eval() executes arbitrary code and is a security risk.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Use JSON.parse() for JSON data, or refactor to avoid dynamic code execution.',
          });
        }

        // Check for window.eval()
        if (
          node.callee?.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object?.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'window' &&
          node.callee.property?.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'eval'
        ) {
          context.report({
            message: 'window.eval() executes arbitrary code and is a security risk.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Refactor to avoid dynamic code execution.',
          });
        }
      },
      [AST_NODE_TYPES.NewExpression](node: any) {
        // Check for new Function()
        if (
          node.callee?.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Function'
        ) {
          context.report({
            message: 'new Function() creates functions from strings and is a security risk.',
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Use regular function definitions instead of dynamically creating functions.',
          });
        }
      },
    };
  },
};

export default rule;
