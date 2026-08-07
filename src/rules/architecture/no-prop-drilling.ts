/**
 * Rule: no-prop-drilling
 * Flags components that pass the same prop through multiple levels.
 * Heuristic: a prop destructured from params and immediately passed to a child with the same name.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isReactComponent, walkAST, getJSXAttributes } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-prop-drilling',
    category: 'architecture',
    severity: 'info',
    description: 'Avoid passing props through multiple component levels.',
    docs: 'Props drilling (passing props through components that don\'t use them) makes code harder to maintain. Use React Context, composition, or state management libraries instead.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.FunctionDeclaration](node: any) {
        if (!isReactComponent(node)) return;
        checkPropDrilling(node, context);
      },
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        if (!isReactComponent(node)) return;
        const init = node.init;
        if (
          init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          init?.type === AST_NODE_TYPES.FunctionExpression
        ) {
          checkPropDrilling(init, context, node.id?.name);
        }
      },
    };
  },
};

function checkPropDrilling(funcNode: any, context: any, name?: string): void {
  const params = funcNode.params;
  if (!params || params.length === 0) return;

  const firstParam = params[0];
  if (firstParam.type !== AST_NODE_TYPES.ObjectPattern) return;

  // Collect destructured prop names
  const propNames = new Set<string>();
  for (const prop of firstParam.properties) {
    if (
      prop.type === AST_NODE_TYPES.Property &&
      prop.key?.type === AST_NODE_TYPES.Identifier
    ) {
      propNames.add(prop.key.name);
    }
  }

  if (propNames.size === 0) return;

  // Find props that are directly passed to child components with the same name
  const drilledProps = new Set<string>();
  const body = funcNode.body;

  walkAST(body, {
    [AST_NODE_TYPES.JSXOpeningElement](jsxNode: any) {
      // Only check custom components (uppercase)
      const elemName = jsxNode.name;
      if (
        !elemName ||
        elemName.type !== AST_NODE_TYPES.JSXIdentifier ||
        !/^[A-Z]/.test(elemName.name)
      ) {
        return;
      }

      const attrs = getJSXAttributes(jsxNode);
      for (const attr of attrs) {
        const attrName = attr.name?.type === AST_NODE_TYPES.JSXIdentifier
          ? attr.name.name
          : null;

        if (!attrName || !propNames.has(attrName)) continue;

        // Check if the value is just the same identifier
        if (
          attr.value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
          attr.value.expression?.type === AST_NODE_TYPES.Identifier &&
          attr.value.expression.name === attrName
        ) {
          drilledProps.add(attrName);
        }
      }
    },
  });

  // Only report if 3+ props are drilled
  if (drilledProps.size >= 3) {
    const componentName = name || funcNode.id?.name || 'Component';
    context.report({
      message: `"${componentName}" is drilling ${drilledProps.size} props: ${[...drilledProps].join(', ')}. Consider using Context.`,
      line: firstParam.loc?.start.line ?? 0,
      column: firstParam.loc?.start.column ?? 0,
      suggestion: 'Use React Context or a state management library to avoid drilling props through intermediate components.',
    });
  }
}

export default rule;
