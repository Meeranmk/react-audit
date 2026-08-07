/**
 * Rule: no-barrel-import
 * Flags imports from barrel index files that can hurt tree-shaking.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

const rule: RuleModule = {
  meta: {
    name: 'no-barrel-import',
    category: 'architecture',
    severity: 'info',
    description: 'Avoid importing from barrel (index) files.',
    docs: 'Barrel files (index.ts/index.js) that re-export many modules can prevent effective tree-shaking and increase bundle size. Import directly from the source module instead.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.ImportDeclaration](node: any) {
        const source = node.source?.value;
        if (typeof source !== 'string') return;

        // Check for relative imports ending with /index or just a directory
        if (
          source.endsWith('/index') ||
          source.endsWith('/index.ts') ||
          source.endsWith('/index.js') ||
          source.endsWith('/index.tsx') ||
          source.endsWith('/index.jsx')
        ) {
          context.report({
            message: `Importing from barrel file "${source}". This may hurt tree-shaking.`,
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            suggestion: 'Import directly from the specific module file instead of the barrel index.',
          });
          return;
        }

        // Check for relative imports that are just a directory (resolved to index)
        // e.g., import { Foo } from './components' → likely resolves to ./components/index
        if (
          source.startsWith('./') || source.startsWith('../')
        ) {
          // Only flag if it has named imports (star imports are different)
          if (
            node.specifiers?.length > 3 &&
            !source.includes('.') // no file extension = likely a directory
          ) {
            // Heuristic: importing many named exports from a path without extension
            // suggests a barrel file
            const names = node.specifiers.flatMap((s: any) =>
              s.type === AST_NODE_TYPES.ImportSpecifier && s.imported?.name
                ? [s.imported.name as string]
                : []
            );

            if (names.length > 3) {
              context.report({
                message: `Importing ${names.length} exports from "${source}" — this may be a barrel file.`,
                line: node.loc?.start.line ?? 0,
                column: node.loc?.start.column ?? 0,
                suggestion: 'Consider importing directly from individual module files.',
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
