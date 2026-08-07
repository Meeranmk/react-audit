/**
 * Rule runner — executes rule visitors against a parsed AST.
 */

import { TSESTree } from '@typescript-eslint/typescript-estree';
import { RuleModule, RuleContext, Diagnostic, AuditConfig, Severity } from '../types';
import { walkAST } from '../utils/ast-helpers';

export function runRules(
  ast: TSESTree.Program,
  filePath: string,
  sourceCode: string,
  rules: RuleModule[],
  config: AuditConfig
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    // Check if rule is disabled in config
    const ruleConfig = config.rules?.[rule.meta.name];
    if (ruleConfig === 'off') continue;

    // Determine effective severity (config override or default)
    // ruleConfig is narrowed to Severity | undefined after the 'off' check above
    const severity: Severity = (ruleConfig as Severity | undefined) || rule.meta.severity;

    const context: RuleContext = {
      filePath,
      sourceCode,
      report(partial) {
        diagnostics.push({
          rule: rule.meta.name,
          category: rule.meta.category,
          severity,
          message: partial.message,
          file: filePath,
          line: partial.line,
          column: partial.column,
          suggestion: partial.suggestion,
        });
      },
    };

    try {
      const visitor = rule.create(context);
      walkAST(ast, visitor);
    } catch {
      // Rule failed — silently skip to avoid crashing the entire scan
    }
  }

  return diagnostics;
}
