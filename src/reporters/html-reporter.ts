/**
 * HTML reporter — generates a self-contained, interactive HTML dashboard
 * for react-code-audit results.
 *
 * The output is a single .html file with all CSS and JS inlined.
 * No external dependencies, CDN links, or extra files needed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditResult, CategorySummary, Diagnostic, CATEGORY_LABELS, RuleCategory } from '../types';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a complete HTML report string from an AuditResult.
 */
export function generateHtmlReport(result: AuditResult): string {
  const { score, grade, diagnostics, categories, metadata } = result;
  const timestamp = new Date().toISOString();

  const scoreColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const totalIssues = diagnostics.length;
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="React Code Audit Report for ${escapeHtml(metadata.projectName)} — Health Score: ${score}/100">
  <title>Audit Report · ${escapeHtml(metadata.projectName)} · ${score}/100</title>
  <style>${getStyles(scoreColor)}</style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1 class="brand">💻 react-code-audit</h1>
        <span class="project-name">${escapeHtml(metadata.projectName)}</span>
        <span class="framework-badge">${escapeHtml(metadata.framework)}</span>
      </div>
      <div class="header-right">
        <span class="timestamp">${formatTimestamp(timestamp)}</span>
      </div>
    </header>

    <!-- Score + Stats Row -->
    <section class="score-section">
      <div class="score-gauge">
        <svg viewBox="0 0 200 200" class="gauge-svg">
          <circle cx="100" cy="100" r="85" fill="none" stroke="#2a2d3a" stroke-width="12"/>
          <circle cx="100" cy="100" r="85" fill="none"
            stroke="${scoreColor}"
            stroke-width="12"
            stroke-linecap="round"
            stroke-dasharray="${(score / 100) * 534} 534"
            stroke-dashoffset="0"
            transform="rotate(-90 100 100)"
            class="gauge-arc"/>
        </svg>
        <div class="gauge-label">
          <span class="gauge-score" style="color:${scoreColor}">${score}</span>
          <span class="gauge-max">/100</span>
          <span class="gauge-grade" style="color:${scoreColor}">${grade}</span>
        </div>
      </div>
      <div class="stats-grid">
        ${renderStatCard('📁', 'Files Scanned', String(metadata.filesScanned))}
        ${renderStatCard('📝', 'Lines of Code', metadata.totalLines.toLocaleString())}
        ${renderStatCard('⏱️', 'Scan Duration', `${metadata.scanDuration}ms`)}
        ${renderStatCard('🔍', 'Total Issues', String(totalIssues))}
        ${renderStatCard('🔴', 'Errors', String(errorCount))}
        ${renderStatCard('🟡', 'Warnings', String(warningCount))}
      </div>
    </section>

    <!-- Category Breakdown -->
    <section class="categories-section">
      <h2 class="section-title">Category Breakdown</h2>
      <div class="category-grid">
        ${categories.map(cat => renderCategoryCard(cat)).join('\n        ')}
      </div>
    </section>

    <!-- Diagnostics Table -->
    <section class="diagnostics-section">
      <h2 class="section-title">
        Diagnostics
        <span class="issue-count">${totalIssues} issue${totalIssues !== 1 ? 's' : ''}</span>
      </h2>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label for="filter-severity">Severity</label>
          <select id="filter-severity" onchange="applyFilters()">
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="filter-category">Category</label>
          <select id="filter-category" onchange="applyFilters()">
            <option value="all">All</option>
            ${Object.entries(CATEGORY_LABELS).map(([key, label]) =>
              `<option value="${key}">${label}</option>`
            ).join('\n            ')}
          </select>
        </div>
        <div class="filter-group search-group">
          <label for="filter-search">Search</label>
          <input type="text" id="filter-search" placeholder="File, rule, or message..." oninput="applyFilters()">
        </div>
      </div>

      ${totalIssues > 0 ? `
      <div class="table-wrapper">
        <table id="diagnostics-table">
          <thead>
            <tr>
              <th class="sortable" onclick="sortTable(0)">Severity <span class="sort-icon">⇅</span></th>
              <th class="sortable" onclick="sortTable(1)">Category <span class="sort-icon">⇅</span></th>
              <th class="sortable" onclick="sortTable(2)">Rule <span class="sort-icon">⇅</span></th>
              <th>Message</th>
              <th class="sortable" onclick="sortTable(4)">File <span class="sort-icon">⇅</span></th>
              <th>Line</th>
              <th>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            ${diagnostics.map(d => renderDiagnosticRow(d)).join('\n            ')}
          </tbody>
        </table>
      </div>
      <p class="table-info" id="table-info"></p>
      ` : `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <p>No issues found! Your codebase is clean.</p>
      </div>
      `}
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>Generated by <strong>react-code-audit</strong> v1.0.2 · ${formatTimestamp(timestamp)}</p>
    </footer>

  </div>

  <script>${getScript()}</script>
</body>
</html>`;
}

/**
 * Write the HTML report to a file on disk.
 * @returns The absolute path to the written file.
 */
export function writeHtmlReport(result: AuditResult, outputPath: string): string {
  const html = generateHtmlReport(result);
  const absPath = path.resolve(outputPath);
  fs.writeFileSync(absPath, html, 'utf-8');
  return absPath;
}

// ─── Render Helpers ───────────────────────────────────────────────────────────

function renderStatCard(icon: string, label: string, value: string): string {
  return `
        <div class="stat-card">
          <span class="stat-icon">${icon}</span>
          <span class="stat-value">${value}</span>
          <span class="stat-label">${label}</span>
        </div>`;
}

function renderCategoryCard(cat: CategorySummary): string {
  const icon = getCategoryIcon(cat.category);
  const maxIssues = 20; // max for bar scaling
  const barWidth = cat.total === 0 ? 100 : Math.max(5, 100 - (cat.total / maxIssues) * 100);
  const barColor = cat.total === 0 ? '#22c55e' : cat.errors > 0 ? '#ef4444' : cat.warnings > 0 ? '#eab308' : '#3b82f6';

  const parts: string[] = [];
  if (cat.errors > 0) parts.push(`<span class="cat-errors">${cat.errors} error${cat.errors !== 1 ? 's' : ''}</span>`);
  if (cat.warnings > 0) parts.push(`<span class="cat-warnings">${cat.warnings} warning${cat.warnings !== 1 ? 's' : ''}</span>`);
  if (cat.infos > 0) parts.push(`<span class="cat-infos">${cat.infos} info</span>`);
  const detail = cat.total === 0 ? '<span class="cat-clean">✓ No issues</span>' : parts.join(' · ');

  return `
        <div class="category-card">
          <div class="cat-header">
            <span class="cat-icon">${icon}</span>
            <span class="cat-label">${escapeHtml(cat.label)}</span>
            <span class="cat-total">${cat.total}</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${barWidth}%;background:${barColor}"></div>
          </div>
          <div class="cat-detail">${detail}</div>
        </div>`;
}

function renderDiagnosticRow(d: Diagnostic): string {
  const sevClass = `sev-${d.severity}`;
  const sevLabel = d.severity === 'error' ? 'ERR' : d.severity === 'warning' ? 'WRN' : 'INF';
  const categoryLabel = CATEGORY_LABELS[d.category as RuleCategory] ?? d.category;

  return `
            <tr data-severity="${d.severity}" data-category="${d.category}">
              <td><span class="sev-badge ${sevClass}">${sevLabel}</span></td>
              <td>${escapeHtml(categoryLabel)}</td>
              <td class="rule-cell">${escapeHtml(d.rule)}</td>
              <td>${escapeHtml(d.message)}</td>
              <td class="file-cell">${escapeHtml(d.file)}</td>
              <td class="line-cell">${d.line}</td>
              <td class="suggestion-cell">${d.suggestion ? escapeHtml(d.suggestion) : '<span class="no-suggestion">—</span>'}</td>
            </tr>`;
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────

function getStyles(scoreColor: string): string {
  return `
    /* ── Reset & Base ───────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface-hover: #22253a;
      --border: #2a2d3a;
      --text: #e4e4e7;
      --text-secondary: #9ca3af;
      --accent: #6366f1;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
      --info: #3b82f6;
      --radius: 12px;
      --radius-sm: 8px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .brand {
      font-size: 1.4rem;
      font-weight: 700;
      background: linear-gradient(135deg, #818cf8, #6366f1, #4f46e5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .project-name {
      font-size: 1rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .framework-badge {
      font-size: 0.75rem;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .timestamp {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    /* ── Score Section ──────────────────────────────────────────── */
    .score-section {
      display: flex;
      align-items: center;
      gap: 40px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .score-gauge {
      position: relative;
      width: 180px;
      height: 180px;
      flex-shrink: 0;
    }

    .gauge-svg {
      width: 100%;
      height: 100%;
    }

    .gauge-arc {
      transition: stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gauge-label {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .gauge-score {
      font-size: 2.8rem;
      font-weight: 700;
      line-height: 1;
    }

    .gauge-max {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .gauge-grade {
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      flex: 1;
      min-width: 280px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      transition: border-color 0.2s, transform 0.2s;
    }

    .stat-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .stat-icon { font-size: 1.3rem; }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    /* ── Section Titles ─────────────────────────────────────────── */
    .section-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .issue-count {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 2px 10px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
    }

    /* ── Category Breakdown ─────────────────────────────────────── */
    .categories-section {
      margin-bottom: 40px;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 12px;
    }

    .category-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      transition: border-color 0.2s, transform 0.2s;
    }

    .category-card:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    .cat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .cat-icon { font-size: 1.1rem; }

    .cat-label {
      font-weight: 600;
      font-size: 0.95rem;
      flex: 1;
    }

    .cat-total {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.06);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .cat-bar-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .cat-bar-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cat-detail {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .cat-errors { color: var(--error); font-weight: 500; }
    .cat-warnings { color: var(--warning); font-weight: 500; }
    .cat-infos { color: var(--info); font-weight: 500; }
    .cat-clean { color: var(--success); font-weight: 500; }

    /* ── Filters ────────────────────────────────────────────────── */
    .diagnostics-section {
      margin-bottom: 40px;
    }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-group label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .filter-group select,
    .filter-group input {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    .filter-group select:focus,
    .filter-group input:focus {
      border-color: var(--accent);
    }

    .search-group { flex: 1; min-width: 200px; }
    .search-group input { width: 100%; }

    /* ── Table ──────────────────────────────────────────────────── */
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    thead {
      background: rgba(99, 102, 241, 0.08);
    }

    th {
      text-align: left;
      padding: 12px 14px;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      user-select: none;
    }

    th.sortable {
      cursor: pointer;
      transition: color 0.2s;
    }

    th.sortable:hover {
      color: var(--accent);
    }

    .sort-icon {
      font-size: 0.7rem;
      opacity: 0.5;
    }

    td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    tbody tr {
      transition: background 0.15s;
    }

    tbody tr:hover {
      background: var(--surface-hover);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .sev-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sev-error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    .sev-warning {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
    }

    .sev-info {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
    }

    .rule-cell {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.8rem;
      color: #818cf8;
    }

    .file-cell {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.8rem;
      color: var(--text-secondary);
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .line-cell {
      text-align: center;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .suggestion-cell {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-style: italic;
      max-width: 260px;
    }

    .no-suggestion { opacity: 0.3; }

    .table-info {
      margin-top: 8px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    /* ── Empty State ────────────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .empty-icon { font-size: 3rem; }

    .empty-state p {
      margin-top: 12px;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    /* ── Footer ─────────────────────────────────────────────────── */
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .footer strong { color: #818cf8; }

    /* ── Print Styles ───────────────────────────────────────────── */
    @media print {
      body { background: #fff; color: #111; }
      .container { max-width: 100%; padding: 0; }
      .header, .footer { border-color: #ddd; }
      .stat-card, .category-card { border-color: #ddd; background: #fafafa; }
      .table-wrapper { border-color: #ddd; }
      thead { background: #f3f4f6; }
      th, td { border-color: #e5e7eb; }
      tbody tr:hover { background: transparent; }
      .filters { display: none; }
      .brand {
        -webkit-text-fill-color: #4f46e5;
        color: #4f46e5;
      }
      .stat-value { color: #111; }
      .stat-label { color: #666; }
      .cat-label { color: #111; }
      .cat-detail { color: #666; }
      .rule-cell { color: #4f46e5; }
      .file-cell, .line-cell { color: #666; }
      .suggestion-cell { color: #666; }
      .sev-badge { border: 1px solid currentColor; }
    }

    /* ── Responsive ─────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .score-section {
        flex-direction: column;
        align-items: center;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .category-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ── Animations ─────────────────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .score-section,
    .categories-section,
    .diagnostics-section {
      animation: fadeIn 0.6s ease-out both;
    }

    .categories-section { animation-delay: 0.15s; }
    .diagnostics-section { animation-delay: 0.3s; }
  `;
}

// ─── Inline JavaScript ────────────────────────────────────────────────────────

function getScript(): string {
  return `
    // ── Filtering ─────────────────────────────────────────────────
    function applyFilters() {
      var severity = document.getElementById('filter-severity').value;
      var category = document.getElementById('filter-category').value;
      var search = document.getElementById('filter-search').value.toLowerCase();

      var table = document.getElementById('diagnostics-table');
      if (!table) return;

      var rows = table.querySelectorAll('tbody tr');
      var visible = 0;
      var total = rows.length;

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rowSeverity = row.getAttribute('data-severity');
        var rowCategory = row.getAttribute('data-category');
        var rowText = row.textContent.toLowerCase();

        var show = true;
        if (severity !== 'all' && rowSeverity !== severity) show = false;
        if (category !== 'all' && rowCategory !== category) show = false;
        if (search && rowText.indexOf(search) === -1) show = false;

        row.style.display = show ? '' : 'none';
        if (show) visible++;
      }

      var info = document.getElementById('table-info');
      if (info) {
        if (visible === total) {
          info.textContent = '';
        } else {
          info.textContent = 'Showing ' + visible + ' of ' + total + ' issues';
        }
      }
    }

    // ── Sorting ───────────────────────────────────────────────────
    var sortDirections = {};

    function sortTable(colIndex) {
      var table = document.getElementById('diagnostics-table');
      if (!table) return;

      var tbody = table.querySelector('tbody');
      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));

      var dir = sortDirections[colIndex] === 'asc' ? 'desc' : 'asc';
      sortDirections[colIndex] = dir;

      var severityOrder = { 'error': 0, 'warning': 1, 'info': 2 };

      rows.sort(function(a, b) {
        var aVal, bVal;

        if (colIndex === 0) {
          aVal = severityOrder[a.getAttribute('data-severity')] || 9;
          bVal = severityOrder[b.getAttribute('data-severity')] || 9;
        } else {
          aVal = a.children[colIndex] ? a.children[colIndex].textContent.trim().toLowerCase() : '';
          bVal = b.children[colIndex] ? b.children[colIndex].textContent.trim().toLowerCase() : '';
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return dir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
        return 0;
      });

      for (var i = 0; i < rows.length; i++) {
        tbody.appendChild(rows[i]);
      }
    }
  `;
}
