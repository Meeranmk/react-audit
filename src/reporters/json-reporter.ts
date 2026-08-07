/**
 * JSON reporter — machine-readable output for CI/CD and tool integrations.
 */

import { AuditResult } from '../types';

export function printJsonReport(result: AuditResult): void {
  const output = {
    score: result.score,
    grade: result.grade,
    metadata: result.metadata,
    categories: result.categories.map((cat) => ({
      category: cat.category,
      label: cat.label,
      errors: cat.errors,
      warnings: cat.warnings,
      infos: cat.infos,
      total: cat.total,
    })),
    diagnostics: result.diagnostics.map((d) => ({
      rule: d.rule,
      category: d.category,
      severity: d.severity,
      message: d.message,
      file: d.file,
      line: d.line,
      column: d.column,
      suggestion: d.suggestion || null,
    })),
    summary: {
      totalIssues: result.diagnostics.length,
      errors: result.diagnostics.filter((d) => d.severity === 'error').length,
      warnings: result.diagnostics.filter((d) => d.severity === 'warning').length,
      infos: result.diagnostics.filter((d) => d.severity === 'info').length,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}
