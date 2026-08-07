/**
 * Prompt generator — builds an AI-agent fix prompt from audit diagnostics.
 *
 * Mirrors the React Doctor "Copy prompt to clipboard" feature exactly:
 * findings are grouped by rule (one rule = one fix group), ranked by
 * severity + count, and formatted as a numbered task list with docs links,
 * file locations, and full agent instructions.
 */

import { AuditResult, Diagnostic, CATEGORY_LABELS } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FixGroup {
  rule: string;
  category: string;
  categoryLabel: string;
  severity: string;
  description: string;
  suggestion: string | undefined;
  sites: Array<{ file: string; line: number }>;
  count: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a structured AI fix prompt from an audit result.
 *
 * @param result    The full AuditResult from a scan
 * @param topN      How many fix groups to include (default: 3, pass Infinity for all)
 * @param projectName  Project name for the prompt header
 */
export function generateFixPrompt(
  result: AuditResult,
  topN: number = 3,
  projectName?: string
): string {
  const groups = groupByRule(result.diagnostics);
  const ranked = rankGroups(groups);
  const selected = topN === Infinity ? ranked : ranked.slice(0, topN);

  if (selected.length === 0) {
    return '🎉 No issues found — nothing to fix!';
  }

  const name = projectName ?? result.metadata.projectName;
  const remainingCount = ranked.length - selected.length;

  return buildPrompt(selected, name, remainingCount);
}

/**
 * Get ranked fix groups without generating the full prompt string.
 * Useful for the "pick specific issues" menu.
 */
export function getRankedGroups(result: AuditResult): FixGroup[] {
  return rankGroups(groupByRule(result.diagnostics));
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByRule(diagnostics: Diagnostic[]): Map<string, FixGroup> {
  const groups = new Map<string, FixGroup>();

  for (const d of diagnostics) {
    const existing = groups.get(d.rule);
    if (existing) {
      existing.sites.push({ file: d.file, line: d.line });
      existing.count++;
    } else {
      groups.set(d.rule, {
        rule: d.rule,
        category: d.category,
        categoryLabel: CATEGORY_LABELS[d.category] ?? d.category,
        severity: d.severity,
        description: d.message,
        suggestion: d.suggestion,
        sites: [{ file: d.file, line: d.line }],
        count: 1,
      });
    }
  }

  return groups;
}

function rankGroups(groups: Map<string, FixGroup>): FixGroup[] {
  const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };

  return Array.from(groups.values()).sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sevDiff !== 0) return sevDiff;
    return b.count - a.count;
  });
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  groups: FixGroup[],
  projectName: string,
  remainingCount: number
): string {
  const lines: string[] = [];
  const n = groups.length;
  const followUpNote = remainingCount > 0 ? ` Leave the rest for a follow-up.` : '';

  lines.push(
    `Review and fix the top ${n} react-audit finding${n !== 1 ? 's' : ''} in ${projectName}.` +
    followUpNote
  );
  lines.push('');

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const severityLabel =
      g.severity === 'error' ? 'ERROR' : g.severity === 'warning' ? 'WARN' : 'INFO';
    const countNote = g.count > 1 ? ` (×${g.count})` : '';
    const docsUrl = buildRuleDocsUrl(g.rule);

    lines.push(`${i + 1}. ${severityLabel} ${g.categoryLabel}: ${g.description}${countNote}`);
    if (g.suggestion) {
      lines.push(`   ${g.suggestion}`);
    }
    lines.push(`   Docs: ${docsUrl}`);
    for (const site of g.sites) {
      lines.push(`   - ${site.file}:${site.line}`);
    }
    if (i < groups.length - 1) lines.push('');
  }

  lines.push('');
  lines.push("Read each file and fix the root cause — don't suppress or silence the rule.");
  lines.push('');
  lines.push(
    'Findings that share the same rule name are one root cause — a single fix clears all of them, ' +
    'so treat each rule as ONE task, not one per site.'
  );
  lines.push('');
  lines.push(
    'Verify against the real thing, don\'t assume: confirm each change fixes the issue, ' +
    'then re-run `npx react-audit --verbose` and check the issue is actually gone before moving on.'
  );
  lines.push('');
  lines.push(
    'Teach me as you go: for every issue you touch, explain it in plain language (no jargon) — ' +
    "what the problem is, why it's a problem, and how serious it is in human terms. " +
    'Describe the real-world impact and severity concretely (e.g. "this crashes the page for users on Safari" vs. ' +
    '"this is a minor cleanup with no user impact") so I understand why it matters, not just what changed.'
  );
  lines.push('');

  if (remainingCount > 0) {
    lines.push(
      `Stop after this pass. Summarize the remaining ${remainingCount} finding${remainingCount !== 1 ? 's' : ''} for a follow-up.`
    );
  }

  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildRuleDocsUrl(ruleName: string): string {
  return `https://react-audit.dev/docs/rules/${ruleName}`;
}
