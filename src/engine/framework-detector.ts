/**
 * Auto-detects the React framework used in the project.
 */

import * as fs from 'fs';
import * as path from 'path';

export type Framework =
  | 'next.js'
  | 'vite'
  | 'remix'
  | 'create-react-app'
  | 'gatsby'
  | 'react-native'
  | 'astro'
  | 'react';

interface FrameworkDetection {
  name: Framework;
  dependencies: string[];
  devDependencies?: string[];
  files?: string[];
}

const FRAMEWORK_DETECTIONS: FrameworkDetection[] = [
  {
    name: 'next.js',
    dependencies: ['next'],
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
  },
  {
    name: 'remix',
    dependencies: ['@remix-run/react', '@remix-run/node'],
  },
  {
    name: 'gatsby',
    dependencies: ['gatsby'],
    files: ['gatsby-config.js', 'gatsby-config.ts'],
  },
  {
    name: 'react-native',
    dependencies: ['react-native'],
  },
  {
    name: 'astro',
    dependencies: ['astro'],
    files: ['astro.config.mjs', 'astro.config.ts'],
  },
  {
    name: 'vite',
    dependencies: ['vite'],
    devDependencies: ['vite'],
    files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
  },
  {
    name: 'create-react-app',
    dependencies: ['react-scripts'],
  },
];

export function detectFramework(projectRoot: string): Framework {
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return 'react';
  }

  let pkg: any;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return 'react';
  }

  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDeps };

  for (const detection of FRAMEWORK_DETECTIONS) {
    // Check dependencies
    const hasDep = detection.dependencies.some((dep) => dep in allDeps);
    if (hasDep) return detection.name;

    // Check for framework-specific files
    if (detection.files) {
      const hasFile = detection.files.some((file) =>
        fs.existsSync(path.join(projectRoot, file))
      );
      if (hasFile) return detection.name;
    }
  }

  // Fallback: if React is present
  if ('react' in allDeps) {
    return 'react';
  }

  return 'react';
}

export function getProjectName(projectRoot: string): string {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name || path.basename(projectRoot);
    } catch {
      // fall through
    }
  }
  return path.basename(projectRoot);
}
