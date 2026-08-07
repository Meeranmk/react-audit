/**
 * Rule: one-component-per-file
 * Flags files that export multiple React components.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { containsJSX } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'one-component-per-file',
    category: 'architecture',
    severity: 'info',
    description: 'Keep one component per file.',
    docs: 'Having multiple React components in a single file makes them harder to find, test, and reuse. Extract each component into its own file.',
  },
  create(context) {
    const exportedComponents: Array<{ name: string; line: number; column: number }> = [];

    return {
      [AST_NODE_TYPES.ExportNamedDeclaration](node: any) {
        const decl = node.declaration;
        if (!decl) return;

        if (
          decl.type === AST_NODE_TYPES.FunctionDeclaration &&
          decl.id &&
          /^[A-Z]/.test(decl.id.name) &&
          containsJSX(decl)
        ) {
          exportedComponents.push({
            name: decl.id.name,
            line: decl.loc?.start.line ?? 0,
            column: decl.loc?.start.column ?? 0,
          });
        }

        if (decl.type === AST_NODE_TYPES.VariableDeclaration) {
          for (const declarator of decl.declarations) {
            if (
              declarator.id?.type === AST_NODE_TYPES.Identifier &&
              /^[A-Z]/.test(declarator.id.name) &&
              declarator.init &&
              (declarator.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                declarator.init.type === AST_NODE_TYPES.FunctionExpression) &&
              containsJSX(declarator.init)
            ) {
              exportedComponents.push({
                name: declarator.id.name,
                line: declarator.loc?.start.line ?? 0,
                column: declarator.loc?.start.column ?? 0,
              });
            }
          }
        }
      },
      // Check at program exit
      [AST_NODE_TYPES.Program](_node: any) {
        // We need to defer the check, but since walkAST visits Program first,
        // we'll use the fact that other nodes are visited during the walk.
        // Instead, we'll check in a post-processing manner by also looking
        // at export default declarations.
      },
      [AST_NODE_TYPES.ExportDefaultDeclaration](node: any) {
        const decl = node.declaration;
        if (!decl) return;

        if (
          decl.type === AST_NODE_TYPES.FunctionDeclaration &&
          decl.id &&
          /^[A-Z]/.test(decl.id.name) &&
          containsJSX(decl)
        ) {
          exportedComponents.push({
            name: decl.id.name,
            line: decl.loc?.start.line ?? 0,
            column: decl.loc?.start.column ?? 0,
          });
        }

        // After collecting, report if multiple
        if (exportedComponents.length > 1) {
          for (const comp of exportedComponents.slice(1)) {
            context.report({
              message: `Multiple exported components in one file. "${comp.name}" should be in its own file.`,
              line: comp.line,
              column: comp.column,
              suggestion: `Move "${comp.name}" to a separate file.`,
            });
          }
        }
      },
    };
  },
};

export default rule;
