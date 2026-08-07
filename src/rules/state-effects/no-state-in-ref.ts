/**
 * Rule: no-state-in-ref
 * Flags storing render-relevant data in useRef instead of useState.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall, walkAST } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-state-in-ref',
    category: 'state-effects',
    severity: 'warning',
    description: 'Avoid storing render-relevant data in useRef.',
    docs: 'useRef does not trigger re-renders. If a ref value is used in JSX or affects the rendered output, it should be stored in useState instead.',
  },
  create(context) {
    const refNames = new Set<string>();

    return {
      [AST_NODE_TYPES.CallExpression](node: any) {
        if (!isHookCall(node, 'useRef')) return;

        // Find the variable declarator: const fooRef = useRef(...)
        // Since we don't have parent pointers, we use a pattern-match approach
        // by tracking ref names found in the file
      },
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        const init = node.init;
        if (!init) return;
        if (!isHookCall(init, 'useRef')) return;

        if (node.id?.type === AST_NODE_TYPES.Identifier) {
          refNames.add(node.id.name);
        }
      },
      // Check if ref.current is used in JSX expressions
      [AST_NODE_TYPES.JSXExpressionContainer](node: any) {
        checkRefInJSX(node.expression, refNames, context, node);
      },
    };
  },
};

function checkRefInJSX(expr: any, refNames: Set<string>, context: any, containerNode: any): void {
  if (!expr || typeof expr !== 'object') return;

  // Check for refName.current
  if (
    expr.type === AST_NODE_TYPES.MemberExpression &&
    expr.object?.type === AST_NODE_TYPES.Identifier &&
    refNames.has(expr.object.name) &&
    expr.property?.type === AST_NODE_TYPES.Identifier &&
    expr.property.name === 'current'
  ) {
    context.report({
      message: `"${expr.object.name}.current" is used in JSX. useRef won't trigger a re-render — use useState instead.`,
      line: expr.loc?.start.line ?? 0,
      column: expr.loc?.start.column ?? 0,
      suggestion: 'Replace useRef with useState for values that affect rendered output.',
    });
  }
}

export default rule;
