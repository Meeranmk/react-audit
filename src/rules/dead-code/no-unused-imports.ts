/**
 * Rule: no-unused-imports
 * Flags imported modules/symbols that are never referenced in the file.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { walkAST } from '../../utils/ast-helpers';

const rule: RuleModule = {
  meta: {
    name: 'no-unused-imports',
    category: 'dead-code',
    severity: 'warning',
    description: 'Remove unused imports.',
    docs: 'Unused imports increase bundle size and clutter the code. Remove them to keep the codebase clean.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.Program](node: any) {
        // Collect all import specifiers
        const imports: Array<{
          name: string;
          localName: string;
          line: number;
          column: number;
          source: string;
        }> = [];

        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) continue;

          for (const spec of stmt.specifiers) {
            if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
              imports.push({
                name: spec.local.name,
                localName: spec.local.name,
                line: spec.loc?.start.line ?? 0,
                column: spec.loc?.start.column ?? 0,
                source: stmt.source.value as string,
              });
            } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
              imports.push({
                name: spec.imported?.type === AST_NODE_TYPES.Identifier
                  ? spec.imported.name
                  : spec.local.name,
                localName: spec.local.name,
                line: spec.loc?.start.line ?? 0,
                column: spec.loc?.start.column ?? 0,
                source: stmt.source.value as string,
              });
            } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
              imports.push({
                name: spec.local.name,
                localName: spec.local.name,
                line: spec.loc?.start.line ?? 0,
                column: spec.loc?.start.column ?? 0,
                source: stmt.source.value as string,
              });
            }
          }
        }

        if (imports.length === 0) return;

        // Collect all identifier usages (excluding import declarations)
        const usedIdentifiers = new Set<string>();

        for (const stmt of node.body) {
          if (stmt.type === AST_NODE_TYPES.ImportDeclaration) continue;

          walkAST(stmt, {
            [AST_NODE_TYPES.Identifier](idNode: any) {
              usedIdentifiers.add(idNode.name);
            },
            [AST_NODE_TYPES.JSXIdentifier](idNode: any) {
              usedIdentifiers.add(idNode.name);
            },
          });
        }

        // Report unused imports
        for (const imp of imports) {
          // Skip React — it may be needed for JSX transform in older React
          if (imp.localName === 'React') continue;

          if (!usedIdentifiers.has(imp.localName)) {
            context.report({
              message: `"${imp.localName}" is imported from "${imp.source}" but never used.`,
              line: imp.line,
              column: imp.column,
              suggestion: `Remove the unused import: import { ${imp.localName} } from '${imp.source}'`,
            });
          }
        }
      },
    };
  },
};

export default rule;
