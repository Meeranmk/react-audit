/**
 * Rule: no-unnecessary-rerenders
 * Detects components that forward many props but aren't wrapped in React.memo.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { containsJSX, walkAST } from '../../utils/ast-helpers';

const PROPS_THRESHOLD = 3;

const rule: RuleModule = {
  meta: {
    name: 'no-unnecessary-rerenders',
    category: 'performance',
    severity: 'info',
    description: 'Consider React.memo for components receiving many props.',
    docs: 'Components that receive several props and render child components may benefit from being wrapped in React.memo to prevent unnecessary re-renders when parent state changes but props remain the same.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.ExportDefaultDeclaration](node: any) {
        checkExport(node.declaration, context);
      },
      [AST_NODE_TYPES.ExportNamedDeclaration](node: any) {
        if (node.declaration) {
          checkExport(node.declaration, context);
        }
      },
    };
  },
};

function checkExport(declaration: any, context: any): void {
  if (!declaration) return;

  // Check function declarations
  if (
    declaration.type === AST_NODE_TYPES.FunctionDeclaration &&
    declaration.id &&
    /^[A-Z]/.test(declaration.id.name)
  ) {
    const params = declaration.params;
    if (params.length > 0 && containsJSX(declaration)) {
      const firstParam = params[0];
      if (firstParam.type === AST_NODE_TYPES.ObjectPattern) {
        const propsCount = firstParam.properties.length;
        if (propsCount >= PROPS_THRESHOLD) {
          // Check the file for React.memo wrapping
          const sourceCode = context.sourceCode;
          if (!sourceCode.includes('React.memo') && !sourceCode.includes('memo(')) {
            context.report({
              message: `Component "${declaration.id.name}" receives ${propsCount} props but isn't wrapped in React.memo.`,
              line: declaration.loc?.start.line ?? 0,
              column: declaration.loc?.start.column ?? 0,
              suggestion: `export default React.memo(${declaration.id.name})`,
            });
          }
        }
      }
    }
  }
}

export default rule;
