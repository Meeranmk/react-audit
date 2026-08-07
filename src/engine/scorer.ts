/**
 * Health score calculator.
 * Computes a 0–100 score from collected diagnostics.
 */

import { Diagnostic, AuditResult, CategorySummary, ProjectMetadata, RuleCategory, CATEGORY_LABELS } from '../types';

const PENALTY = {
  error: 3,
  warning: 1,
  info: 0.25,
} as const;

const GRADE_THRESHOLDS = {
  great: 75,
  needsWork: 50,
} as const;

export function computeScore(diagnostics: Diagnostic[]): number {
  let totalPenalty = 0;

  for (const d of diagnostics) {
    totalPenalty += PENALTY[d.severity];
  }

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  return Math.round(score * 10) / 10;
}

export function computeGrade(score: number): AuditResult['grade'] {
  if (score >= GRADE_THRESHOLDS.great) return 'Great';
  if (score >= GRADE_THRESHOLDS.needsWork) return 'Needs Work';
  return 'Critical';
}

export function computeCategorySummaries(
  diagnostics: Diagnostic[]
): CategorySummary[] {
  const categories: RuleCategory[] = [
    'performance',
    'state-effects',
    'architecture',
    'security',
    'accessibility',
    'dead-code',
  ];

  return categories.map((category) => {
    const catDiags = diagnostics.filter((d) => d.category === category);
    const errors = catDiags.filter((d) => d.severity === 'error').length;
    const warnings = catDiags.filter((d) => d.severity === 'warning').length;
    const infos = catDiags.filter((d) => d.severity === 'info').length;

    return {
      category,
      label: CATEGORY_LABELS[category],
      errors,
      warnings,
      infos,
      total: errors + warnings + infos,
    };
  });
}

export function buildAuditResult(
  diagnostics: Diagnostic[],
  metadata: ProjectMetadata
): AuditResult {
  const score = computeScore(diagnostics);
  return {
    score,
    grade: computeGrade(score),
    diagnostics,
    categories: computeCategorySummaries(diagnostics),
    metadata,
  };
}
