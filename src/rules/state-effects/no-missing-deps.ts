/**
 * Rule: no-missing-deps
 * Flags useEffect/useCallback/useMemo calls where variables used inside
 * the callback are not listed in the dependency array.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';
import { isHookCall } from '../../utils/ast-helpers';

const HOOKS_WITH_DEPS = ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'];

const rule: RuleModule = {
  meta: {
    name: 'no-missing-deps',
    category: 'state-effects',
    severity: 'error',
    description: 'Ensure all dependencies are listed in hook dependency arrays.',
    docs: 'Missing dependencies in useEffect, useCallback, or useMemo can cause stale closures and bugs. Always include all variables from the component scope that are used inside the hook callback.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.CallExpression](node: any) {
        for (const hookName of HOOKS_WITH_DEPS) {
          if (!isHookCall(node, hookName)) continue;

          const args = node.arguments;
          if (!args || args.length < 1) continue;

          // The callback is the first argument
          const callback = args[0];
          if (
            callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
            callback.type !== AST_NODE_TYPES.FunctionExpression
          ) {
            continue;
          }

          // The dependency array is the second argument (for useEffect/useLayoutEffect)
          // or the second argument (for useCallback/useMemo)
          const depsArg = args[1];

          // If no deps array at all for useEffect, that's a common mistake
          if (!depsArg && (hookName === 'useEffect' || hookName === 'useLayoutEffect')) {
            context.report({
              message: `${hookName} is missing a dependency array. This will run on every render.`,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              suggestion: `Add a dependency array: ${hookName}(() => { ... }, [deps])`,
            });
            continue;
          }

          // If deps is an empty array but callback references external variables
          if (depsArg?.type === AST_NODE_TYPES.ArrayExpression) {
            const depsElements = depsArg.elements;
            const depNames = new Set<string>();
            for (const el of depsElements) {
              if (el?.type === AST_NODE_TYPES.Identifier) {
                depNames.add(el.name);
              }
            }

            // Collect identifiers used in the callback body
            const usedIdentifiers = collectIdentifiers(callback.body);
            // Filter to only those not in deps and not function params
            const paramNames = new Set<string>();
            for (const p of callback.params) {
              if (p.type === AST_NODE_TYPES.Identifier) {
                paramNames.add(p.name);
              }
            }

            // Simple heuristic: check for common state/prop variable names used but not in deps
            const builtins = new Set(['console', 'window', 'document', 'Math', 'JSON', 'Date',
              'Promise', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
              'fetch', 'alert', 'confirm', 'parseInt', 'parseFloat', 'undefined', 'null',
              'true', 'false', 'NaN', 'Infinity', 'Error', 'Array', 'Object', 'String',
              'Number', 'Boolean', 'Map', 'Set', 'RegExp', 'Symbol', 'navigator',
              'location', 'history', 'localStorage', 'sessionStorage', 'require', 'module',
              'exports', 'process', 'Buffer', '__dirname', '__filename', 'React',
              'event', 'e', 'err', 'error', 'resolve', 'reject', 'callback', 'cb',
            ]);

            // This is a simplified check — a full implementation would use scope analysis
            // We flag when deps array is empty but there are used identifiers
            if (depsElements.length === 0 && usedIdentifiers.size > 0) {
              const suspiciousVars = [...usedIdentifiers].filter(
                (name) => !builtins.has(name) && !paramNames.has(name)
              );
              if (suspiciousVars.length > 0 && suspiciousVars.length <= 5) {
                context.report({
                  message: `${hookName} has an empty dependency array but references: ${suspiciousVars.join(', ')}. These may be missing from deps.`,
                  line: depsArg.loc?.start.line ?? 0,
                  column: depsArg.loc?.start.column ?? 0,
                  suggestion: `Consider adding [${suspiciousVars.join(', ')}] to the dependency array.`,
                });
              }
            }
          }
        }
      },
    };
  },
};

function collectIdentifiers(node: any): Set<string> {
  const identifiers = new Set<string>();
  if (!node || typeof node !== 'object') return identifiers;

  if (node.type === AST_NODE_TYPES.Identifier) {
    identifiers.add(node.name);
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          for (const id of collectIdentifiers(item)) {
            identifiers.add(id);
          }
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      for (const id of collectIdentifiers(child)) {
        identifiers.add(id);
      }
    }
  }

  return identifiers;
}

export default rule;
