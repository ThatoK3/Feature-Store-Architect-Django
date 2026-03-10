#!/usr/bin/env node
/**
 * audit-methods.js
 * Run: node scripts/audit-methods.js  (from FeastArchitect/ root)
 *
 * Reports:
 *   - Stub methods (≤4 lines) — likely truncated during monolith split
 *   - Duplicate method names — will silently shadow each other in JS classes
 *   - Missing critical methods — things that will 100% break the app
 *   - Largest methods — refactoring candidates
 *   - Full categorized method inventory with line numbers
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

// ─── Extract methods ──────────────────────────────────────────────────────────
const methods = [];
let cur = null, startLine = 0, depth = 0, inMethod = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!inMethod) {
    const m = line.match(/^    ([a-zA-Z_$][\w$]*)\s*\(/);
    if (m) { cur = m[1]; startLine = i + 1; inMethod = true; depth = 0; }
  }
  if (inMethod) {
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > startLine) {
      methods.push({ name: cur, L: startLine, end: i + 1, lines: i - startLine + 1 });
      inMethod = false;
    }
  }
}

// ─── Checks ───────────────────────────────────────────────────────────────────
const CRITICAL = [
  'constructor', 'initializeModules', 'init', 'loadInitialData',
  'showPanel', 'closePanel', 'selectNode', 'deleteSelected',
  'showFeatureBrowser', 'showAddModal', 'showEditModal',
  '_buildFeatureExplorer', '_buildFeatureCard', '_buildRichFeatureCard',
  '_fbFilter', '_fbBindFilters',
  '_openFeatureModal', '_closeFeatureModal', '_switchFdmTab', '_renderFdmTab',
  '_toggleFeatureEdit', '_renderFdmEditForm', '_saveFeatureEdit',
  '_showFeatPopover', '_hideFeatPopover', '_showFbPopover',
  '_buildNodeDetails', '_buildDatasourceRight', '_buildEntityRight',
  '_showColPopover', '_bindFeatureExplorer', '_filterFeatures',
  '_setupPanelForNode',
  'drawNode', 'drawEdges', 'drawNodeContent', 'drawFeatureViewContent',
  'drawNodePorts',
  'render', 'renderMiniMap', 'animate',
  'onMouseDown', 'onMouseMove', 'onMouseUp', 'onWheel', 'onDoubleClick',
  'bindEvents', 'setupSearch', 'setupKeyboardShortcuts',
  'openModal', 'saveComponent', 'closeModal',
  'generateCodeExample', 'generateFeatureViewCode',
  'exportToJSON', 'importFromJSON', 'export',
  'updateStats', 'updateCodeEditor',
  'autoLayout', 'fit', 'animateFit', 'screenToWorld',
  'getSubtypeColor', 'getUsedByCount', 'getPortPosition', 'getBounds',
  'getCsrfToken', 'showNotification', 'showTooltip', 'hideTooltip',
];

const nameSet = new Set(methods.map(m => m.name));
const missing = CRITICAL.filter(n => !nameSet.has(n));

const seen = {};
const duplicates = [];
methods.forEach(m => { if (seen[m.name]) duplicates.push(m.name); seen[m.name] = true; });

const stubs = methods.filter(m => m.lines <= 4);
const small = methods.filter(m => m.lines > 4 && m.lines <= 10);

// ─── Categorize ───────────────────────────────────────────────────────────────
function categorize(name) {
  if (name.startsWith('_fb')) return 'feature-browser';
  if (['_openFeatureModal','_closeFeatureModal','_switchFdmTab','_renderFdmTab',
       '_toggleFeatureEdit','_renderFdmEditForm','_saveFeatureEdit'].includes(name)) return 'feature-modal';
  if (name.startsWith('_build') || name.startsWith('_show') || name.startsWith('_hide') ||
      name.startsWith('_filter') || name.startsWith('_bind')) return 'ui-helpers';
  if (name.startsWith('draw')) return 'canvas-draw';
  if (name.startsWith('render')) return 'canvas-render';
  if (name.startsWith('generate')) return 'code-gen';
  if (name.startsWith('show') || name.startsWith('close')) return 'show-close';
  if (name.startsWith('add')) return 'add-nodes';
  if (name.startsWith('toggle')) return 'toggle';
  if (name.startsWith('update')) return 'update';
  if (name.match(/^on[A-Z]/)) return 'events';
  return 'core';
}

const groups = {};
methods.forEach(m => {
  const cat = categorize(m.name);
  (groups[cat] = groups[cat] || []).push(m);
});

// ─── Output ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(63)}`);
console.log(`  FeastArchitect — Method Audit: feast-diagram.js`);
console.log(`${'═'.repeat(63)}`);
console.log(`  Total: ${methods.length} methods  |  ${lines.length} lines  |  ${FILE}`);

// Stubs
if (stubs.length > 0) {
  console.log(`\n⚠️  STUB METHODS (≤4 lines — likely truncated during split):`);
  stubs.forEach(m => console.log(`   L${String(m.L).padStart(5)}  ${m.name.padEnd(48)} ${m.lines} lines`));
} else {
  console.log('\n✅  No stub methods detected');
}

// Duplicates
if (duplicates.length > 0) {
  console.log(`\n❌  DUPLICATE METHOD NAMES (will silently shadow each other):`);
  duplicates.forEach(n => console.log(`   ${n}`));
} else {
  console.log('✅  No duplicate method names');
}

// Missing
if (missing.length > 0) {
  console.log(`\n❌  MISSING CRITICAL METHODS (${missing.length}):`);
  missing.forEach(n => console.log(`   ${n}`));
} else {
  console.log('✅  All critical methods present');
}

// Largest
console.log(`\n  LARGEST METHODS (refactoring candidates):`);
[...methods].sort((a, b) => b.lines - a.lines).slice(0, 12).forEach(m => {
  const bar = '█'.repeat(Math.min(Math.floor(m.lines / 25), 28));
  console.log(`   L${String(m.L).padStart(5)}  ${m.name.padEnd(42)} ${String(m.lines).padStart(4)} lines  ${bar}`);
});

// Full inventory by category
console.log(`\n${'─'.repeat(63)}`);
console.log(`  FULL METHOD INVENTORY BY CATEGORY`);
console.log(`${'─'.repeat(63)}`);
for (const [cat, ms] of Object.entries(groups).sort()) {
  console.log(`\n  [${cat}] (${ms.length} methods)`);
  ms.forEach(m => {
    const stub = m.lines <= 4 ? ' ⚠️' : '';
    console.log(`    L${String(m.L).padStart(5)}  ${m.name.padEnd(48)} ${m.lines} lines${stub}`);
  });
}
console.log(`\n${'═'.repeat(63)}\n`);
