/**
 * Console reporter — beautiful terminal output for audit results.
 */

import pc from 'picocolors';
import { AuditResult, Diagnostic, CategorySummary } from '../types';

const SCORE_BAR_WIDTH = 30;

export function printReport(result: AuditResult, verbose: boolean = false): void {
  const { score, grade, diagnostics, categories, metadata } = result;

  console.log('');
  printHeader(metadata.projectName, metadata.framework);
  printScoreBar(score, grade);
  printMetadata(metadata);
  printCategoryBreakdown(categories);

  if (verbose && diagnostics.length > 0) {
    printDetailedIssues(diagnostics);
  } else if (diagnostics.length > 0) {
    printIssueSummary(diagnostics);
  }

  printFooter(diagnostics, score);
  console.log('');
}

function printHeader(projectName: string, framework: string): void {
  console.log(pc.bold('  ╔══════════════════════════════════════════════════╗'));
  console.log(pc.bold(`  ║  💻  ${pc.cyan('react-code-audit')}  ${pc.dim(`· ${projectName}`)}${' '.repeat(Math.max(0, 25 - projectName.length - framework.length))}${pc.dim(framework)}  ║`));
  console.log(pc.bold('  ╚══════════════════════════════════════════════════╝'));
  console.log('');
}

function printScoreBar(score: number, grade: string): void {
  const filled = Math.round((score / 100) * SCORE_BAR_WIDTH);
  const empty = SCORE_BAR_WIDTH - filled;

  let scoreColor: (str: string) => string;
  let gradeEmoji: string;

  if (score >= 75) {
    scoreColor = pc.green;
    gradeEmoji = '✅';
  } else if (score >= 50) {
    scoreColor = pc.yellow;
    gradeEmoji = '⚠️';
  } else {
    scoreColor = pc.red;
    gradeEmoji = '🔴';
  }

  const bar = scoreColor('█'.repeat(filled)) + pc.gray('░'.repeat(empty));
  const scoreText = pc.bold(scoreColor(`${score}`));
  const gradeText = pc.bold(scoreColor(grade));

  console.log(`  Health Score: ${bar} ${scoreText}/100  ${gradeEmoji} ${gradeText}`);
  console.log('');
}

function printMetadata(metadata: any): void {
  console.log(pc.dim(`  📁 ${metadata.filesScanned} files scanned · ${metadata.totalLines.toLocaleString()} lines · ${metadata.scanDuration}ms`));
  console.log('');
}

function printCategoryBreakdown(categories: CategorySummary[]): void {
  console.log(pc.bold('  Category Breakdown'));
  console.log(pc.dim('  ─────────────────────────────────────────────'));

  for (const cat of categories) {
    const icon = getCategoryIcon(cat.category);
    const label = cat.label.padEnd(18);

    if (cat.total === 0) {
      console.log(`  ${icon} ${pc.dim(label)} ${pc.green('✓ No issues')}`);
    } else {
      const parts: string[] = [];
      if (cat.errors > 0) parts.push(pc.red(`${cat.errors} errors`));
      if (cat.warnings > 0) parts.push(pc.yellow(`${cat.warnings} warnings`));
      if (cat.infos > 0) parts.push(pc.blue(`${cat.infos} info`));
      console.log(`  ${icon} ${label} ${parts.join(pc.dim(' · '))}`);
    }
  }

  console.log('');
}

function printIssueSummary(diagnostics: Diagnostic[]): void {
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const infos = diagnostics.filter((d) => d.severity === 'info');

  // Show top 5 most impactful issues
  console.log(pc.bold('  Top Issues'));
  console.log(pc.dim('  ─────────────────────────────────────────────'));

  const topIssues = [...errors, ...warnings, ...infos].slice(0, 8);
  for (const issue of topIssues) {
    const icon = getSeverityIcon(issue.severity);
    const file = pc.dim(`${issue.file}:${issue.line}`);
    console.log(`  ${icon} ${issue.message}`);
    console.log(`    ${file}`);
  }

  const remaining = diagnostics.length - topIssues.length;
  if (remaining > 0) {
    console.log(pc.dim(`  ... and ${remaining} more issues. Use --verbose to see all.`));
  }
  console.log('');
}

function printDetailedIssues(diagnostics: Diagnostic[]): void {
  // Group by file
  const byFile = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const existing = byFile.get(d.file) || [];
    existing.push(d);
    byFile.set(d.file, existing);
  }

  console.log(pc.bold('  Detailed Issues'));
  console.log(pc.dim('  ─────────────────────────────────────────────'));

  for (const [file, issues] of byFile) {
    console.log(`  ${pc.underline(pc.cyan(file))}`);

    for (const issue of issues.sort((a, b) => a.line - b.line)) {
      const icon = getSeverityIcon(issue.severity);
      const lineCol = pc.dim(`L${issue.line}:${issue.column}`);
      const ruleName = pc.dim(`(${issue.rule})`);
      console.log(`    ${icon} ${lineCol}  ${issue.message} ${ruleName}`);
      if (issue.suggestion) {
        console.log(`      ${pc.dim('→')} ${pc.italic(pc.dim(issue.suggestion))}`);
      }
    }
    console.log('');
  }
}

function printFooter(diagnostics: Diagnostic[], score: number): void {
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  const infos = diagnostics.filter((d) => d.severity === 'info').length;

  console.log(pc.dim('  ─────────────────────────────────────────────'));

  if (diagnostics.length === 0) {
    console.log(pc.bold(pc.green('  🎉 No issues found! Your codebase is clean.')));
  } else {
    const parts: string[] = [];
    if (errors > 0) parts.push(pc.bold(pc.red(`${errors} errors`)));
    if (warnings > 0) parts.push(pc.bold(pc.yellow(`${warnings} warnings`)));
    if (infos > 0) parts.push(pc.bold(pc.blue(`${infos} info`)));
    console.log(`  Found: ${parts.join(pc.dim(' · '))}`);
  }

  if (score < 75) {
    console.log(pc.dim(`  Run ${pc.cyan('react-code-audit --verbose')} for detailed fixes.`));
  }
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'performance': '⚡',
    'state-effects': '🔄',
    'architecture': '🏗️',
    'security': '🔒',
    'accessibility': '♿',
    'dead-code': '🗑️',
  };
  return icons[category] || '📋';
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return pc.red('✖');
    case 'warning':
      return pc.yellow('⚠');
    case 'info':
      return pc.blue('ℹ');
    default:
      return pc.dim('·');
  }
}

