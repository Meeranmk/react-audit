#!/usr/bin/env node

/**
 * react-code-audit CLI — Audit React codebases for quality issues.
 *
 * Usage:
 *   react-code-audit [path]              Scan a project directory
 *   react-code-audit --verbose           Show detailed diagnostics
 *   react-code-audit --json              Output as JSON
 *   react-code-audit rules list          List all available rules
 *   react-code-audit rules explain <name> Explain a specific rule
 */

import { Command } from 'commander';
import pc from 'picocolors';
import select from '@inquirer/select';
import { createSpinner } from './utils/spinner';
import { writeToClipboard } from './utils/clipboard';
import { openInBrowser } from './utils/open-browser';
import { scanProject } from './engine/scanner';
import { printReport } from './reporters/console-reporter';
import { printJsonReport } from './reporters/json-reporter';
import { writeHtmlReport } from './reporters/html-reporter';
import { generateFixPrompt, getRankedGroups, FixGroup } from './reporters/prompt-generator';
import { getRule, getRulesByCategory, getRuleCount } from './rules';
import { CATEGORY_LABELS, RuleCategory, AuditResult } from './types';

const VERSION = '1.0.2';

const program = new Command();

program
  .name('react-code-audit')
  .description('💻 Audit your React codebase for performance, security, architecture, state & effects, accessibility, and dead code issues.')
  .version(VERSION, '-v, --version', 'Display the version number')
  .argument('[path]', 'Path to the project directory', '.')
  .option('--verbose', 'Show detailed per-file diagnostics', false)
  .option('--json', 'Output results as JSON', false)
  .option('--html [path]', 'Generate an interactive HTML report (default: react-audit-report.html)')
  .action(async (projectPath: string, options: { verbose: boolean; json: boolean; html?: boolean | string }) => {
    if (!options.json && !options.html) {
      console.log('');
      console.log(pc.bold(pc.cyan('  💻 react-code-audit')) + pc.dim(` v${VERSION}`));
      console.log(pc.dim(`  Scanning ${projectPath === '.' ? 'current directory' : projectPath}...`));
      console.log('');
    }

    const spinner = (options.json || options.html) ? null : createSpinner('Analyzing React codebase...', '  ').start();

    try {
      const result = await scanProject(projectPath, { verbose: options.verbose, json: options.json });

      if (spinner) {
        spinner.succeed(pc.dim(`Scan complete · ${result.metadata.filesScanned} files analyzed in ${result.metadata.scanDuration}ms`));
      }

      if (options.html) {
        const outputPath = typeof options.html === 'string' ? options.html : 'react-audit-report.html';
        const absPath = writeHtmlReport(result, outputPath);
        console.log('');
        console.log(pc.bold(pc.cyan('  💻 react-code-audit')) + pc.dim(` v${VERSION}`));
        console.log('');
        console.log(pc.green(`  ✔ HTML report generated: ${pc.bold(absPath)}`));
        console.log(pc.dim('  Opening in your default browser...'));
        console.log('');
        openInBrowser(absPath);
      } else if (options.json) {
        printJsonReport(result);
      } else {
        printReport(result, options.verbose);
        // Show the interactive prompt menu when there are issues to fix
        if (result.diagnostics.length > 0) {
          await runPromptMenu(result);
        }
      }

      // Exit with code 1 if score is critical
      if (result.score < 50) {
        process.exit(1);
      }
    } catch (error: any) {
      if (spinner) {
        spinner.fail(pc.red('Scan failed'));
      }
      console.error(pc.red(`\n  Error: ${error.message || error}\n`));
      process.exit(1);
    }
  });

// ─── Interactive Prompt Menu ───────────────────────────────────────────────────

async function runPromptMenu(result: AuditResult): Promise<void> {
  const groups = getRankedGroups(result);
  const totalGroups = groups.length;

  console.log('');
  console.log(pc.dim('  ─────────────────────────────────────────────'));

  type MenuChoice =
    | 'top3'
    | 'all'
    | 'pick'
    | 'skip';

  const choices: Array<{ name: string; value: MenuChoice }> = [];

  if (totalGroups >= 3) {
    choices.push({ name: `Generate fix prompt for top 3 issues`, value: 'top3' });
  }
  if (totalGroups > 0) {
    choices.push({ name: `Generate fix prompt for all issues`, value: 'all' });
  }
  if (totalGroups > 3) {
    choices.push({ name: 'Pick specific issues...', value: 'pick' });
  }
  choices.push({ name: 'Skip', value: 'skip' });

  let answer: MenuChoice;
  try {
    answer = await select({
      message: 'What would you like to do next?',
      choices,
    });
  } catch {
    // User pressed Ctrl+C — exit gracefully
    console.log('');
    return;
  }

  if (answer === 'skip') {
    console.log('');
    return;
  }

  let promptText: string;

  if (answer === 'top3') {
    promptText = generateFixPrompt(result, 3);
  } else if (answer === 'all') {
    promptText = generateFixPrompt(result, Infinity);
  } else {
    // 'pick' — let user select individual rules
    promptText = await pickSpecificIssues(result, groups);
    if (!promptText) return;
  }

  // Copy to clipboard using native helper
  const clipboardOk = await writeToClipboard(promptText);

  // Print the prompt
  console.log('');
  console.log(pc.bold('  ── Generated Fix Prompt ' + '─'.repeat(24)));
  console.log('');
  const indented = promptText.split('\n').map(l => '  ' + l).join('\n');
  console.log(pc.white(indented));
  console.log('');
  console.log(pc.bold('  ' + '─'.repeat(49)));
  console.log('');

  if (clipboardOk) {
    console.log(pc.green('  ✔ Copied to clipboard') + pc.dim(' — paste into any agent or chat'));
  } else {
    console.log(pc.dim('  (Clipboard not available — copy the text above manually)'));
  }
  console.log('');
}

