/**
 * Rule: no-unused-variables
 * Flags declared but unused variables within function/component scope.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { walkAST } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-unused-variables',
    category: 'dead-code',
    severity: 'warning',
    description: 'Remove unused variables.',
    docs: 'Unused variables add noise to the code. Remove them or prefix with an underscore to indicate intentional disuse.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.Program](node: any) {
        // For each function/arrow scope, collect declared vars and check usage
        // Simplified: check top-level const/let declarations that aren't used
        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.VariableDeclaration) continue;
          // Skip exports
          if (stmt.parent?.type === AST_NODE_TYPES.ExportNamedDeclaration) continue;

          for (const declarator of stmt.declarations) {
            if (declarator.id?.type !== AST_NODE_TYPES.Identifier) continue;

            const varName = declarator.id.name;

            // Skip underscore-prefixed (intentionally unused)
            if (varName.startsWith('_')) continue;

            // Count usages in the rest of the program
            let usageCount = 0;
            for (const otherStmt of node.body) {
              if (otherStmt === stmt) continue;

              walkAST(otherStmt, {
                [AST_NODE_TYPES.Identifier](idNode: any) {
                  if (idNode.name === varName) {
                    usageCount++;
                  }
                },
                [AST_NODE_TYPES.JSXIdentifier](idNode: any) {
                  if (idNode.name === varName) {
                    usageCount++;
                  }
                },
              });
            }

            if (usageCount === 0) {
              context.report({
                message: `Variable "${varName}" is declared but never used.`,
                line: declarator.id.loc?.start.line ?? 0,
                column: declarator.id.loc?.start.column ?? 0,
                suggestion: `Remove the unused variable or prefix with underscore: _${varName}`,
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
