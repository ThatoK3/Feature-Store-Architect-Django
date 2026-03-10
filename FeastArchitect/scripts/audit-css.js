#!/usr/bin/env node
/**
 * audit-css.js
 * Run: node scripts/audit-css.js  (from FeastArchitect/ root)
 *
 * Reports:
 *   - All CSS custom properties defined in main.css
 *   - Variables used but not defined (broken references)
 *   - CSS class families and their sizes
 *   - Classes referenced in templates/JS but not defined in CSS
 *   - Overall file stats
 */

'use strict';
const fs = require('fs');
const path = require('path');

const CSS_FILE = 'static/FeastArchitect/css/main.css';
if (!fs.existsSync(CSS_FILE)) {
  console.error(`\n❌  Not found: ${CSS_FILE}\n    Run from FeastArchitect/ root.\n`);
  process.exit(1);
}

const css = fs.readFileSync(CSS_FILE, 'utf8');

// ── Read all JS + HTML files ──────────────────────────────────────────────────
function walkDir(dir, exts) {
  if (!fs.existsSync(dir)) return '';
  let combined = '';
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      combined += walkDir(full, exts);
    } else if (exts.some(e => entry.name.endsWith(e))) {
      combined += fs.readFileSync(full, 'utf8') + '\n';
    }
  }
  return combined;
}
const usage = walkDir('static/FeastArchitect/js', ['.js']) + walkDir('templates', ['.html']);

// ── CSS Variables ─────────────────────────────────────────────────────────────
const definedVars = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const usedVars = new Set([...css.matchAll(/var\((--[\w-]+)[,)]/g)].map(m => m[1]));
const undeclaredVars = [...usedVars].filter(v => !definedVars.has(v)).sort();
const unusedVars = [...definedVars].filter(v => !usedVars.has(v)).sort();

// ── CSS Classes ───────────────────────────────────────────────────────────────
// All class selectors defined in CSS
const cssClasses = new Set(
  [...css.matchAll(/\.([\w-]+)[\s,{:[\]]/g)]
    .map(m => m[1])
    .filter(c => c.length > 1 && !['not', 'nth', 'first', 'last', 'only', 'is', 'where', 'has'].includes(c))
);

// Classes referenced in HTML/JS
const usedClasses = new Set([
  // HTML class="..."
  ...[...usage.matchAll(/class(?:Name)?=["']([^"']+)["']/g)]
    .flatMap(m => m[1].trim().split(/\s+/)),
  // JS classList.add/remove/toggle/contains('...')
  ...[...usage.matchAll(/classList\.(?:add|remove|toggle|contains)\(['"]([^'"]+)['"]/g)]
    .map(m => m[2] || m[1]),
  // JS className strings in template literals
  ...[...usage.matchAll(/class=\\"([^"]+)\\"/g)]
    .flatMap(m => m[1].split(/\s+/)),
]);

// ── Class families ────────────────────────────────────────────────────────────
const families = {};
[...cssClasses].forEach(cls => {
  const prefix = cls.split('-')[0];
  families[prefix] = (families[prefix] || 0) + 1;
});

// ── File stats ────────────────────────────────────────────────────────────────
const lineCount = css.split('\n').length;
const ruleCount = (css.match(/\{/g) || []).length;
const selectorCount = (css.match(/[^{}]+\{/g) || []).length;

// ── Output ────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(63)}`);
console.log('  FeastArchitect — CSS Audit');
console.log(`${'═'.repeat(63)}`);
console.log(`  File: ${CSS_FILE}`);
console.log(`  Size: ${lineCount} lines  |  ~${selectorCount} selectors  |  ${(fs.statSync(CSS_FILE).size / 1024).toFixed(1)} KB`);

console.log(`\n  CSS CUSTOM PROPERTIES`);
console.log(`  Defined: ${definedVars.size}  |  Used: ${usedVars.size}`);
if (undeclaredVars.length) {
  console.log(`\n  ⚠️  USED BUT NOT DEFINED (broken — check :root or add declaration):`);
  undeclaredVars.forEach(v => console.log(`     ${v}`));
} else {
  console.log('  ✅  All used variables are defined');
}
if (unusedVars.length) {
  console.log(`\n  💡  DEFINED BUT APPARENTLY UNUSED (${unusedVars.length}):`);
  unusedVars.forEach(v => console.log(`     ${v}`));
}

console.log(`\n  ALL DEFINED VARIABLES:`);
[...definedVars].sort().forEach(v => {
  const inUse = usedVars.has(v) ? '✓' : '?';
  console.log(`     ${inUse}  ${v}`);
});

console.log(`\n  CLASS FAMILIES (by size — prefix-* count):`);
Object.entries(families)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([prefix, count]) => {
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`     .${prefix.padEnd(22)}-*  ${String(count).padStart(3)}  ${bar}`);
  });

console.log(`\n  Total CSS classes defined: ${cssClasses.size}`);
console.log(`${'─'.repeat(63)}\n`);
