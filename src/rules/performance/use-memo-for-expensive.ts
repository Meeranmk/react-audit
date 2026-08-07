/**
 * Rule: use-memo-for-expensive
 * Suggests useMemo for expensive computations (e.g. .filter().map(), .sort(), .reduce())
 * performed inline in component render bodies.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isReactComponent, walkAST } from '../../utils/ast-helpers';

const EXPENSIVE_METHODS = ['filter', 'sort', 'reduce', 'flatMap', 'find'];

const rule: RuleModule = {
  meta: {
    name: 'use-memo-for-expensive',
    category: 'performance',
    severity: 'info',
    description: 'Wrap expensive computations in useMemo.',
    docs: 'Array methods like .filter(), .sort(), and .reduce() can be expensive on large datasets. Wrapping them in useMemo prevents unnecessary recalculations on every render.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.FunctionDeclaration](node: any) {
        if (!isReactComponent(node)) return;
        checkFunctionBody(node.body, context);
      },
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        if (!isReactComponent(node)) return;
        const init = node.init;
        if (
          init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          init?.type === AST_NODE_TYPES.FunctionExpression
        ) {
          checkFunctionBody(init.body, context);
        }
      },
    };
  },
};

function checkFunctionBody(body: any, context: any): void {
  if (!body) return;

  walkAST(body, {
    [AST_NODE_TYPES.CallExpression](node: any) {
      // Check for chained method calls like arr.filter().map()
      if (isChainedExpensiveCall(node)) {
        context.report({
          message: 'Expensive computation in component body — consider wrapping in useMemo.',
          line: node.loc?.start.line ?? 0,
          column: node.loc?.start.column ?? 0,
          suggestion: 'const result = useMemo(() => expensiveComputation, [dependencies])',
        });
      }
    },
  });
}

function isChainedExpensiveCall(node: any): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;

  const callee = node.callee;
  if (callee?.type !== AST_NODE_TYPES.MemberExpression) return false;

  const methodName = callee.property?.name;
  if (!EXPENSIVE_METHODS.includes(methodName)) return false;

  // Check if it's chained (the object is also a call expression with an array method)
  const obj = callee.object;
  if (obj?.type === AST_NODE_TYPES.CallExpression) {
    const innerCallee = obj.callee;
    if (innerCallee?.type === AST_NODE_TYPES.MemberExpression) {
      const innerMethod = innerCallee.property?.name;
      if (
        EXPENSIVE_METHODS.includes(innerMethod) ||
        innerMethod === 'map' ||
        innerMethod === 'concat'
      ) {
        return true;
      }
    }
  }

  return false;
}

export default rule;