async function pickSpecificIssues(
  result: AuditResult,
  groups: FixGroup[]
): Promise<string> {
  const severityLabel = (s: string) =>
    s === 'error' ? pc.red('ERR') : s === 'warning' ? pc.yellow('WRN') : pc.blue('INF');

  type RuleChoice = string | 'done' | 'cancel';

  const ruleChoices: Array<{ name: string; value: RuleChoice }> = groups.map(g => ({
    name: `${severityLabel(g.severity)} ${g.categoryLabel}: ${g.description}${g.count > 1 ? ` (×${g.count})` : ''}`,
    value: g.rule,
  }));
  ruleChoices.push({ name: pc.dim('─── Done selecting'), value: 'done' });
  ruleChoices.push({ name: pc.dim('Cancel'), value: 'cancel' });

  const selected: string[] = [];

  // Simple sequential picker: keep asking until user picks 'done' or 'cancel'
  let picking = true;
  while (picking) {
    const remaining = ruleChoices.filter(
      c => c.value === 'done' || c.value === 'cancel' || !selected.includes(c.value as string)
    );

    let choice: RuleChoice;
    try {
      choice = await select({
        message: selected.length === 0
          ? 'Select issues to include (pick one at a time):'
          : `Selected ${selected.length}. Add another or finish:`,
        choices: remaining,
      });
    } catch {
      return '';
    }

    if (choice === 'done') {
      picking = false;
    } else if (choice === 'cancel') {
      return '';
    } else {
      selected.push(choice);
    }
  }

  if (selected.length === 0) return '';

  // Build a synthetic AuditResult with only the selected rules
  const filteredDiags = result.diagnostics.filter(d => selected.includes(d.rule));
  const filteredResult: AuditResult = { ...result, diagnostics: filteredDiags };
  return generateFixPrompt(filteredResult, Infinity);
}

// Subcommand: rules
const rulesCommand = program
  .command('rules')
  .description('Manage audit rules');

rulesCommand
  .command('list')
  .description('List all available rules')
  .action(() => {
    console.log('');
    console.log(pc.bold(pc.cyan(`  💻 react-code-audit rules`)) + pc.dim(` · ${getRuleCount()} rules`));
    console.log('');

    const categories = Object.keys(CATEGORY_LABELS) as RuleCategory[];

    for (const category of categories) {
      const rules = getRulesByCategory(category);
      const icon = getCategoryIcon(category);
      console.log(pc.bold(`  ${icon} ${CATEGORY_LABELS[category]}`) + pc.dim(` (${rules.length} rules)`));

      for (const rule of rules) {
        const severityBadge = getSeverityBadge(rule.meta.severity);
        console.log(`    ${severityBadge} ${pc.white(rule.meta.name)}  ${pc.dim(rule.meta.description)}`);
      }
      console.log('');
    }
  });

rulesCommand
  .command('explain <rule-name>')
  .description('Show detailed documentation for a rule')
  .action((ruleName: string) => {
    const rule = getRule(ruleName);

    if (!rule) {
      console.error(pc.red(`\n  Rule "${ruleName}" not found.`));
      console.log(pc.dim(`  Run ${pc.cyan('react-code-audit rules list')} to see all available rules.\n`));
      process.exit(1);
    }

    console.log('');
    console.log(pc.bold(pc.cyan(`  📖 ${rule.meta.name}`)));
    console.log('');
    console.log(`  ${pc.bold('Category:')}    ${CATEGORY_LABELS[rule.meta.category]}`);
    console.log(`  ${pc.bold('Severity:')}    ${getSeverityBadge(rule.meta.severity)} ${rule.meta.severity}`);
    console.log(`  ${pc.bold('Description:')} ${rule.meta.description}`);
    console.log('');
    console.log(pc.bold('  Why?'));
    console.log(`  ${rule.meta.docs}`);
    console.log('');
  });

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

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'error':
      return pc.bgRed(pc.white(pc.bold(' ERR ')));
    case 'warning':
      return pc.bgYellow(pc.black(pc.bold(' WRN ')));
    case 'info':
      return pc.bgBlue(pc.white(pc.bold(' INF ')));
    default:
      return pc.dim(' --- ');
  }
}

program.parse();

