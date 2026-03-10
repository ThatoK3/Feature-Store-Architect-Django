#!/usr/bin/env node
/**
 * audit-node-access.js
 * Run: node scripts/audit-node-access.js  (from FeastArchitect/ root)
 *
 * Detects incorrect this.nodes.* access patterns in feast-diagram.js.
 *
 * The architecture: this.nodes is a NodeManager instance which wraps an internal
 * Map at this.nodes.nodes. NodeManager exposes passthrough delegates for a subset
 * of Map methods. Anything outside that set must use this.nodes.nodes.METHOD().
 *
 * This script finds:
 *   - Triple dereferences: this.nodes.nodes.nodes.*  (from bad regex replaces)
 *   - this.nodes.size  (Map property with no passthrough)
 *   - this.nodes.UNKNOWN  (access to something NodeManager doesn't expose)
 */

'use strict';
const fs = require('fs');
const FILE = 'static/FeastArchitect/js/modules/feast-diagram.js';

if (!fs.existsSync(FILE)) {
  console.error(`\n❌  Not found: ${FILE}\n    Run from FeastArchitect/ root.\n`);
  process.exit(1);
}

const content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');

// Everything NodeManager legitimately exposes
const NM_PASSTHROUGH = new Set([
  // Map delegates
  'get', 'has', 'set', 'forEach', 'values', 'keys', 'entries', 'delete',
  // Own business methods
  'addDataSource', 'addEntity', 'addFeatureView', 'addService',
  'addConnection', 'removeNode', 'removeEdge', 'updateNode',
  'getNodesByType', 'getBounds', 'getUsedByCount', 'getPortPosition',
  'clear', 'importFromJSON', 'exportToJSON', 'generateId',
  // Properties
  'nodes', 'edges', 'databaseTypes', 'counters', 'config',
]);

const issues = [];
const warnings = [];

lines.forEach((line, i) => {
  const lineNum = i + 1;
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

  // ── Critical: triple dereference ────────────────────────────────────────────
  if (/this\.nodes\.nodes\.nodes\./.test(line)) {
    issues.push({
      line: lineNum, type: 'TRIPLE_DEREF',
      msg: 'Triple dereference — bad find-and-replace artifact',
      text: trimmed,
    });
  }

  // ── Critical: .size with no passthrough ─────────────────────────────────────
  if (/\bthis\.nodes\.size\b/.test(line)) {
    issues.push({
      line: lineNum, type: 'NO_SIZE_PASSTHROUGH',
      msg: 'this.nodes.size is undefined — NodeManager has no .size. Use this.nodes.nodes.size',
      text: trimmed,
    });
  }

  // ── Warning: this.nodes.X where X is not in NM_PASSTHROUGH ──────────────────
  const accesses = [...line.matchAll(/this\.nodes\.(?!nodes\.)([a-zA-Z_$][\w$]*)/g)];
  accesses.forEach(m => {
    const prop = m[1];
    if (!NM_PASSTHROUGH.has(prop)) {
      warnings.push({
        line: lineNum, type: 'UNVERIFIED_ACCESS',
        msg: `this.nodes.${prop} — verify NodeManager exposes this`,
        text: trimmed,
      });
    }
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
const tripleCount = (content.match(/this\.nodes\.nodes\.nodes\./g) || []).length;
const innerMapCount = (content.match(/this\.nodes\.nodes\./g) || []).length;
const directCount = (content.match(/this\.nodes\.(?!nodes\.)/g) || []).length;

console.log(`\n${'═'.repeat(63)}`);
console.log(`  FeastArchitect — Node Access Audit`);
console.log(`${'═'.repeat(63)}`);
console.log(`  File: ${FILE}  (${lines.length} lines)\n`);
console.log(`  Access pattern distribution:`);
console.log(`    this.nodes.nodes.*   (direct internal Map) : ${innerMapCount}`);
console.log(`    this.nodes.*         (NodeManager or pass) : ${directCount}`);
if (tripleCount > 0) {
  console.log(`    this.nodes.nodes.nodes.* (TRIPLE — BUG!)  : ${tripleCount}  ← ❌`);
}

if (issues.length === 0) {
  console.log('\n✅  No critical node access issues');
} else {
  console.log(`\n❌  CRITICAL ISSUES (${issues.length}):`);
  issues.forEach(issue => {
    console.log(`\n   L${issue.line} [${issue.type}]`);
    console.log(`   → ${issue.msg}`);
    console.log(`   → ${issue.text.slice(0, 100)}`);
  });
}

// Deduplicate warnings by prop name
const warnsByProp = {};
warnings.forEach(w => {
  const m = w.msg.match(/this\.nodes\.(\w+)/);
  if (m) (warnsByProp[m[1]] = warnsByProp[m[1]] || []).push(w);
});

if (Object.keys(warnsByProp).length > 0) {
  console.log(`\n⚠️  UNVERIFIED ACCESS PATTERNS (check NodeManager source):`);
  Object.entries(warnsByProp).forEach(([prop, ws]) => {
    console.log(`   this.nodes.${prop}  (${ws.length} occurrence${ws.length > 1 ? 's' : ''} — first at L${ws[0].line})`);
  });
}

console.log(`\n${'─'.repeat(63)}`);
console.log(`  NodeManager passthroughs: ${[...NM_PASSTHROUGH].join(', ')}`);
console.log(`${'─'.repeat(63)}\n`);

process.exit(issues.length > 0 ? 1 : 0);
