# 💻 react-code-audit

**A CLI tool that audits React codebases for performance, security, architecture, state & effects, accessibility, and dead code issues — and generates AI-ready fix prompts in one click.**

[![npm version](https://img.shields.io/npm/v/react-code-audit?color=blue)](https://www.npmjs.com/package/react-code-audit)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178c6)](https://www.typescriptlang.org/)

---

## What it does

`react-code-audit` statically analyses your React / TypeScript codebase, scores it 0–100, and tells you exactly what to fix. After every scan it offers an interactive menu that generates a structured **AI agent prompt** — ready to paste into Claude, ChatGPT, Cursor, or any other agent — describing every issue with file locations and fix instructions.

```
  💻 react-code-audit v1.0.0
  Scanning current directory...

  ╔══════════════════════════════════════════════════╗
  ║  💻  react-code-audit  · my-app             react  ║
  ╚══════════════════════════════════════════════════╝

  Health Score: ██████████████████████░░░░░░░░ 72/100  ⚠️ Needs Work

  📁 86 files scanned · 12,450 lines · 1,203ms

  Category Breakdown
  ─────────────────────────────────────────────
  ⚡ Performance        3 warnings
  🔄 State & Effects    2 warnings
  🏗️ Architecture       ✓ No issues
  🔒 Security           1 error
  ♿ Accessibility      2 warnings
  🗑️ Dead Code          4 warnings

  ─────────────────────────────────────────────
  Found: 1 error · 11 warnings

  What would you like to do next? Use arrow-keys. Return to submit.
  ❯  Generate fix prompt for top 3 issues
     Generate fix prompt for all issues
     Pick specific issues...
     Skip
```

---

## Installation

```bash
# Run without installing (recommended)
npx react-code-audit

# Or install globally
npm install -g react-code-audit
```

---

## Usage

```bash
# Scan the current directory
react-code-audit

# Scan a specific project
react-code-audit ./path/to/my-app

# Show detailed per-file diagnostics
react-code-audit --verbose

# Output raw JSON (for CI/CD)
react-code-audit --json

# Generate an interactive HTML report dashboard and auto-open in browser
react-code-audit --html

# Specify a custom HTML report output path
react-code-audit --html ./reports/audit-report.html

# Show version
react-code-audit --version
```

---

## The Fix Prompt Feature

After every scan, if issues are found, an interactive menu appears:

```
What would you like to do next? Use arrow-keys. Return to submit.
❯  Generate fix prompt for top 3 issues
   Generate fix prompt for all issues
   Pick specific issues...
   Skip
```

Select an option and `react-code-audit` will:

1. **Group** all findings by rule (same rule = one fix task)
2. **Rank** them by severity (errors first, then warnings, then info)
3. **Build** a structured prompt with file locations, descriptions, and docs links
4. **Copy** it to your clipboard automatically
5. **Print** it to the terminal

Paste into any AI agent and it will fix the root causes — not suppress them.

**Example generated prompt:**

```
Review and fix the top 3 react-code-audit findings in my-app. Leave the rest for a follow-up.

1. ERROR Security: Found dangerouslySetInnerHTML usage — this can lead to XSS attacks.
   Replace dangerouslySetInnerHTML with safe alternatives like DOMPurify or sanitize-html.
   Docs: https://react-audit.dev/docs/rules/no-dangerous-html
   - src/components/RichText.tsx:42
   - src/pages/Blog.tsx:18

2. WARN Performance: Inline object literal in JSX prop creates a new object on every render.
   Move the object outside the component or wrap it in useMemo.
   Docs: https://react-audit.dev/docs/rules/no-object-literal-in-jsx
   - src/components/Table.tsx:87

...

Read each file and fix the root cause — don't suppress or silence the rule.
```

---

## Rules Reference

`react-code-audit` ships with **23 rules** across 6 categories.

### ⚡ Performance (6 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-array-index-key` | warning | Using array index as React key causes incorrect reconciliation on list mutations |
| `no-inline-function-in-jsx` | warning | Inline arrow functions in JSX props create a new function reference on every render |
| `no-inline-styles` | info | Inline `style` objects are recreated on every render and bypass CSS caching |
| `no-object-literal-in-jsx` | warning | Object literals in JSX props (`style={{...}}`, `config={{...}}`) rebuild on every render |
| `use-memo-for-expensive` | info | Large `.map()` or `.filter()` chains inside render may benefit from `useMemo` |
| `no-unnecessary-rerenders` | warning | Components receiving stable props but lacking `React.memo` will re-render on every parent update |

### 🔄 State & Effects (6 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-missing-deps` | error | `useEffect` / `useCallback` / `useMemo` dependency arrays that are missing referenced variables |
| `no-derived-state` | warning | State that is directly computed from other state or props — use derived values instead |
| `no-effect-as-handler` | warning | Using `useEffect` to respond to user events instead of event handlers |
| `no-state-in-ref` | warning | Storing UI state in a `useRef` hides updates from React's render cycle |
| `no-set-state-in-effect-loop` | error | `setState` inside `useEffect` without a breaking condition causes infinite render loops |
| `no-direct-mutation` | error | Directly mutating state objects bypasses React's change detection |

### 🏗️ Architecture (6 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `max-component-lines` | info | Components over 300 lines are hard to read and test — consider splitting |
| `max-props` | warning | Components with more than 10 props are hard to use — consider a config object or compound components |
| `no-barrel-import` | info | Importing from barrel `index` files may hurt tree-shaking and increase bundle size |
| `no-prop-drilling` | warning | Props passed through 3+ component layers — consider Context or state management |
| `one-component-per-file` | info | Multiple exported components in one file reduce discoverability and testability |
| `no-deeply-nested-jsx` | warning | JSX nested more than 5 levels deep is hard to read and refactor |

### 🔒 Security (5 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-dangerous-html` | error | `dangerouslySetInnerHTML` can introduce XSS vulnerabilities if the value is not sanitised |
| `no-target-blank` | warning | `<a target="_blank">` without `rel="noopener noreferrer"` exposes users to tab-napping attacks |
| `no-eval` | error | `eval()` and `new Function()` execute arbitrary strings — a critical security risk |
| `no-unescaped-entities` | warning | Raw `<`, `>`, `"`, `'`, `{`, `}` inside JSX text may cause rendering or parsing errors |
| `no-hardcoded-secrets` | error | API keys, tokens, or passwords hardcoded in source will be exposed in your bundle |

### ♿ Accessibility (5 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `img-alt-text` | error | `<img>` tags without `alt` text are invisible to screen readers |
| `click-events-have-key-events` | warning | Clickable elements without `onKeyDown`/`onKeyUp` are unreachable by keyboard users |
| `no-autofocus` | info | `autoFocus` moves focus unexpectedly and disorients screen reader users |
| `anchor-has-content` | warning | Empty `<a>` tags give screen readers no indication of the link's purpose |
| `use-semantic-elements` | info | Using `<div onClick>` instead of `<button>` loses built-in keyboard and accessibility behaviour |

### 🗑️ Dead Code (4 rules)

| Rule | Severity | Description |
|------|----------|-------------|
| `no-unused-imports` | warning | Imported symbols that are never referenced increase bundle size |
| `no-unused-variables` | warning | Variables declared but never read clutter the codebase |
| `no-unreachable-code` | warning | Code after a `return`, `throw`, or `break` will never execute |
| `no-commented-code` | info | Large blocks of commented-out code should be deleted and recovered from version control if needed |

---

## Rules subcommand

```bash
# List all rules with their category and severity
react-code-audit rules list

# Get full documentation for a specific rule
react-code-audit rules explain no-dangerous-html
```

---

## JSON output (CI/CD)

```bash
react-code-audit --json > audit-report.json
```

Output shape:

```json
{
  "score": 84,
  "grade": "Great",
  "metadata": { "projectName": "my-app", "filesScanned": 86, "scanDuration": 1203 },
  "categories": [...],
  "diagnostics": [
    {
      "rule": "no-dangerous-html",
      "category": "security",
      "severity": "error",
      "message": "Found dangerouslySetInnerHTML — XSS risk.",
      "file": "src/components/RichText.tsx",
      "line": 42,
      "column": 8,
      "suggestion": "Use DOMPurify.sanitize() before passing HTML content."
    }
  ],
  "summary": { "totalIssues": 12, "errors": 1, "warnings": 9, "infos": 2 }
}
```

Fail CI when the score drops below 50:

```yaml
# .github/workflows/audit.yml
- name: React Audit
  run: npx react-code-audit --json | tee audit.json
  # react-code-audit exits with code 1 when score < 50
```

---

## Interactive HTML Report

Generate a self-contained, offline-capable interactive HTML dashboard report:

```bash
react-code-audit --html
```

This generates `react-audit-report.html` in your project root and automatically opens it in your default browser.

**Features of the HTML Report:**
- 🎯 **Health Score Dashboard**: Animated circular SVG score gauge (0–100) with grade badge.
- 📊 **Category Breakdown**: Progress bars for all 6 categories (*Performance, Security, Architecture, State & Effects, Accessibility, Dead Code*).
- 🔍 **Interactive Filters & Search**: Real-time filtering by severity, category, or text search across file paths and rules.
- ↕️ **Sortable Diagnostics Table**: Click table column headers to sort findings by severity, category, rule, or file.
- 🖨️ **Print & Export Ready**: Clean print stylesheet formatted for PDF generation and team sharing.
- 📦 **Zero External Dependencies**: Single `.html` file with inlined CSS and JS — works 100% offline without CDN links.

---

## Configuration

Create a `react-audit.config.json` in your project root to customise behaviour:

```json
{
  "rules": {
    "no-inline-styles": "off",
    "no-barrel-import": "info",
    "no-dangerous-html": "error"
  },
  "exclude": [
    "src/generated/**",
    "src/legacy/**"
  ]
}
```

Valid severity values: `"error"`, `"warning"`, `"info"`, `"off"`.

---

## Health Score

The score (0–100) is calculated from the weighted severity of all findings relative to the number of files scanned:

| Score | Grade | Meaning |
|-------|-------|---------|
| 75–100 | ✅ Great | Production ready |
| 50–74 | ⚠️ Needs Work | Address warnings before shipping |
| 0–49 | 🔴 Critical | Blocking issues present — CI fails |

---

## Local development

```bash
git clone https://github.com/Meeranmk/react-audit.git
cd react-audit
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run on itself
node dist/cli.js .

# Type-check only
npm run lint
```

---

## License

MIT © [Meeranmk](https://github.com/Meeranmk)
