#!/usr/bin/env node

/**
 * react-audit CLI — Audit React codebases for quality issues.
 *
 * Usage:
 *   react-audit [path]              Scan a project directory
 *   react-audit --verbose           Show detailed diagnostics
 *   react-audit --json              Output as JSON
 *   react-audit rules list          List all available rules
 *   react-audit rules explain <name> Explain a specific rule
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import select from '@inquirer/select';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const clipboardy = require('clipboardy') as typeof import('clipboardy');
import { scanProject } from './engine/scanner';
import { printReport } from './reporters/console-reporter';
import { printJsonReport } from './reporters/json-reporter';
import { generateFixPrompt, getRankedGroups, FixGroup } from './reporters/prompt-generator';
import { getAllRules, getRule, getRulesByCategory, getRuleCount } from './rules';
import { CATEGORY_LABELS, RuleCategory, AuditResult } from './types';

const VERSION = '1.0.0';

const program = new Command();

program
  .name('react-audit')
  .description('💻 Audit your React codebase for performance, security, architecture, state & effects, accessibility, and dead code issues.')
  .version(VERSION, '-v, --version', 'Display the version number')
  .argument('[path]', 'Path to the project directory', '.')
  .option('--verbose', 'Show detailed per-file diagnostics', false)
  .option('--json', 'Output results as JSON', false)
  .action(async (projectPath: string, options: { verbose: boolean; json: boolean }) => {
    if (!options.json) {
      console.log('');
      console.log(chalk.cyan.bold('  💻 react-audit') + chalk.dim(` v${VERSION}`));
      console.log(chalk.dim(`  Scanning ${projectPath === '.' ? 'current directory' : projectPath}...`));
      console.log('');
    }

    const spinner = options.json ? null : ora({
      text: 'Analyzing React codebase...',
      prefixText: '  ',
    }).start();

    try {
      const result = await scanProject(projectPath, { verbose: options.verbose, json: options.json });

      if (spinner) {
        spinner.succeed(chalk.dim(`Scan complete · ${result.metadata.filesScanned} files analyzed in ${result.metadata.scanDuration}ms`));
      }

      if (options.json) {
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
        spinner.fail(chalk.red('Scan failed'));
      }
      console.error(chalk.red(`\n  Error: ${error.message || error}\n`));
      process.exit(1);
    }
  });

// ─── Interactive Prompt Menu ───────────────────────────────────────────────────

async function runPromptMenu(result: AuditResult): Promise<void> {
  const groups = getRankedGroups(result);
  const totalGroups = groups.length;

  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────────'));

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

  // Copy to clipboard
  let clipboardOk = false;
  try {
    await clipboardy.write(promptText);
    clipboardOk = true;
  } catch {
    // Clipboard not available (e.g. headless CI)
  }

  // Print the prompt
  console.log('');
  console.log(chalk.bold('  ── Generated Fix Prompt ' + '─'.repeat(24)));
  console.log('');
  const indented = promptText.split('\n').map(l => '  ' + l).join('\n');
  console.log(chalk.white(indented));
  console.log('');
  console.log(chalk.bold('  ' + '─'.repeat(49)));
  console.log('');

  if (clipboardOk) {
    console.log(chalk.green('  ✔ Copied to clipboard') + chalk.dim(' — paste into any agent or chat'));
  } else {
    console.log(chalk.dim('  (Clipboard not available — copy the text above manually)'));
  }
  console.log('');
}

async function pickSpecificIssues(
  result: AuditResult,
  groups: FixGroup[]
): Promise<string> {
  const severityLabel = (s: string) =>
    s === 'error' ? chalk.red('ERR') : s === 'warning' ? chalk.yellow('WRN') : chalk.blue('INF');

  type RuleChoice = string | 'done' | 'cancel';

  const ruleChoices: Array<{ name: string; value: RuleChoice }> = groups.map(g => ({
    name: `${severityLabel(g.severity)} ${g.categoryLabel}: ${g.description}${g.count > 1 ? ` (×${g.count})` : ''}`,
    value: g.rule,
  }));
  ruleChoices.push({ name: chalk.dim('─── Done selecting'), value: 'done' });
  ruleChoices.push({ name: chalk.dim('Cancel'), value: 'cancel' });

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
    console.log(chalk.cyan.bold(`  💻 react-audit rules`) + chalk.dim(` · ${getRuleCount()} rules`));
    console.log('');

    const categories = Object.keys(CATEGORY_LABELS) as RuleCategory[];

    for (const category of categories) {
      const rules = getRulesByCategory(category);
      const icon = getCategoryIcon(category);
      console.log(chalk.bold(`  ${icon} ${CATEGORY_LABELS[category]}`) + chalk.dim(` (${rules.length} rules)`));

      for (const rule of rules) {
        const severityBadge = getSeverityBadge(rule.meta.severity);
        console.log(`    ${severityBadge} ${chalk.white(rule.meta.name)}  ${chalk.dim(rule.meta.description)}`);
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
      console.error(chalk.red(`\n  Rule "${ruleName}" not found.`));
      console.log(chalk.dim(`  Run ${chalk.cyan('react-audit rules list')} to see all available rules.\n`));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.cyan.bold(`  📖 ${rule.meta.name}`));
    console.log('');
    console.log(`  ${chalk.bold('Category:')}    ${CATEGORY_LABELS[rule.meta.category]}`);
    console.log(`  ${chalk.bold('Severity:')}    ${getSeverityBadge(rule.meta.severity)} ${rule.meta.severity}`);
    console.log(`  ${chalk.bold('Description:')} ${rule.meta.description}`);
    console.log('');
    console.log(chalk.bold('  Why?'));
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
      return chalk.bgRed.white.bold(' ERR ');
    case 'warning':
      return chalk.bgYellow.black.bold(' WRN ');
    case 'info':
      return chalk.bgBlue.white.bold(' INF ');
    default:
      return chalk.dim(' --- ');
  }
}

program.parse();
