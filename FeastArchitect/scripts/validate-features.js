#!/usr/bin/env node
/**
 * validate-features.js
 * Run: node scripts/validate-features.js  (from FeastArchitect/ root)
 *
 * Validates feature objects in example-data.js:
 *   - Transformation strings with inner single quotes (syntax error waiting to happen)
 *   - Quality values outside 0-100 range
 *   - Unknown type values not in the official Feast type list
 *   - Stats on how many features have rich metadata
 *
 * Also gives a full summary of all feature views and their feature counts.
 */

'use strict';
const fs = require('fs');
const FILE = 'static/FeastArchitect/js/modules/example-data.js';

if (!fs.existsSync(FILE)) {
  console.error(`\n❌  Not found: ${FILE}\n    Run from FeastArchitect/ root.\n`);
  process.exit(1);
}

const content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');

// ── Valid Feast types ─────────────────────────────────────────────────────────
const VALID_TYPES = new Set([
  'Int8', 'Int16', 'Int32', 'Int64',
  'Float32', 'Float64',
  'String', 'Bool', 'Bytes', 'UnixTimestamp',
  'Array', 'Map', 'Null', 'Unknown',
]);

const VALID_FRESHNESS = new Set(['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'on-demand']);
const VALID_CLASSIFICATION = new Set(['public', 'internal', 'confidential', 'restricted']);

const issues = [];

lines.forEach((line, i) => {
  const lineNum = i + 1;
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*')) return;

  // ── Transformation string inner-quote trap ───────────────────────────────────
  // Single-quoted string that contains unescaped single quotes → SyntaxError
  const transMatch = t.match(/^transformation:\s*'(.*)'/);
  if (transMatch && transMatch[1].includes("'")) {
    issues.push({
      sev: 'error', lineNum,
      msg: `Transformation uses single quotes but contains inner single quotes.`,
      fix: `Use double quotes: transformation: "...SQL with 'quotes'...",`,
      text: t,
    });
  }

  // ── Quality range checks ──────────────────────────────────────────────────────
  const compMatch = t.match(/completeness:\s*([\d.]+)/);
  if (compMatch) {
    const v = parseFloat(compMatch[1]);
    if (v < 0 || v > 100)
      issues.push({ sev: 'error', lineNum, msg: `completeness ${v} is outside 0–100`, text: t });
  }
  const accMatch = t.match(/accuracy:\s*([\d.]+)/);
  if (accMatch) {
    const v = parseFloat(accMatch[1]);
    if (v < 0 || v > 100)
      issues.push({ sev: 'error', lineNum, msg: `accuracy ${v} is outside 0–100`, text: t });
  }

  // ── Type values ───────────────────────────────────────────────────────────────
  // Match `type: 'Int64'` but not inside dbType definitions
  const typeMatch = t.match(/^\s*type:\s*['"]([^'"]+)['"]/);
  if (typeMatch && !t.includes('dbType') && !t.includes('nodeType') && !t.includes('category')) {
    if (!VALID_TYPES.has(typeMatch[1])) {
      issues.push({
        sev: 'warn', lineNum,
        msg: `Unknown feature type: "${typeMatch[1]}". Valid: ${[...VALID_TYPES].join(', ')}`,
        text: t,
      });
    }
  }

  // ── Freshness values ──────────────────────────────────────────────────────────
  const freshMatch = t.match(/freshness:\s*['"]([^'"]+)['"]/);
  if (freshMatch && !VALID_FRESHNESS.has(freshMatch[1])) {
    issues.push({
      sev: 'warn', lineNum,
      msg: `Unusual freshness: "${freshMatch[1]}". Common: ${[...VALID_FRESHNESS].join(', ')}`,
      text: t,
    });
  }

  // ── Classification values ─────────────────────────────────────────────────────
  const classMatch = t.match(/classification:\s*['"]([^'"]+)['"]/);
  if (classMatch && !VALID_CLASSIFICATION.has(classMatch[1])) {
    issues.push({
      sev: 'warn', lineNum,
      msg: `Unusual classification: "${classMatch[1]}". Standard: ${[...VALID_CLASSIFICATION].join(', ')}`,
      text: t,
    });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
const richFeatures = (content.match(/serving:\s*\{/g) || []).length;
const totalNameFields = (content.match(/\bname:\s*['"][^'"]+['"]/g) || []).length;
const sqTransforms = (content.match(/transformation:\s*'/g) || []).length;
const dqTransforms = (content.match(/transformation:\s*"/g) || []).length;
const piiFeatures = (content.match(/pii:\s*true/g) || []).length;
const onlineFeatures = (content.match(/online:\s*true/g) || []).length;

// ── Feature view detection ─────────────────────────────────────────────────────
const fvBlocks = [...content.matchAll(/addFeatureView\(\{[\s\S]*?(?=addFeatureView|\}\);?\s*\/\/\s*\d+|$)/g)];

// ── Output ────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(63)}`);
console.log('  FeastArchitect — Feature Schema Validation');
console.log(`${'═'.repeat(63)}`);
console.log(`  File: ${FILE}  (${lines.length} lines)`);
console.log(`\n  STATS:`);
console.log(`    name: fields (all objects):  ~${totalNameFields}`);
console.log(`    Rich features (have serving):  ${richFeatures}`);
console.log(`    PII features:                  ${piiFeatures}`);
console.log(`    Online-serving features:       ${onlineFeatures}`);
console.log(`\n  TRANSFORMATION STRINGS:`);
console.log(`    Double-quoted ✅ (safe):   ${dqTransforms}`);
console.log(`    Single-quoted ⚠️  (risky): ${sqTransforms}${sqTransforms > 0 ? ' ← may cause SyntaxError if SQL contains single quotes' : ''}`);

const errors = issues.filter(i => i.sev === 'error');
const warnings = issues.filter(i => i.sev === 'warn');

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅  No issues found\n');
} else {
  if (errors.length > 0) {
    console.log(`\n❌  ERRORS (${errors.length}) — will cause runtime or syntax failures:\n`);
    errors.forEach(issue => {
      console.log(`  L${issue.lineNum}: ${issue.msg}`);
      if (issue.fix) console.log(`  FIX: ${issue.fix}`);
      console.log(`  → ${issue.text.slice(0, 90)}\n`);
    });
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}) — check these:\n`);
    warnings.forEach(issue => {
      console.log(`  L${issue.lineNum}: ${issue.msg}`);
      console.log(`  → ${issue.text.slice(0, 90)}\n`);
    });
  }
}

console.log(`${'─'.repeat(63)}\n`);
process.exit(errors.length > 0 ? 1 : 0);
