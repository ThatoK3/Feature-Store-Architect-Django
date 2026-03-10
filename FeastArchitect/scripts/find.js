#!/usr/bin/env node
/**
 * find.js
 * Run: node scripts/find.js <search-term>  (from FeastArchitect/ root)
 *
 * Searches all .js, .css, and .html files for any string.
 * Groups results by file, shows line numbers and context.
 *
 * Examples:
 *   node scripts/find.js "_openFeatureModal"     ← trace a method
 *   node scripts/find.js "fdm-modal"             ← trace a CSS class
 *   node scripts/find.js "panelFeatCatalogBtn"   ← trace a DOM ID
 *   node scripts/find.js "this.nodes.size"       ← find the bug pattern
 *   node scripts/find.js "serving.online"        ← find feature field usage
 */

'use strict';
const fs = require('fs');
const path = require('path');

const term = process.argv[2];
const caseSensitive = !process.argv.includes('--ci');

if (!term) {
  console.log('\nUsage: node scripts/find.js <search-term> [--ci]\n');
  console.log('Options:');
  console.log('  --ci    Case-insensitive search\n');
  console.log('Examples:');
  console.log('  node scripts/find.js _openFeatureModal');
  console.log('  node scripts/find.js fdm-modal --ci');
  process.exit(0);
}

const searchTerm = caseSensitive ? term : term.toLowerCase();

function walk(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      return walk(full, extensions);
    }
    if (!entry.isDirectory() && extensions.some(ext => entry.name.endsWith(ext))) {
      const rawContent = fs.readFileSync(full, 'utf8');
      const fileLines = rawContent.split('\n');
      return fileLines
        .map((line, i) => {
          const check = caseSensitive ? line : line.toLowerCase();
          return check.includes(searchTerm) ? { file: full, line: i + 1, text: line.trim() } : null;
        })
        .filter(Boolean);
    }
    return [];
  });
}

const DIRS = ['static', 'templates'];
const EXTS = ['.js', '.css', '.html'];
const results = DIRS.flatMap(d => walk(d, EXTS));

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Search: "${term}"${caseSensitive ? '' : ' (case-insensitive)'}`);
console.log(`${'═'.repeat(60)}\n`);

if (results.length === 0) {
  console.log(`  No results found.\n`);
  process.exit(0);
}

// Group by file
const byFile = results.reduce((acc, r) => {
  (acc[r.file] = acc[r.file] || []).push(r);
  return acc;
}, {});

let fileCount = 0;
for (const [file, hits] of Object.entries(byFile)) {
  fileCount++;
  const ext = path.extname(file);
  const icon = ext === '.js' ? '📜' : ext === '.css' ? '🎨' : '📄';
  const relFile = file.replace(process.cwd() + path.sep, '');
  console.log(`${icon}  ${relFile}  (${hits.length} hit${hits.length > 1 ? 's' : ''})`);
  hits.forEach(h => {
    const preview = h.text.length > 95 ? h.text.slice(0, 92) + '...' : h.text;
    console.log(`   L${String(h.line).padEnd(5)} ${preview}`);
  });
  console.log('');
}

console.log(`${'─'.repeat(60)}`);
console.log(`  ${results.length} occurrence(s) across ${fileCount} file(s)\n`);
