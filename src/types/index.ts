/**
 * Core type definitions for react-audit
 */

export type Severity = 'error' | 'warning' | 'info';

export type RuleCategory =
  | 'performance'
  | 'state-effects'
  | 'architecture'
  | 'security'
  | 'accessibility'
  | 'dead-code';

export interface Diagnostic {
  rule: string;
  category: RuleCategory;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface RuleMeta {
  name: string;
  category: RuleCategory;
  severity: Severity;
  description: string;
  docs: string;
}

export interface RuleContext {
  filePath: string;
  sourceCode: string;
  report(diagnostic: Omit<Diagnostic, 'rule' | 'category' | 'severity' | 'file'>): void;
}

export interface RuleModule {
  meta: RuleMeta;
  create(context: RuleContext): ASTVisitor;
}

export interface ASTVisitor {
  [nodeType: string]: ((node: any) => void) | undefined;
}

export interface CategorySummary {
  category: RuleCategory;
  label: string;
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface ProjectMetadata {
  projectName: string;
  framework: string;
  filesScanned: number;
  totalLines: number;
  scanDuration: number;
}

export interface AuditResult {
  score: number;
  grade: 'Great' | 'Needs Work' | 'Critical';
  diagnostics: Diagnostic[];
  categories: CategorySummary[];
  metadata: ProjectMetadata;
}

export interface AuditConfig {
  rules?: Record<string, Severity | 'off'>;
  exclude?: string[];
}

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  'performance': 'Performance',
  'state-effects': 'State & Effects',
  'architecture': 'Architecture',
  'security': 'Security',
  'accessibility': 'Accessibility',
  'dead-code': 'Dead Code',
};
