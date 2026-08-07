/**
 * File scanner — discovers and parses React source files.
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { parse } from '@typescript-eslint/typescript-estree';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { AuditConfig, AuditResult, Diagnostic, ProjectMetadata } from '../types';
import { loadConfig } from './config-loader';
import { detectFramework, getProjectName } from './framework-detector';
import { runRules } from './rule-runner';
import { buildAuditResult } from './scorer';
import { getAllRules } from '../rules'

const SOURCE_EXTENSIONS = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'];

const DEFAULT_EXCLUDES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.d.ts',
  '**/*.config.*',
];

export interface ScanOptions {
  verbose?: boolean;
  json?: boolean;
}

export async function scanProject(
  projectRoot: string,
  options: ScanOptions = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const absRoot = path.resolve(projectRoot);

  // Load config
  const config = loadConfig(absRoot);

  // Detect framework
  const framework = detectFramework(absRoot);
  const projectName = getProjectName(absRoot);

  // Discover files
  const excludePatterns = [...DEFAULT_EXCLUDES, ...(config.exclude || [])];
  const files = await fg(SOURCE_EXTENSIONS, {
    cwd: absRoot,
    ignore: excludePatterns,
    absolute: true,
    onlyFiles: true,
  });

  // Get all enabled rules
  const rules = getAllRules();

  // Process each file
  const allDiagnostics: Diagnostic[] = [];
  let totalLines = 0;

  for (const filePath of files) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      totalLines += sourceCode.split('\n').length;

      // Parse AST
      const ast = parseFile(filePath, sourceCode);
      if (!ast) continue;

      // Run rules
      const relativePath = path.relative(absRoot, filePath);
      const diagnostics = runRules(ast, relativePath, sourceCode, rules, config);
      allDiagnostics.push(...diagnostics);
    } catch {
      // Skip files that can't be parsed
    }
  }

  const metadata: ProjectMetadata = {
    projectName,
    framework,
    filesScanned: files.length,
    totalLines,
    scanDuration: Date.now() - startTime,
  };

  return buildAuditResult(allDiagnostics, metadata);
}

function parseFile(
  filePath: string,
  sourceCode: string
): TSESTree.Program | null {
  try {
    return parse(sourceCode, {
      jsx: true,
      loc: true,
      range: true,
      comment: true,
      filePath,
      errorOnUnknownASTType: false,
    });
  } catch {
    return null;
  }
}
