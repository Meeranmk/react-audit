/**
 * Rule: max-props
 * Flags components with too many props (sign of doing too much).
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isReactComponent } from '../../utils/ast-helpers';

const MAX_PROPS = 7;

const rule: RuleModule = {
  meta: {
    name: 'max-props',
    category: 'architecture',
    severity: 'warning',
    description: `Component should not accept more than ${MAX_PROPS} props.`,
    docs: `Components with many props tend to be hard to use and maintain. Consider grouping related props into objects, using composition, or splitting the component.`,
  },
  create(context) {
    return {
      [AST_NODE_TYPES.FunctionDeclaration](node: any) {
        if (!isReactComponent(node)) return;
        checkPropsCount(node, context);
      },
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        if (!isReactComponent(node)) return;
        const init = node.init;
        if (
          init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          init?.type === AST_NODE_TYPES.FunctionExpression
        ) {
          checkPropsCount(init, context, node.id?.name);
        }
      },
    };
  },
};

function checkPropsCount(funcNode: any, context: any, name?: string): void {
  const params = funcNode.params;
  if (!params || params.length === 0) return;

  const firstParam = params[0];
  if (firstParam.type === AST_NODE_TYPES.ObjectPattern) {
    const propsCount = firstParam.properties.length;
    if (propsCount > MAX_PROPS) {
      const componentName = name || funcNode.id?.name || 'Component';
      context.report({
        message: `"${componentName}" accepts ${propsCount} props (max: ${MAX_PROPS}).`,
        line: firstParam.loc?.start.line ?? 0,
        column: firstParam.loc?.start.column ?? 0,
        suggestion: 'Group related props into an object, use composition, or split the component.',
      });
    }
  }
}

export default rule;
