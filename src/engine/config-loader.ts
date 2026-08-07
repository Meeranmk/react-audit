/**
 * Configuration loader for react-audit.
 * Loads from audit.config.json or package.json "reactAudit" key.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditConfig } from '../types';

const CONFIG_FILENAMES = ['audit.config.json'];

export function loadConfig(projectRoot: string): AuditConfig {
  // Try audit.config.json
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(projectRoot, filename);
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as AuditConfig;
        return normalizeConfig(parsed);
      } catch {
        // Invalid config file — fall through to defaults
      }
    }
  }

  // Try package.json "reactAudit" key
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.reactAudit) {
        return normalizeConfig(pkg.reactAudit as AuditConfig);
      }
    } catch {
      // Invalid package.json — use defaults
    }
  }

  return getDefaultConfig();
}

function normalizeConfig(config: Partial<AuditConfig>): AuditConfig {
  return {
    rules: config.rules || {},
    exclude: config.exclude || [],
  };
}

function getDefaultConfig(): AuditConfig {
  return {
    rules: {},
    exclude: [],
  };
}
