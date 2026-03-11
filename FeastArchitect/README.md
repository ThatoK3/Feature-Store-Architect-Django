# FeastArchitect — Complete LLM Developer Reference

> **If you are an LLM or developer picking up this codebase:**  
> Read this entire document before modifying any file. It contains hard-won knowledge
> from multiple full development sessions, including every significant bug pattern
> encountered, how every system works, and exactly where to go to add anything.
> Ignoring it will cost you hours.

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [Project File Map](#2-project-file-map)
3. [Startup & Boot Flow](#3-startup--boot-flow)
4. [Module Architecture](#4-module-architecture)
5. [The Node Data Model](#5-the-node-data-model)
6. [⚠️ The NodeManager/Map Distinction — Most Common Bug](#6-️-the-nodemanagermap-distinction--most-common-bug)
7. [⚠️ The Canvas Proxy Pattern](#7-️-the-canvas-proxy-pattern)
8. [The Feature Metadata System](#8-the-feature-metadata-system)
9. [The Detail Panel System](#9-the-detail-panel-system)
10. [The Feature Catalog Browser](#10-the-feature-catalog-browser)
11. [The Feature Detail Modal](#11-the-feature-detail-modal)
12. [The Hover Popover System](#12-the-hover-popover-system)
13. [The Canvas Highlight System](#13-the-canvas-highlight-system)
14. [The Stats Bar](#14-the-stats-bar)
15. [The LLM Assistant Panel](#15-the-llm-assistant-panel)
16. [Canvas & Rendering](#16-canvas--rendering)
17. [DOM ID Reference](#17-dom-id-reference)
18. [CSS Architecture](#18-css-architecture)
19. [JSON Import/Export Format](#19-json-importexport-format)
20. [Django Integration](#20-django-integration)
21. [Keyboard Shortcuts](#21-keyboard-shortcuts)
22. [⚠️ All Known Bug Patterns](#22-️-all-known-bug-patterns)
23. [How-To Patterns for Common Tasks](#23-how-to-patterns-for-common-tasks)
24. [Method Index](#24-method-index)
25. [Diagnostic Scripts](#25-diagnostic-scripts)

---

## 1. What This Project Is

FeastArchitect is a **browser-based visual diagram editor** for designing [Feast](https://feast.dev/) feature store architectures. It is a Django app that serves a single-page canvas tool.

**What users do:**
- Drag, drop, and connect four node types: Data Source, Entity, Feature View, Feature Service
- Inspect any node in a rich side panel that shows metadata, lineage, schema, and features
- Browse, search, and filter **all features** across every Feature View in a global catalog
- Click any feature to view/edit its full rich metadata (descriptions, types, tags, serving config, quality metrics, statistics, security classification, transformation SQL, and more)
- Hover over features in the catalog to highlight which nodes on the canvas are affected
- Generate Python/YAML Feast code from the diagram
- Ask an LLM assistant about the architecture (draggable, resizable floating panel)

**Tech stack:**
- Backend: Django (templates + REST API at `/api/`)
- Frontend: Vanilla JS ES6 classes, no bundler, no framework, no TypeScript
- Canvas: HTML5 Canvas 2D API
- Styles: CSS custom properties in one `main.css` file (~5000+ lines)
- Fonts: JetBrains Mono (monospace), Inter (body) — loaded from Google Fonts in `base.html`

---

## 2. Project File Map

```
FeastArchitect/
│
├── README.md                               ← THIS FILE
├── scripts/                                ← Diagnostic tools (run from project root)
│   ├── check-syntax.sh
│   ├── audit-methods.js
│   ├── audit-node-access.js
│   ├── find.js
│   ├── audit-css.js
│   └── validate-features.js
│
├── static/FeastArchitect/
│   ├── css/
│   │   └── main.css                        ← ALL styles (5000+ lines, one file)
│   ├── images/
│   │   ├── disc-logo.png
│   │   └── favicon.ico
│   └── js/
│       ├── main.js                         ← Entry point → new FeastDiagram('diagramCanvas')
│       ├── modules-loader.js               ← Sequential script loader (ORDER MATTERS)
│       └── modules/
│           ├── config.js                   ← NODE_CONFIG, DIMENSIONS, DATABASE_TYPES
│           ├── utils.js                    ← Pure utility functions
│           ├── api.js                      ← APIClient (all HTTP/fetch)
│           ├── canvas-renderer.js          ← CanvasRenderer (owns ctx, scale, offsets)
│           ├── node-manager.js             ← NodeManager (wraps the nodes Map)
│           ├── layout-manager.js           ← LayoutManager (auto-layout algorithms)
│           ├── search-manager.js           ← SearchManager (search state/config)
│           ├── ui-manager.js               ← UIManager (DOM helpers, notifications)
│           ├── code-generator.js           ← CodeGenerator (Python/YAML output)
│           ├── llm-helper.js               ← LLMHelper (LLM panel and API)
│           ├── example-data.js             ← loadComplexExample(nodes, connect, layout)
│           └── feast-diagram.js            ← FeastDiagram class — THE MAIN FILE (6700+ lines)
│
└── templates/FeastArchitect/
    ├── architect.html                      ← Main page (extends base.html)
    ├── base.html                           ← Layout shell, loads CSS/JS, has #featHoverPopover
    ├── includes/
    │   ├── _django_context.html            ← Injects window.DJANGO_CONTEXT from Django
    │   └── _styles.html                    ← Additional inline <style> blocks
    └── components/
        ├── _canvas_area.html               ← <canvas id="diagramCanvas"> + stats bar
        ├── _detail_panel.html              ← #detailPanel (right side panel)
        ├── _toolbar.html                   ← Top toolbar buttons
        ├── _tooltip.html                   ← Canvas hover tooltip (#tooltip)
        ├── _modals.html                    ← Includes all modal partials
        ├── _fab_menu.html                  ← Floating action button
        ├── _llm_panel.html                 ← LLM assistant floating panel
        ├── _code_editor_panel.html         ← Generated code output panel
        ├── _django_panel.html              ← Django admin info panel
        ├── _edge_manager_panel.html        ← Edge/connection manager panel
        ├── _quick_actions.html             ← Quick action buttons
        ├── guide/                          ← User guide modal partials
        └── modals/
            ├── _component_modal.html       ← Add/Edit node modal (#componentModal)
            ├── _feature_detail_modal.html  ← Feature view/edit modal (#featureDetailModal)
            ├── _settings_modal.html
            ├── _stats_modal.html
            ├── _usage_modal.html
            ├── _data_flow_modal.html
            ├── _user_selector_modal.html
            └── _push_repo_modal.html
```

---

## 3. Startup & Boot Flow

```
base.html
  └── loads modules-loader.js
        └── loads modules in order (sequential, async=false):
              config.js → utils.js → api.js → canvas-renderer.js →
              node-manager.js → layout-manager.js → search-manager.js →
              ui-manager.js → code-generator.js → llm-helper.js →
              example-data.js → feast-diagram.js → main.js

main.js
  └── window.diagram = new FeastDiagram('diagramCanvas')

FeastDiagram constructor
  ├── initializeModules()      → creates this.renderer, this.nodes, this.ui, etc.
  ├── Object.defineProperties  → proxies ctx/scale/offsets to this.renderer
  ├── sets application state   → selectedNode, isDragging, visibleLayers, theme
  └── this.init()
        ├── renderer.resize(container)
        ├── bindEvents()
        ├── setupSearch()
        ├── setupKeyboardShortcuts()
        ├── renderer.setupMiniMap(...)
        ├── ui.updateRepoSubtitle(repoSettings)
        ├── updateStats()
        ├── initializeUser()         ← reads window.DJANGO_CONTEXT
        ├── loadInitialData()        ← if repoId: load from backend, else: loadComplexExample()
        └── animate()                ← starts requestAnimationFrame render loop
```

**No repo scenario:** `loadInitialData()` calls `loadComplexExample(this.nodes, connectFn, layoutFn)` which is the standalone function exported by `example-data.js`. It creates a full multi-FV architecture with rich feature metadata.

**With repo:** `loadInitialData()` calls `this.loadFromBackend()` which fetches from the Django API.

---

## 4. Module Architecture

```
window.diagram = FeastDiagram instance
│
├── this.nodes       → NodeManager        ← The node store (wraps a Map)
├── this.renderer    → CanvasRenderer     ← Canvas ctx, scale, pan, zoom, minimap
├── this.ui          → UIManager          ← DOM helpers, notifications, tooltips
├── this.api         → APIClient          ← All fetch() calls to /api/
├── this.codeGen     → CodeGenerator      ← Generates Python/YAML from node data
├── this.llm         → LLMHelper          ← LLM panel, prompt building, API calls
├── this.search      → SearchManager      ← Search settings and filter state
└── this.layout      → LayoutManager      ← Auto-layout algorithm
```

**Accessing modules from within FeastDiagram methods:** always `this.renderer`, `this.nodes`, etc.

**Accessing from HTML onclick handlers:** `diagram.method()` (window.diagram is global).

**Module dependencies:** Modules are independent classes. They do NOT import each other. FeastDiagram wires them together in `initializeModules()` and passes references when needed.

---

## 5. The Node Data Model

There are exactly **4 node types**. The `type` field is always one of: `datasource`, `entity`, `featureview`, `service`.

### Universal fields (all 4 types)

```js
{
  id: 'featureview_1',            // Generated by NodeManager.generateId()
  type: 'featureview',            // 'datasource' | 'entity' | 'featureview' | 'service'
  name: 'User Demographics',
  description: '',
  tags: ['pii', 'batch'],
  details: { notes: '...', ttl: '86400', usedBy: [] },
  x: 120,                         // Canvas world position
  y: 200,
  inputs: ['entity_1'],           // IDs of upstream nodes (maintained by addConnection)
  outputs: ['service_1'],         // IDs of downstream nodes
  createdAt: '2025-01-01T00:00:00.000Z'
}
```

### Type-specific fields

```js
// featureview
{
  subtype: 'batch',               // 'batch' | 'stream' | 'push' | 'on-demand'
  entities: ['entity_1'],         // IDs of entity nodes this FV uses
  features: [ /* array of feature objects — see Section 8 */ ]
}

// entity
{
  joinKey: 'user_id'
}

// datasource
{
  kind: 'postgres',               // key into DATABASE_TYPES
  dbType: { name:'PostgreSQL', icon:'🐘', category:'RDBMS', debezium:true, ... },
  ownedBy: 'Platform Team',
  accessProcess: '...',           // How to request access
  debeziumAvailable: true,        // From dbType
  sparkPattern: 'JDBC batch',     // From dbType
  columnSecurity: { ... }         // Generated default column security object
}

// service
{
  features: ['featureview_1', 'featureview_2'],    // ⚠️ IDs of FV nodes (NOT feature objects!)
  featureServices: []                               // Other service IDs composed in
}
```

### ⚠️ CRITICAL: service.features contains FV IDs, not features

`node.features` on a **Feature Service** node is an array of **Feature View node IDs** (strings like `"featureview_1"`), NOT an array of feature objects. This is the opposite of what `node.features` means on a Feature View node (where it's an array of rich feature objects).

This distinction caused a bug where the panel was displaying raw IDs like `featureview_1` as feature names. Always check `node.type` before iterating `node.features`.

```js
// Correct pattern for iterating features:
if (node.type === 'featureview') {
    node.features.forEach(f => { /* f is a feature object with f.name, f.type, etc. */ });
} else if (node.type === 'service') {
    node.features.forEach(fvId => {
        const fv = this.nodes.nodes.get(fvId);  // ← look up the actual FV node
        if (!fv) return;
        // fv.name is the FV's name, fv.features.length is its feature count
    });
}
```

### Edge structure

Edges live on `this.nodes.edges` (an Array on NodeManager, NOT inside the Map):

```js
this.nodes.edges = [
  { id: 'entity_1->featureview_1', from: 'entity_1', to: 'featureview_1', animated: false },
  ...
]
```

Note: edges use `from`/`to` (not `source`/`target`).

### Node config (from `config.js`)

```js
NODE_CONFIG = {
  datasource:  { bg: '#1e3a2f', light: '#34d399', icon: '🗄️',  label: 'Data Source' },
  entity:      { bg: '#1a2e4a', light: '#60a5fa', icon: '🔑',  label: 'Entity' },
  featureview: { bg: '#2d1f3d', light: '#a78bfa', icon: '📊',  label: 'Feature View' },
  service:     { bg: '#3a1f1f', light: '#f87171', icon: '⚙️',  label: 'Feature Service' }
}
// accessed as: this.config.colors[node.type]
// fields: .bg, .light, .icon, .label
```

---

## 6. ⚠️ The NodeManager/Map Distinction — Most Common Bug

This is the **#1 source of bugs** in this codebase. Read carefully.

`this.nodes` is a **`NodeManager` instance**, NOT a Map. NodeManager wraps an internal Map called `this.nodes` internally (same name from inside NodeManager, accessed as `this.nodes.nodes` from outside).

### Correct access patterns

```js
// ── ITERATING / LOOKING UP ─────────────────────────────────────────────────
this.nodes.nodes.get(id)            // ✅ get one node
this.nodes.nodes.has(id)            // ✅ existence check
this.nodes.nodes.set(id, node)      // ✅ direct set (rare — prefer addFeatureView etc.)
this.nodes.nodes.forEach((node, id) => { ... })  // ✅ iterate all
this.nodes.nodes.values()           // ✅ iterator of all nodes
this.nodes.nodes.entries()          // ✅ iterator of [id, node] pairs
this.nodes.nodes.size               // ✅ count
this.nodes.nodes.clear()            // ✅ remove all
this.nodes.nodes.delete(id)         // ✅ remove one

// NodeManager also has passthrough delegates for the most common calls:
this.nodes.get(id)                  // ✅ delegates to .nodes.get(id)
this.nodes.has(id)                  // ✅ delegates
this.nodes.forEach(fn)              // ✅ delegates

// ── CREATING NODES ──────────────────────────────────────────────────────────
this.nodes.addDataSource(config)    // ✅ returns new ID string
this.nodes.addEntity(config)        // ✅ returns new ID string
this.nodes.addFeatureView(config)   // ✅ returns new ID string, auto-connects entities
this.nodes.addService(config)       // ✅ returns new ID string, auto-connects FVs

// ── EDGES ───────────────────────────────────────────────────────────────────
this.nodes.addConnection(fromId, toId) // ✅ adds edge, updates inputs/outputs
this.nodes.edges                       // ✅ the edges Array

// ── OTHER NodeManager properties ─────────────────────────────────────────────
this.nodes.databaseTypes            // ✅ DATABASE_TYPES config object
this.nodes.counters                 // ✅ ID generation counters
```

### The bugs to avoid

```js
// ❌ .size has no passthrough — returns undefined
this.nodes.size

// ❌ Triple dereference from bad regex replace
this.nodes.nodes.nodes.get(id)

// ❌ forEach on NodeManager when NodeManager doesn't have that passthrough method
// (check NodeManager source before assuming it has a passthrough)

// ❌ Iterating with for...of — Map iterator not exposed
for (const node of this.nodes) { }   // will fail
```

### Why this happens

The project was migrated from a monolith where `this.nodes` WAS the Map directly. The refactor wrapped it in NodeManager. Most code was updated but if you run a find-and-replace like `this\.nodes\.` → `this.nodes.nodes.`, you will create triple dereferences on lines that already had `this.nodes.nodes.`. Always use the negative lookahead:

```
Find:    this\.nodes\.(?!nodes\.)
Replace: this.nodes.nodes.
```

---

## 7. ⚠️ The Canvas Proxy Pattern

`CanvasRenderer` owns all canvas state. The `FeastDiagram` constructor uses `Object.defineProperties` to proxy 8 properties from `this` to `this.renderer`, so legacy code using `this.ctx`, `this.scale`, etc. still works:

```js
// In FeastDiagram constructor:
const r = this.renderer;
Object.defineProperties(this, {
  ctx:           { get() { return r.ctx; },           set(v) { r.ctx = v; } },
  scale:         { get() { return r.scale; },         set(v) { r.scale = v; } },
  offsetX:       { get() { return r.offsetX; },       set(v) { r.offsetX = v; } },
  offsetY:       { get() { return r.offsetY; },       set(v) { r.offsetY = v; } },
  width:         { get() { return r.width; },         set(v) { r.width = v; } },
  height:        { get() { return r.height; },        set(v) { r.height = v; } },
  miniMapCtx:    { get() { return r.miniMapCtx; },    set(v) { r.miniMapCtx = v; } },
  miniMapCanvas: { get() { return r.miniMapCanvas; }, set(v) { r.miniMapCanvas = v; } },
});
```

**Rules:**
- Inside `FeastDiagram` methods: `this.ctx` and `this.renderer.ctx` are equivalent — both work
- If `this.ctx` is ever `undefined`, the proxy block has been removed or corrupted — check the constructor
- When passing canvas context to helper functions: use `this.renderer.ctx` explicitly
- **Never** try to directly assign `this.renderer = something` — the proxy will break

---

## 8. The Feature Metadata System

Features live in `node.features[]` on **featureview** nodes only. Service nodes store FV IDs there, not feature objects (see Section 5). The system supports two formats — old simple and new rich — simultaneously.

### Full rich feature schema

```js
{
  // Required
  name: 'user_age',
  type: 'Int64',                          // See type list below

  // Optional metadata
  description: 'User age derived from birth_date',
  tags: ['demographic', 'pii'],
  owner: 'Platform Team',
  sourceColumn: 'birth_date',
  defaultValue: '0',
  transformation: "EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))",

  // Nested objects — all optional
  validation: {
    min: 0,
    max: 150,
    nullable: false
  },
  serving: {
    online: true,
    offline: true,
    ttl: 86400                            // seconds
  },
  security: {
    pii: true,
    sensitive: false,
    classification: 'internal'            // 'public'|'internal'|'confidential'|'restricted'
  },
  quality: {
    freshness: 'daily',                   // 'realtime'|'hourly'|'daily'|'weekly'|'monthly'
    completeness: 98.5,                   // 0-100
    accuracy: 99.9                        // 0-100
  },
  statistics: {
    mean: 34.5,
    stdDev: 12.3,
    min: 0,
    max: 150,
    nullCount: 120,
    distinctCount: 89234,
    totalCount: 1000000
  }
}
```

### Old simple format (still works everywhere)

```js
{ name: 'country', type: 'String' }
```

All display code checks `typeof f === 'string'` (even older format) and `f.name`/`f.type` before accessing nested fields.

### Feature type → color mapping

This mapping is **duplicated in 4 places** in `feast-diagram.js`. If you add a new type, update all 4:
- `_buildFeatureCard` (compact FV panel card)
- `_buildRichFeatureCard` (catalog card)
- `_openFeatureModal` (modal header dot)
- `_showFeatPopover` (hover popover dot)

```js
const typeColors = {
  'Int8': '#60a5fa',  'Int16': '#60a5fa',  'Int32': '#60a5fa',  'Int64': '#60a5fa',
  'Float32': '#f59e0b',  'Float64': '#f59e0b',
  'String': '#a78bfa',
  'Bool': '#34d399',
  'Bytes': '#fb923c',
  'UnixTimestamp': '#f472b6',
  // fallback: '#64748b'
};
```

### ⚠️ Transformation string quoting

SQL transformations often contain single quotes. Always use **double quotes** for the outer JS string:

```js
// ✅ Correct
transformation: "SUM(total) FILTER (WHERE status = 'completed')",

// ❌ Syntax error — parser sees unmatched quotes
transformation: 'SUM(total) FILTER (WHERE status = 'completed')',
```

### Feature display hierarchy

```
Canvas node (drawFeatureViewContent)
  └── shows: feature count badge

Canvas tooltip (showTooltip)
  └── shows: first 4 feature names, PII/online/offline counts
      NOTE: only shown for featureview nodes (service tooltip does NOT list features)

Detail Panel — Feature Explorer (below node details when FV/service selected)
  └── _buildFeatureExplorer(node, nodeId)
      ├── featureview: renders _buildFeatureCard(f, idx, nodeId) per feature
      │     ├── colored dot (clickable) → _highlightFeatureUsage()    ← canvas glow
      │     ├── feature name (clickable) → _openFeatureModal()
      │     ├── ✏️ edit icon (hover) → _openFeatureModal()
      │     └── hover → _showFeatPopover()                            ← rich popover
      └── service: renders FV name cards (NOT feature objects!)
            └── click → selectNode(fvId)                              ← navigate to FV

Feature Catalog — showFeatureBrowser()
  └── ALL features from ALL FVs in one scrollable list
      └── _buildRichFeatureCard(f, idx, nodeId, nodeName, nodeSubtype)
          ├── hover → _highlightCanvasNodes(nodeId)  ← canvas glow on FV + services
          ├── hover → _showFbPopover() → _showFeatPopover()
          └── click → _openFeatureModal()
```

---

## 9. The Detail Panel System

The right-side panel (`#detailPanel`) has **two distinct modes** controlled by CSS classes.

### Mode 1: Node View (default)

Activated by: `showPanel(nodeId)`

```
#detailPanel  ← has classes: open, wide
  │
  ├── #panelFbHeader   (display: none)
  ├── #panelNodeHeader (display: '')
  │     ├── #panelBadge (icon + type label)
  │     ├── #panelTitle, #panelSubtitle, #panelTags
  │     └── buttons: [⚡ All Features] [✏️ Edit] [🗑️ Delete] [✕ Close]
  │
  └── #panelContent   ← single scrollable column
        ├── _buildNodeDetails()       ← details section (same CSS classes as always)
        └── type-specific content appended below:
              featureview/service  → _buildFeatureExplorer()
              datasource           → _buildDatasourceRight()
              entity               → _buildEntityRight()
```

**IMPORTANT — Single Column Layout:** The panel is now a **single scrollable column** (NOT two side-by-side columns). The `wide` class is still used (width 560px) so the panel is not narrow, but `panel-wide-layout` is now `display: block` instead of `display: flex`. Both `_buildNodeDetails` and the type-specific right-col content stack vertically in `#panelContent`.

**How `showPanel` works:**
```js
showPanel(id) {
    // ... sets header text, subtitle, tags
    panel.classList.add('wide');             // ← always added (width = 560px)
    contentEl.innerHTML = this._buildSingleColPanel(id, node, config, icon);
    this._bindFeatureExplorer(node, id);
    panel.classList.add('open');
}

_buildSingleColPanel(id, node, config, icon) {
    let html = this._buildNodeDetails(id, node, config, icon);   // ← original left-col content
    // appends right-col content below it:
    if (node.type === 'featureview' || ...) html += this._buildFeatureExplorer(node, id);
    else if (node.type === 'datasource')    html += this._buildDatasourceRight(node, id);
    else if (node.type === 'entity')        html += this._buildEntityRight(node, id);
    return html;
}
```

### Mode 2: Feature Catalog (global all-features browser)

Activated by: `showFeatureBrowser()` (triggered by ⚡ All Features button)

```
#detailPanel  ← has classes: open, fb-mode  (removes wide)
  │
  ├── #panelFbHeader   (display: '')
  │     └── "Feature Catalog / N Features"
  │
  └── #panelContent
        └── .fb-layout
              ├── .fb-search-bar  (#fbSearchInput, #fbStats)
              ├── .fb-filter-row  (#fbFilters — type pills, owner pills, PII, online, offline)
              └── #fbList         ← one .rfc card per feature from ALL FVs
```

### Panel CSS classes

| Class | Width | Usage |
|---|---|---|
| `.side-panel` | 420px | base (hidden, translated off-screen) |
| `.side-panel.open` | 420px | visible |
| `.side-panel.wide` | 560px | node view (single wide column) |
| `.side-panel.fb-mode` | 900px | feature catalog (full width) |

`closePanel()` removes **all three** active classes plus resets headers.

### The ⚡ All Features button

- DOM: `#panelFeatCatalogBtn` in `_detail_panel.html`
- CSS class: `.catalog-btn` (green tinted style)
- Visibility: hidden by default, shown by `_setupPanelForNode(node)` when any node is selected
- Action: calls `diagram.showFeatureBrowser()`

### _setupPanelForNode(node)

Called at the top of `showPanel()`. Shows `#panelNodeHeader`, hides `#panelFbHeader`, and controls visibility of action buttons.

---

## 10. The Feature Catalog Browser

`showFeatureBrowser()` collects every feature from every `featureview` node, builds filter pills from the actual data, and renders `.rfc` cards.

### What each .rfc card shows (all visible without clicking)

1. Color dot + feature name (monospace bold)
2. Type chip (color-coded border/background)
3. PII, online, offline, classification badge chips
4. Source Feature View name (right-aligned, muted)
5. Description text (if present)
6. Transformation SQL (green monospace with left border accent, if present)
7. Metadata row: source column · owner · TTL · freshness · default value
8. Stat chips: mean · distinct count · null count (nulls highlighted red)
9. Tags as pill chips
10. Completeness % + progress bar (right edge)

### Canvas highlight on hover

When hovering any `.rfc` card, the canvas will highlight the source Feature View node AND any Feature Service nodes that reference it with an amber glow. This calls `_highlightCanvasNodes(sourceNodeId)` and clears with `_clearCanvasHighlight()` on mouseleave.

### Filter pills

Pills are dynamically generated from the data:
- One pill per unique type (e.g., `Int64`, `String`, `Float32`)
- One pill per unique owner (up to 5)
- `🔒 PII` pill (only if any feature has `security.pii: true`)
- `⚡ Online` — features with `serving.online: true`
- `💾 Offline` — features with `serving.offline: true`

Filters are **stackable** (multiple can be active simultaneously). `_fbFilter()` implements AND logic.

### Search

`#fbSearchInput` filters by `data-name`, `data-type`, `data-owner`, and `data-tags`.

---

## 11. The Feature Detail Modal

Template: `templates/.../modals/_feature_detail_modal.html`
DOM ID: `#featureDetailModal`
Opened by: `_openFeatureModal(nodeId, idx)`

### Context tracking

`this._fdmContext = { nodeId, idx }` stores which feature is open. This is used by `_saveFeatureEdit()` to write back and re-open the modal. **Always preserve this across async operations.** See the pattern in `_saveFeatureEdit`:

```js
const savedCtx = { nodeId, idx };       // ← capture FIRST
this.showPanel(savedCtx.nodeId);        // ← re-render panel (clears modal)
this._fdmContext = savedCtx;            // ← restore context
setTimeout(() => {
  this._fdmContext = savedCtx;          // ← restore AGAIN inside timeout
  this._openFeatureModal(savedCtx.nodeId, savedCtx.idx);
}, 60);                                 // ← 60ms for panel render to settle
```

### ⚠️ Edit button innerHTML — do not use textContent on the button

The `#fdmEditBtn` has two child `<span>` elements: `#fdmEditBtnIcon` and `#fdmEditBtnLabel`. If you set `btn.textContent = '...'` you destroy these spans and `_toggleFeatureEdit` will throw null errors. Always set:

```js
document.getElementById('fdmEditBtnIcon').textContent = '✏️';
document.getElementById('fdmEditBtnLabel').textContent = 'Edit';
document.getElementById('fdmEditBtn').classList.remove('active');
```

### View mode — 5 tabs

| Tab | data-tab | Contents |
|---|---|---|
| Overview | `overview` | name, type, owner, sourceColumn, defaultValue, transformation, description, tags |
| Serving & Validation | `serving` | online/offline toggles, TTL, min/max/nullable |
| Quality | `quality` | freshness, completeness bar, accuracy bar |
| Security | `security` | PII flag, sensitive flag, classification |
| Statistics | `stats` | mean, stdDev, min, max, nullCount, distinctCount, totalCount |

Tabs are rendered by `_renderFdmTab(tab, f, node)` into `#fdmTabContent`.

### Edit mode

Toggled by `_toggleFeatureEdit()` → shows `#fdmEditMode`, hides `#fdmViewMode`.

Edit fields generated by `_renderFdmEditForm(f)` into `#fdmEditGrid`. Field IDs follow the pattern `fdmF_fieldname` (inputs) or `fdmT_fieldname` (toggles). `_saveFeatureEdit` reads them with `g('fieldname')` for inputs or `tog('fieldname')` for toggles.

### Closing

- `✕` button: calls `diagram._closeFeatureModal()`
- Overlay click: `onclick="if(event.target===this) diagram._closeFeatureModal()"`
- Escape key: handled in `bindEvents()` — checks `#featureDetailModal.active` FIRST

---

## 12. The Hover Popover System

The hover popover (`#featHoverPopover`) is a floating card defined in `base.html` (not inside `#detailPanel`). It has `pointer-events: none`.

### Three entry points

```js
_showFeatPopover(nodeId, idx, el)    // From feature cards in FV panel
_showFbPopover(nodeId, idx, el)      // From .rfc cards in catalog — delegates to above
_showColPopover(nodeId, idx, el)     // From schema columns in datasource panel
```

### Positioning logic

1. Gets `el.getBoundingClientRect()` (the card that triggered hover)
2. Gets `#detailPanel.getBoundingClientRect()` for the panel's left edge
3. Tries to position **left of the panel**: `left = panelRect.left - popoverWidth - 12`
4. If that would go off-screen (left < 8px): falls back to **right of the card**: `left = rect.right + 10`
5. Vertical: aligns to card top, clamped to viewport

Hidden by `_hideFeatPopover()` which removes the `.visible` class.

---

## 13. The Canvas Highlight System

There are two separate highlight flows — both draw an amber glow on matched canvas nodes.

### Flow 1: Feature dot click (FV panel feature cards)

Triggered by clicking the colored dot on a `.feat-card`. Calls `_highlightFeatureUsage(nodeId, idx, dotEl)`.

```js
_highlightFeatureUsage(nodeId, idx, dotEl) {
    const feature = this.nodes.nodes.get(nodeId).features[idx];
    const highlightIds = new Set([nodeId]);

    // Also highlight any service that contains a FV with this feature name
    this.nodes.nodes.forEach((n, nid) => {
        if (n.type === 'service' && Array.isArray(n.features)) {
            const linked = n.features.some(fvId => {
                const fv = this.nodes.nodes.get(fvId);
                return fv && fv.features && fv.features.some(f => f.name === feature.name);
            });
            if (linked) highlightIds.add(nid);
        }
    });

    this._featureHighlightIds = highlightIds;
    // Clicking the same dot again clears highlight (toggle)
}

_clearFeatureHighlight() {
    this._featureHighlightIds = null;
    this._highlightedFeature = null;
    if (this._highlightDotEl) this._highlightDotEl.classList.remove('feat-dot-active');
    this._highlightDotEl = null;
}
```

### Flow 2: Catalog card hover (all-features browser)

Triggered by `onmouseenter` on `.rfc` cards. Calls `_highlightCanvasNodes(sourceNodeId, featName)`.

```js
_highlightCanvasNodes(sourceNodeId, featName) {
    const highlightIds = new Set([sourceNodeId]);
    this.nodes.nodes.forEach((n, nid) => {
        if (n.type === 'service' && n.features.includes(sourceNodeId)) highlightIds.add(nid);
    });
    this._featureHighlightIds = highlightIds;
}

_clearCanvasHighlight() {
    this._featureHighlightIds = null;
}
```

### Canvas rendering of highlights

In `drawNode()`, before drawing the node border:

```js
const isFeatureHighlighted = this._featureHighlightIds && this._featureHighlightIds.has(node.id);
if (isFeatureHighlighted) {
    this.ctx.shadowColor = '#f59e0b';   // amber
    this.ctx.shadowBlur = 25;
}
this.ctx.strokeStyle = isSelected ? config.bg : isFeatureHighlighted ? '#f59e0b' : borderColor;
this.ctx.lineWidth   = isSelected ? 3  : isFeatureHighlighted ? 2 : 1;
```

### State variables

```js
this._featureHighlightIds   // Set of node IDs to glow, or null
this._highlightedFeature    // String "nodeId:idx" of active dot-click, or null
this._highlightDotEl        // Reference to the active dot DOM element
```

---

## 14. The Stats Bar

The stats bar is rendered inside `_canvas_area.html` (NOT in the orphaned `_stats_bar.html` — that file exists but is not included anywhere). Each stat item has its own `onclick` handler rather than the whole bar opening a modal.

### HTML structure

```html
<div id="statsBar">
  <div class="stat-item" onclick="diagram.showNodesByType('datasource')">
    <span class="stat-value" id="statSources">0</span>
    <span class="stat-label">Sources</span>
  </div>
  <!-- entities, featureviews, services, features -->
</div>
```

Clicking a stat item calls `showNodesByType(type)` which opens the detail panel in `fb-mode` showing browseable cards for all nodes of that type.

### `updateStats()` — Feature count fix

The feature count (`#statFeatures`) only counts features from `featureview` nodes. It explicitly skips `service` nodes because `service.features` contains FV IDs, not feature objects:

```js
if (node.type === 'featureview' && Array.isArray(node.features)) {
    stats.features += node.features.length;
}
// ← service nodes are intentionally excluded
```

`updateStats()` is called after `saveComponent()` and `_saveFeatureEdit()` to keep counts current.

### CSS behavior

Each `.stat-item` has individual hover: green border, `var(--bg-tertiary)` background, `translateY(-1px)`, stat value turns `var(--feast-green)`.

---

## 15. The LLM Assistant Panel

Template: `_llm_panel.html`
DOM ID: `#llmPanel`
CSS prefix: `.llm-*`

### Panel anatomy

```
#llmPanel  ← fixed position, draggable, resizable, z-index: 600
  ├── .llm-resize-n/e/w/ne/nw    ← 5 resize handles (top, right, left, two corners)
  │
  ├── .llm-header  (#llmHeaderDrag)  ← drag handle (grab cursor)
  │     ├── .llm-title (.llm-title-dot + "AI Assistant")
  │     └── .llm-header-actions
  │           ├── minimize btn  → diagram.minimizeLLM()
  │           └── close btn     → diagram.toggleLLMHelper()
  │
  ├── .llm-body  (#llmBody)
  │     ├── .llm-context-bar (#llmContextContent)  ← shows selected node context
  │     ├── .llm-prompts                           ← 4 quick-prompt buttons (4-col grid)
  │     ├── .llm-messages (#llmMessages)            ← scrollable chat history
  │     └── .llm-input-area
  │           ├── .llm-input-wrap → .llm-input (#llmInput)   ← auto-growing textarea
  │           └── .llm-input-footer (hint + send button)
  │
  └── .llm-minimized-bar (#llmMinimizedBar)  ← shown when minimized, click to restore
```

### Default size and position

```css
.llm-panel {
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%) translateY(16px);  /* centered, slides up on open */
    width: 775px;
    height: 775px;
    min-width: 400px;
    min-height: 140px;
    max-height: 85vh;
}
```

### Open/close/minimize

```js
toggleLLMHelper()   // open ↔ close (adds/removes .open class)
minimizeLLM()       // toggle .minimized class — collapses to 52px pill, hides .llm-body
                    // clicking the minimized bar also calls minimizeLLM() to restore
```

When minimized: `.llm-body` is `display: none`, `.llm-minimized-bar` is `display: flex`.

### Drag to move

`_initLLMPanel(panel)` is called once on first open. It sets up:

1. **Drag** via `.llm-header` mousedown — anchors panel from `transform: translateX(-50%)` to absolute `left`/`bottom` pixel values, then tracks mouse delta.

2. **Resize** — 5 handles, each triggers `startResize(e, dir)` where `dir` is `'n'`, `'e'`, `'w'`, `'ne'`, or `'nw'`. The resize handler adjusts `width`, `height`, and `left` as appropriate. W-resize shifts `left` so the right edge stays fixed.

```js
// Resize direction logic:
if (dir.includes('n')) → adjust height (grow upward)
if (dir.includes('e')) → adjust width (grow rightward)
if (dir.includes('w')) → adjust width AND left (grow leftward, shift anchor)
```

### Textarea auto-grow

```js
_llmAutoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';  // max 200px
}
```

The textarea is styled inside `.llm-input-wrap` which provides the visible border/focus ring. The `<textarea>` itself has `border: none; outline: none; background: transparent`.

---

## 16. Canvas & Rendering

### Render loop

```js
animate() {
  this.render();
  if (this.config.miniMapEnabled) this.renderMiniMap();
  requestAnimationFrame(() => this.animate());
}
```

Runs at ~60fps continuously. All canvas drawing happens here. DOM updates happen separately.

### Coordinate system

- **World coordinates**: where nodes live (node.x, node.y)
- **Screen coordinates**: pixel position on canvas element

```js
screenToWorld(sx, sy) {
  return { x: (sx - this.offsetX) / this.scale, y: (sy - this.offsetY) / this.scale };
}
// Inverse: worldX * scale + offsetX = screenX
```

### Drawing a node

```
drawNode(node, config)
  ├── checks this._featureHighlightIds for amber glow
  ├── draws shadow, rounded rect, header bar
  ├── draws type-specific icon, name text
  ├── calls drawNodeContent(node, config)
  │     ├── featureview → drawFeatureViewContent()
  │     ├── service     → drawServiceContent()
  │     ├── entity      → drawEntityContent()
  │     └── datasource  → drawDataSourceContent()
  └── drawNodePorts(node, config)
```

### Node dimensions (from `config.js`)

```js
DIMENSIONS = { nodeWidth: 200, nodeHeight: 100, portRadius: 6 }
```

---

## 17. DOM ID Reference

### Static IDs (defined in HTML templates)

| ID | Template | Purpose |
|---|---|---|
| `diagramCanvas` | `_canvas_area.html` | The main canvas element |
| `statSources` | `_canvas_area.html` | Stats bar — data source count |
| `statEntities` | `_canvas_area.html` | Stats bar — entity count |
| `statViews` | `_canvas_area.html` | Stats bar — feature view count |
| `statServices` | `_canvas_area.html` | Stats bar — service count |
| `statFeatures` | `_canvas_area.html` | Stats bar — total feature count |
| `detailPanel` | `_detail_panel.html` | Right side panel container |
| `panelNodeHeader` | `_detail_panel.html` | Panel header for node view |
| `panelFbHeader` | `_detail_panel.html` | Panel header for feature catalog |
| `panelBadge` | `_detail_panel.html` | Type icon + label badge |
| `panelIcon` | `_detail_panel.html` | Node type icon |
| `panelType` | `_detail_panel.html` | Node type label text |
| `panelTitle` | `_detail_panel.html` | Node name |
| `panelSubtitle` | `_detail_panel.html` | e.g. "batch · 5 features" |
| `panelTags` | `_detail_panel.html` | Node tags container |
| `panelFbCount` | `_detail_panel.html` | "42 Features" in catalog header |
| `panelFeatCatalogBtn` | `_detail_panel.html` | ⚡ All Features button |
| `panelContent` | `_detail_panel.html` | Scrollable content area |
| `featHoverPopover` | `base.html` | Floating feature hover card |
| `featPopoverInner` | `base.html` | Inner content of hover popover |
| `featureDetailModal` | `_feature_detail_modal.html` | Feature detail/edit modal |
| `fdmTypeDot` | `_feature_detail_modal.html` | Type color dot in modal header |
| `fdmName` | `_feature_detail_modal.html` | Feature name in header |
| `fdmSubtitle` | `_feature_detail_modal.html` | "FVName · Type" subtitle |
| `fdmBadges` | `_feature_detail_modal.html` | PII/online/offline badges |
| `fdmEditBtn` | `_feature_detail_modal.html` | Edit/Save toggle button |
| `fdmEditBtnIcon` | `_feature_detail_modal.html` | ⚠️ SPAN inside #fdmEditBtn — set separately |
| `fdmEditBtnLabel` | `_feature_detail_modal.html` | ⚠️ SPAN inside #fdmEditBtn — set separately |
| `fdmViewMode` | `_feature_detail_modal.html` | Tab view container |
| `fdmEditMode` | `_feature_detail_modal.html` | Edit form container |
| `fdmTabContent` | `_feature_detail_modal.html` | Tab content area |
| `fdmEditGrid` | `_feature_detail_modal.html` | Edit form grid |
| `componentModal` | `_component_modal.html` | Add/Edit node modal |
| `modalTitle` | `_component_modal.html` | Modal title |
| `modalBody` | `_component_modal.html` | Modal form body |
| `tooltip` | `_tooltip.html` | Canvas hover tooltip |
| `notification` | `base.html` | Toast notification |
| `searchInput` | `_toolbar.html` | Global search input |
| `miniMapCanvas` | `_canvas_area.html` | Minimap canvas |
| `llmPanel` | `_llm_panel.html` | LLM assistant panel |
| `llmMessages` | `_llm_panel.html` | LLM chat history container |
| `llmInput` | `_llm_panel.html` | LLM textarea |
| `llmBody` | `_llm_panel.html` | LLM body (hidden when minimized) |
| `llmMinimizedBar` | `_llm_panel.html` | LLM minimized pill |
| `llmContextContent` | `_llm_panel.html` | Context chip bar |

### Dynamic IDs (injected by JS via innerHTML)

| ID | Created by | Purpose |
|---|---|---|
| `featSearchInput` | `_buildFeatureExplorer()` | Search in FV feature list |
| `featTypeFilters` | `_buildFeatureExplorer()` | Type filter pills row |
| `featListScroll` | `_buildFeatureExplorer()` | Feature card list container |
| `fbSearchInput` | `showFeatureBrowser()` | Catalog search input |
| `fbFilters` | `showFeatureBrowser()` | Catalog filter pills |
| `fbStats` | `showFeatureBrowser()` | "42 features" count |
| `fbList` | `showFeatureBrowser()` | Catalog card list |
| `fdmEditGrid` | `_renderFdmEditForm()` | Edit form grid (rebuilt each open) |
| `inputName`, `inputKind`, etc. | `openModal()` | Add/Edit form fields |
| `featuresList`, `tagsList` | `openModal()` | Features/tags edit lists |

---

## 18. CSS Architecture

All CSS is in `static/FeastArchitect/css/main.css` (~5000+ lines). No preprocessor. No CSS-in-JS.

### CSS Custom Properties

```css
--bg-primary        /* darkest, canvas background */
--bg-secondary      /* cards, panels */
--bg-tertiary       /* inputs, hover states */
--border-color      /* all borders */
--text-primary      /* main text */
--text-secondary    /* body text */
--text-muted        /* labels, metadata, placeholders */
--feast-green       /* #10b981 — primary accent */
--feast-blue        /* #3b82f6 */
--feast-purple      /* #8b5cf6 — LLM panel accent */
--feast-orange      /* #f97316 */
--feast-red         /* #ef4444 */
--feast-yellow      /* #eab308 */
--grid-color        /* canvas dot grid */
--shadow-lg         /* panels/modals box-shadow */
--shadow-glow       /* glow effect on selected nodes */
--code-bg           /* code block backgrounds */
```

### CSS Class Family Reference

| Prefix | Component |
|---|---|
| `.feat-*` | Feature explorer cards in FV panel |
| `.fdm-*` | Feature detail modal |
| `.rfc-*` | Rich feature cards in catalog |
| `.feature-*` | Generic feature list elements |
| `.fb-*` | Feature catalog browser container |
| `.panel-*` | Side panel structure |
| `.code-*` | Code editor panel |
| `.llm-*` | LLM assistant panel |
| `.edge-*` | Edge manager panel |
| `.search-*` | Search dropdown |
| `.tooltip-*` | Canvas hover tooltip |
| `.modal-*` | Modal overlays |
| `.sc-*` | Deprecated single-col panel classes (still in CSS, unused) |
| `.nb-*` | Node browser cards (showNodesByType panel) |

### Rules for CSS changes

1. **Always append** new CSS to the end of `main.css`. Never reorganize existing sections.
2. Dark theme is the only fully-implemented theme. CSS variables in `:root` handle it.
3. Do NOT use Django template syntax (`{% static %}`, `{{ var }}`) in `.css` files — Django does not process static files.
4. `.sc-*` classes exist at the bottom of `main.css` from a previous refactor attempt. They are not currently used but harmless.
5. Mobile breakpoints are at the bottom of the file.

---

## 19. JSON Import/Export Format

```js
// Export:
{
  nodes: [ ['entity_1', {...nodeObject}], ['featureview_1', {...}], ... ],  // Array.from(Map.entries())
  edges: [ { id: 'entity_1->fv_1', from: 'entity_1', to: 'featureview_1', animated: false }, ... ],
  exportDate: '2025-01-01T00:00:00.000Z',
  version: '3.0'
}
```

**Import** accepts both:
- Array format: `nodes: [ ['id', node], ... ]`
- Object format: `nodes: { 'id': node, ... }`

After import, it rebuilds `inputs`/`outputs` arrays on all nodes from the edges array. ID counters are updated to avoid collisions.

---

## 20. Django Integration

### Context injection

`_django_context.html` injects:

```js
window.DJANGO_CONTEXT = {
  repoId: null,           // int | null — null means "no repo, use example data"
  repoName: '',
  repoError: '',
  apiBaseUrl: '/api',
  user: { id: null, username: '', email: '', firstName: '', lastName: '' },
  csrfToken: '...'
}
```

### CSRF

All POST/PUT/DELETE calls need the CSRF token in `X-CSRFToken`. `APIClient` reads from `window.DJANGO_CONTEXT.csrfToken`.

**⚠️ Header merge bug (was fixed, don't re-introduce):**
```js
// ❌ Wrong — spreading options AFTER headers lets options overwrite X-CSRFToken
fetch(url, { headers: { 'X-CSRFToken': token }, ...options })

// ✅ Correct — merge headers explicitly
fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': this.getCsrfToken(), ...(options.headers || {}) } })
```

### Static files

In templates, always use `{% load static %}` and `{% static '...' %}`. Never hardcode `/static/` paths.

---

## 21. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Escape` | Close feature modal (checked FIRST), then close all panels/modals |
| `Delete` | Delete selected node |
| `Ctrl/Cmd + F` | Focus search input |
| `Ctrl/Cmd + S` | Export JSON download |
| `Ctrl/Cmd + Shift + A` | Toggle LLM helper panel |
| `Ctrl/Cmd + Shift + D` | Toggle Django admin panel |

There are **two** keydown listeners (one in `bindEvents`, one in `setupKeyboardShortcuts`). The feature modal Escape check is in `bindEvents` and runs first.

---

## 22. ⚠️ All Known Bug Patterns

These bugs have all been encountered and fixed. Know them before touching anything.

### Bug 1: NodeManager vs Map confusion
`this.nodes.size` is `undefined`. Use `this.nodes.nodes.size`. See Section 6.

### Bug 2: Triple dereference after regex replace
Running `this\.nodes\.` → `this.nodes.nodes.` on lines that already have `this.nodes.nodes.` creates `this.nodes.nodes.nodes.`. Always check the output of any mass find-replace.

### Bug 3: CSRF token overwritten in fetch options spread
See Section 20. Spread `...options` BEFORE headers, then declare headers explicitly after.

### Bug 4: `getSubtypeColor` called without `this`
`getSubtypeColor(node.subtype)` in drawing methods must be `this.getSubtypeColor(node.subtype)`.

### Bug 5: `_fdmContext` nulled before timeout fires
In `_saveFeatureEdit`, restore context both OUTSIDE and INSIDE the `setTimeout`. If you null it between those steps, the re-open does nothing silently.

### Bug 6: Transformation strings with inner single quotes
```js
// ❌ SyntaxError
transformation: 'SUM(x) WHERE y = 'done'',
// ✅ Fixed
transformation: "SUM(x) WHERE y = 'done'",
```

### Bug 7: Feature modal edit button innerHTML destruction
`#fdmEditBtn` has child spans `#fdmEditBtnIcon` and `#fdmEditBtnLabel`. Setting `btn.textContent = '...'` destroys them, causing `_toggleFeatureEdit` to throw null reference errors on next open. Always set the spans' `textContent` individually.

### Bug 8: service.features contains FV IDs, not feature objects
When rendering the Feature Service detail panel or iterating `service.features`, always look up the FV node: `this.nodes.nodes.get(fvId)`. Treating the IDs as display strings causes raw IDs like `featureview_1` to appear as names. See Section 5.

### Bug 9: Stats bar — `updateStats()` must skip service nodes for feature count
Before the fix, `updateStats()` counted `node.features` for ALL node types. Service nodes store FV IDs in `features`, inflating the count. The fix: only count features on `node.type === 'featureview'`.

### Bug 10: CSS using Django template syntax
`{% static 'img.png' %}` in a `.css` file silently outputs nothing. Use inline styles via `_styles.html` or hardcode absolute paths.

### Bug 11: Wrong indentation after method extraction
Methods extracted from the original monolith sometimes have 20-space interior indentation instead of 8-space. Run `node --check` to verify syntax after any extraction.

### Bug 12: New modal not included in `_modals.html`
A modal `.html` file does nothing unless included. After creating any new modal file, add `{% include "FeastArchitect/components/modals/_your_modal.html" %}` to `_modals.html`.

### Bug 13: Panel stuck in wrong width
`showPanel` adds `wide`. `showFeatureBrowser` adds `fb-mode` and removes `wide`. `closePanel` removes both. If these get out of sync, the panel opens at the wrong width. Fix: always check `closePanel()` runs `panel.classList.remove('open', 'wide', 'fb-mode')`.

### Bug 14: `loadComplexExample` — standalone function vs class method
`example-data.js` exports a standalone function, not a class method. It's called as:
```js
loadComplexExample(this.nodes, (from, to) => this.nodes.addConnection(from, to), () => this.autoLayout());
```
The method `loadComplexExample()` that exists on `FeastDiagram` is a DIFFERENT method. Do not confuse them.

### Bug 15: Edges use `from`/`to`, not `source`/`target`
The codebase is consistent: `{ from, to }`. Never use `source`/`target`.

### Bug 16: `openModal()` dynamically creates form field IDs
`inputName`, `inputKind`, etc. do not exist in the DOM until `openModal()` is called. `getElementById('inputName')` outside of the modal flow returns null.

### Bug 17: LLM panel drag — transform vs absolute positioning
The LLM panel opens with `transform: translateX(-50%)` (centered). After the first drag, it switches to absolute `left`/`bottom` pixel values and `transform: none`. The anchor function `anchorPanel()` handles this transition. If you reset the panel's style without calling `anchorPanel()` first, the drag math will be wrong because `panel.style.left` will be empty.

### Bug 18: Notification slide direction
Notifications appear bottom-left and slide in from the left (`translateX(-400px)`). Not top-right (old behavior was `translateX(400px)`). If notifications appear to pop into view without sliding, check the `@keyframes` for the translate direction.

---

## 23. How-To Patterns for Common Tasks

### Add a new field to feature rich metadata

1. Add to feature schema docs (this README, Section 8)
2. Display in `_buildFeatureCard` (compact FV panel card)
3. Display in `_buildRichFeatureCard` (catalog card)
4. Display in `_renderFdmTab` under the appropriate tab
5. Add edit input in `_renderFdmEditForm` with ID pattern `fdmF_fieldname` or `fdmT_fieldname`
6. Read and save in `_saveFeatureEdit` using `g('fieldname')` or `tog('fieldname')`
7. Optionally surface in `_showFeatPopover` for the hover preview

### Add a new panel action button

1. Add `<button>` to `_detail_panel.html` inside `#panelNodeHeader .panel-actions`
2. Style with `.panel-action-btn` base class
3. Control visibility in `_setupPanelForNode(node)`:
   ```js
   const btn = document.getElementById('myBtn');
   if (btn) btn.style.display = someCondition ? '' : 'none';
   ```
4. Add handler method to FeastDiagram

### Add a new modal

1. Create `templates/FeastArchitect/components/modals/_my_modal.html`:
   ```html
   <div class="modal-overlay" id="myModal" onclick="if(event.target===this)diagram.closeMyModal()">
     <div class="modal">
       <button class="modal-close" onclick="diagram.closeMyModal()">✕</button>
     </div>
   </div>
   ```
2. Add `{% include "FeastArchitect/components/modals/_my_modal.html" %}` to `_modals.html`
3. Append CSS to `main.css`
4. Add `openMyModal()` / `closeMyModal()` to FeastDiagram using `.classList.add/remove('active')`
5. Add Escape key handling in `bindEvents()` — check BEFORE the generic Escape handler

### Add a new node type

1. Add to `NODE_CONFIG` in `config.js`
2. Add `addMyType(config)` to `NodeManager`
3. Add delegation in `FeastDiagram.addMyType(config)` → `this.nodes.addMyType(config)`
4. Add `drawMyTypeContent(node, config, contentY)` and case to `drawNodeContent()`
5. Add type-specific section to `_buildNodeDetails()` (details grid)
6. Add right-col builder and routing in `_buildSingleColPanel()`
7. Add case in `openModal(type)` and `saveComponent()`
8. Add case in `generateCodeExample(node)`
9. Add to `visibleLayers` in constructor and `updateLayerToggles()`
10. Update `updateStats()` if the type has a countable property

### Add a new LLM quick-prompt button

1. Add to `_llm_panel.html` inside `.llm-prompts`:
   ```html
   <button class="llm-prompt-btn" onclick="diagram.askLLM('my_action')">
       <span class="llm-prompt-icon">🎯</span>
       <span class="llm-prompt-label">My Action</span>
   </button>
   ```
2. Add case for `'my_action'` in `LLMHelper.askLLM()` or the FeastDiagram wrapper

### Add a new tab to the Feature Detail Modal

1. Add `<button class="fdm-tab" data-tab="mytab" onclick="diagram._switchFdmTab(this,'mytab')">My Tab</button>` to `_feature_detail_modal.html`
2. Add an `else if (tab === 'mytab')` block in `_renderFdmTab()`
3. Use the helper closures already defined at the top of `_renderFdmTab`: `row(k, v, cls)`, `sec(title, rows, fullWidth)`, `progressBar(label, val)`

### Modify the stats bar

The stats bar HTML is in `_canvas_area.html` (inline, not `_stats_bar.html`). Each `.stat-item` has its own `onclick`. `updateStats()` in `feast-diagram.js` populates the count elements by ID.

---

## 24. Method Index

All methods in `feast-diagram.js` grouped by category.

### Core / Lifecycle
| Method | Notes |
|---|---|
| `constructor` | Inits modules, sets up proxy, calls init() |
| `initializeModules` | Creates all sub-module instances |
| `init` | resize, bindEvents, setupSearch, loadInitialData, animate |
| `loadInitialData` | async — loads from backend OR example data |
| `animate` | requestAnimationFrame render loop |
| `bindEvents` | Canvas mouse events + keydown |
| `setupKeyboardShortcuts` | Additional keyboard shortcuts |
| `selectNode` | Sets selectedNode, calls showPanel |
| `closePanel` | Removes open/wide/fb-mode, resets headers |
| `deleteSelected` | Removes node + connected edges |
| `autoLayout` | Calls this.layout.calculate() |
| `openModal` | Builds add/edit form HTML by type |
| `saveComponent` | Reads form, updates/creates node, calls updateStats() |
| `updateStats` | Counts nodes and features (featureview only), updates stat bar |
| `exportToJSON` | Returns { nodes, edges, date, version } |
| `importFromJSON` | Loads from JSON object, rebuilds graph |
| `screenToWorld` | Convert screen px to canvas world coords |
| `getSubtypeColor` | Returns hex color for FV subtype |
| `getUsedByCount` | Counts how many nodes use a given node |

### Show / Close
| Method | Notes |
|---|---|
| `showPanel` | Always opens `wide`, builds single-col content via `_buildSingleColPanel` |
| `showFeatureBrowser` | Opens `fb-mode`, collects all FV features, builds catalog |
| `showNodesByType(type)` | Opens panel in `fb-mode` showing browseable cards for one node type |
| `closePanel` | Removes open/wide/fb-mode |
| `showAddModal` / `showEditModal` | Calls openModal() |
| `showTooltip` | Canvas hover tooltip |
| `showNotification` | Toast notification (bottom-left) |
| `toggleLLMHelper` | Open ↔ close LLM panel |
| `minimizeLLM` | Toggle collapsed state of LLM panel |

### Canvas Draw
| Method | Notes |
|---|---|
| `render` | Clears canvas, draws grid, draws edges, draws nodes |
| `drawNode` | Draws one node — shadow, highlight, rect, header, ports |
| `drawNodeContent` | Routes to type-specific draw method |
| `drawFeatureViewContent` | — |
| `drawServiceContent` | — |
| `drawEntityContent` | — |
| `drawDataSourceContent` | — |

### Feature System
| Method | Notes |
|---|---|
| `_buildFeatureExplorer` | FV/service right-col — search + type pills + cards |
| `_buildFeatureCard` | Compact card for FV panel (includes ✏️ hover edit icon) |
| `_buildRichFeatureCard` | Full-detail card for catalog (includes canvas highlight on hover) |
| `_filterFeatures` | Filters cards in FV panel |
| `_bindFeatureExplorer` | Binds type pill click events |
| `_fbFilter` | Filters catalog cards |
| `_openFeatureModal` | Opens modal, sets header, renders overview tab |
| `_closeFeatureModal` | Closes modal, clears _fdmContext |
| `_renderFdmTab` | Renders tab content HTML |
| `_toggleFeatureEdit` | Toggles view ↔ edit mode |
| `_saveFeatureEdit` | Reads form, writes to node, refreshes panel, re-opens modal |
| `_showFeatPopover` | Shows floating hover popover |
| `_hideFeatPopover` | Hides popover |
| `_highlightFeatureUsage` | Dot-click highlight: glows FV + services using that feature |
| `_clearFeatureHighlight` | Clears dot-click highlight state |
| `_highlightCanvasNodes` | Catalog-hover highlight: glows FV + services |
| `_clearCanvasHighlight` | Clears catalog-hover highlight state |

### Panel Builders
| Method | Notes |
|---|---|
| `_buildSingleColPanel` | Orchestrates single-col panel: calls _buildNodeDetails + type-specific right-col |
| `_buildNodeDetails` | Details section HTML (same classes/styles as original) |
| `_buildDatasourceRight` | Datasource schema column list |
| `_buildEntityRight` | Entity "used by" FV list |
| `_buildFeatureExplorer` | Feature list section (FV = feature cards, service = FV name cards) |

### LLM
| Method | Notes |
|---|---|
| `_initLLMPanel` | Called once on first open — sets up drag + 5-edge resize |
| `_llmAutoResize` | Auto-grows textarea to max 200px |
| `updateLLMContext` | Updates the context chip to show current selected node |
| `sendLLMMessage` | Sends user message, appends to chat, calls LLMHelper |
| `askLLM` | Quick-prompt buttons — builds a pre-filled prompt by action type |

### Code Generation
All `generate*` methods. Key: `generateCodeExample(node)` called per-node for the panel code block; `generateFeatureViewsFile()` generates the full `feature_views.py`.

---

## 25. Diagnostic Scripts

Save these in `scripts/` and run from the project root (`FeastArchitect/`).

### `scripts/check-syntax.sh`
Run after ANY JS edit.

```bash
#!/bin/bash
PASS=0; FAIL=0
echo ""; echo "═══ FeastArchitect JS Syntax Check ═══"; echo ""
for f in \
  static/FeastArchitect/js/modules/config.js \
  static/FeastArchitect/js/modules/utils.js \
  static/FeastArchitect/js/modules/api.js \
  static/FeastArchitect/js/modules/canvas-renderer.js \
  static/FeastArchitect/js/modules/node-manager.js \
  static/FeastArchitect/js/modules/layout-manager.js \
  static/FeastArchitect/js/modules/search-manager.js \
  static/FeastArchitect/js/modules/ui-manager.js \
  static/FeastArchitect/js/modules/code-generator.js \
  static/FeastArchitect/js/modules/llm-helper.js \
  static/FeastArchitect/js/modules/example-data.js \
  static/FeastArchitect/js/modules/feast-diagram.js \
  static/FeastArchitect/js/main.js; do
  result=$(node --check "$f" 2>&1)
  if [ $? -ne 0 ]; then
    echo "❌  $f"; echo "    $(echo "$result" | head -3)"; FAIL=$((FAIL+1))
  else
    echo "✅  $f"; PASS=$((PASS+1))
  fi
done
echo ""; echo "─── $PASS passed, $FAIL failed ───"; echo ""
[ $FAIL -gt 0 ] && exit 1
```

### `scripts/audit-methods.js`
Finds stubs, duplicates, and missing critical methods.

```js
#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const FILE = 'static/FeastArchitect/js/modules/feast-diagram.js';
const content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');
const methods = [];
let cur = null, start = 0, depth = 0, inM = false;
for (let i = 0; i < lines.length; i++) {
  const m = !inM && lines[i].match(/^    ([a-zA-Z_$][\w$]*)\s*\(/);
  if (m) { cur = m[1]; start = i+1; inM = true; depth = 0; }
  if (inM) {
    for (const c of lines[i]) { if (c==='{') depth++; else if (c==='}') depth--; }
    if (depth===0 && i>start) { methods.push({name:cur, lines:i-start+1, L:start}); inM=false; }
  }
}

const CRITICAL = ['constructor','initializeModules','init','loadInitialData','showPanel',
  'closePanel','selectNode','showFeatureBrowser','showNodesByType',
  '_buildSingleColPanel','_buildNodeDetails','_buildFeatureExplorer','_buildFeatureCard',
  '_buildRichFeatureCard','_fbFilter','_fbBindFilters','_openFeatureModal','_closeFeatureModal',
  '_renderFdmTab','_toggleFeatureEdit','_renderFdmEditForm','_saveFeatureEdit',
  '_showFeatPopover','_hideFeatPopover','_highlightFeatureUsage','_clearFeatureHighlight',
  '_highlightCanvasNodes','_clearCanvasHighlight',
  'drawNode','render','animate','bindEvents','exportToJSON','importFromJSON',
  'autoLayout','getSubtypeColor','getCsrfToken','updateStats',
  'toggleLLMHelper','minimizeLLM','_initLLMPanel','_llmAutoResize'];

const names = new Set(methods.map(m=>m.name));
const stubs = methods.filter(m=>m.lines<=4);
const missing = CRITICAL.filter(n=>!names.has(n));
const seen={}; const dups=[];
methods.forEach(m=>{ if(seen[m.name]) dups.push(m.name); seen[m.name]=true; });

console.log(`\n Total methods: ${methods.length} | File: ${FILE} (${lines.length} lines)`);
if (stubs.length) {
  console.log(`\n⚠️  POTENTIAL STUBS (≤4 lines):`);
  stubs.forEach(m=>console.log(`   L${m.L} ${m.name.padEnd(48)} ${m.lines} lines`));
}
if (dups.length) { console.log(`\n❌  DUPLICATES: ${dups.join(', ')}`); }
if (missing.length) { console.log(`\n❌  MISSING CRITICAL:\n   ${missing.join('\n   ')}`); }
if (!stubs.length && !dups.length && !missing.length) console.log('\n✅  All checks passed');
console.log(`\n Largest methods:`);
[...methods].sort((a,b)=>b.lines-a.lines).slice(0,10)
  .forEach(m=>console.log(`   L${m.L} ${m.name.padEnd(48)} ${m.lines} lines`));
```

### `scripts/find.js`
Search any string across all `.js`, `.css`, `.html` files.

```js
#!/usr/bin/env node
// Usage: node scripts/find.js <search-term>
const fs = require('fs'), path = require('path');
const q = process.argv[2];
if (!q) { console.log('Usage: node scripts/find.js <term>'); process.exit(0); }

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p, exts);
    if (exts.some(x=>e.name.endsWith(x))) {
      return fs.readFileSync(p,'utf8').split('\n')
        .map((line,i)=>line.includes(q)?{file:p,line:i+1,text:line.trim()}:null)
        .filter(Boolean);
    }
    return [];
  });
}
const results = walk('static',['.js','.css']).concat(walk('templates',['.html']));
if (!results.length) { console.log(`Not found: "${q}"`); process.exit(0); }
const byFile = results.reduce((a,r)=>{ (a[r.file]??=[]).push(r); return a; },{});
Object.entries(byFile).forEach(([f,hits])=>{
  console.log(`\n${f.endsWith('.js')?'📜':f.endsWith('.css')?'🎨':'📄'}  ${f} (${hits.length})`);
  hits.forEach(h=>console.log(`  L${String(h.line).padEnd(5)} ${h.text.slice(0,100)}`));
});
console.log(`\n${results.length} hit(s) in ${Object.keys(byFile).length} file(s)`);
```

### `scripts/audit-node-access.js`
Detects incorrect `this.nodes.*` access patterns.

```js
#!/usr/bin/env node
const fs = require('fs');
const content = fs.readFileSync('static/FeastArchitect/js/modules/feast-diagram.js','utf8');
const lines = content.split('\n');
const NM_OK = new Set(['addDataSource','addEntity','addFeatureView','addService',
  'addConnection','removeNode','removeEdge','updateNode','getNodesByType','getBounds',
  'getUsedByCount','getPortPosition','clear','importFromJSON','exportToJSON','generateId',
  'get','has','set','forEach','values','keys','entries','delete',
  'nodes','edges','databaseTypes','counters','config']);

const issues = [], warns = [];
lines.forEach((line,i) => {
  const n = i+1; const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*')) return;
  if (/this\.nodes\.nodes\.nodes\./.test(line))
    issues.push({n, msg:'TRIPLE DEREF', t});
  if (/this\.nodes\.size\b/.test(line))
    issues.push({n, msg:'this.nodes.size — no passthrough, use this.nodes.nodes.size', t});
  const m = line.match(/this\.nodes\.(?!nodes\.)([a-zA-Z_$][\w$]*)/);
  if (m && !NM_OK.has(m[1]))
    warns.push({n, msg:`this.nodes.${m[1]} — verify NodeManager has this`, t});
});

const trips = (content.match(/this\.nodes\.nodes\./g)||[]).length;
const direct = (content.match(/this\.nodes\.(?!nodes\.)/g)||[]).length;
console.log('\n═══ Node Access Audit ═══');
console.log(` this.nodes.nodes.* (direct Map): ${trips}`);
console.log(` this.nodes.*       (NM or pass): ${direct}`);
if (issues.length) { console.log(`\n❌ ISSUES:`); issues.forEach(x=>console.log(`  L${x.n}: ${x.msg}\n  → ${x.t}`)); }
else console.log('\n✅ No critical node access issues');
if (warns.length) { console.log(`\n⚠️  WARNINGS (${warns.length}):`); warns.slice(0,8).forEach(x=>console.log(`  L${x.n}: ${x.msg}`)); }
```

### `scripts/validate-features.js`
Checks `example-data.js` for transformation quote issues and invalid type values.

```js
#!/usr/bin/env node
const fs = require('fs');
const content = fs.readFileSync('static/FeastArchitect/js/modules/example-data.js','utf8');
const VALID_TYPES = new Set(['Int8','Int16','Int32','Int64','Float32','Float64',
  'String','Bool','Bytes','UnixTimestamp','Array','Map','Null','Unknown']);
const lines = content.split('\n');
const issues = [];
lines.forEach((line,i) => {
  const n=i+1, t=line.trim();
  const sm = t.match(/^transformation:\s*'(.*)'/);
  if (sm && sm[1].includes("'"))
    issues.push({n, sev:'error', msg:"Single-quoted transformation contains inner quotes — use double quotes", t});
  const cm = t.match(/completeness:\s*([\d.]+)/);
  if (cm && (parseFloat(cm[1])<0 || parseFloat(cm[1])>100))
    issues.push({n, sev:'error', msg:`completeness ${cm[1]} out of 0-100 range`, t});
  const tm = t.match(/^\s*type:\s*['"]([^'"]+)['"]/);
  if (tm && !t.includes('dbType') && !VALID_TYPES.has(tm[1]))
    issues.push({n, sev:'warn', msg:`Unknown feature type: "${tm[1]}"`, t});
});
const errs = issues.filter(x=>x.sev==='error');
const wrns = issues.filter(x=>x.sev==='warn');
if (errs.length) { console.log(`\n❌ ERRORS (${errs.length}):`); errs.forEach(x=>console.log(`  L${x.n}: ${x.msg}\n  → ${x.t}`)); }
if (wrns.length) { console.log(`\n⚠️  WARNINGS (${wrns.length}):`); wrns.forEach(x=>console.log(`  L${x.n}: ${x.msg}`)); }
if (!errs.length && !wrns.length) console.log('\n✅  No issues found');
```

---

## Quick Reference

```
ACCESSING NODES:
  this.nodes.nodes.get(id)           ← look up by ID
  this.nodes.nodes.has(id)           ← existence check
  this.nodes.nodes.size              ← count
  this.nodes.nodes.forEach(fn)       ← iterate (node, id)
  this.nodes.nodes.values()          ← iterator
  this.nodes.addFeatureView(cfg)     ← create (returns new ID)
  this.nodes.addConnection(a, b)     ← add edge
  this.nodes.edges                   ← edges Array { from, to, id, animated }

CANVAS STATE (proxied to this.renderer):
  this.ctx          == this.renderer.ctx
  this.scale        == this.renderer.scale
  this.offsetX/Y    == this.renderer.offsetX/Y

PANEL MODES:
  showPanel(id)         → open + wide     (node view, 560px single col)
  showFeatureBrowser()  → open + fb-mode  (catalog, 900px)
  showNodesByType(t)    → open + fb-mode  (node browser for one type)
  closePanel()          → removes all three classes

MODAL OPEN/CLOSE:
  elem.classList.add('active')    ← open
  elem.classList.remove('active') ← close

MODAL IDs:
  #featureDetailModal  #componentModal  #settingsModal
  #statsModal  #dataFlowModal  #pushRepoModal  #guideModal

CSRF TOKEN:
  window.DJANGO_CONTEXT.csrfToken

FEATURE TYPE COLORS:
  Int*  → #60a5fa   Float* → #f59e0b   String → #a78bfa
  Bool  → #34d399   Bytes  → #fb923c   Timestamp → #f472b6

SERVICE.FEATURES CONTAINS FV IDs NOT FEATURE OBJECTS:
  // featureview node:  node.features = [ {name, type, ...}, ... ]
  // service node:      node.features = [ 'featureview_1', 'featureview_2' ]

FEATURE HIGHLIGHT:
  this._featureHighlightIds = new Set([nodeId1, nodeId2])  ← canvas glows amber
  this._featureHighlightIds = null                          ← clear

TRANSFORMATION STRINGS — always double-quote:
  transformation: "SUM(x) WHERE y = 'done'",   ← ✅
  transformation: 'SUM(x) WHERE y = 'done'',   ← ❌ SyntaxError

EDGE FIELDS:  { from, to, id, animated }  — NOT source/target

SYNTAX CHECK (run after every JS edit):
  node --check static/FeastArchitect/js/modules/feast-diagram.js

SEARCH:
  node scripts/find.js "search-term"

AUDIT:
  node scripts/audit-methods.js
  node scripts/audit-node-access.js

LLM PANEL DEFAULT SIZE:
  width: 775px  height: 775px  bottom: 140px  centered
  Resize: drag any of 5 handles (N, E, W, NE, NW edges)
  Minimize: collapses to 52px pill, click to restore
```

---

*Last updated: reflects full codebase state after UI session — single-column detail panel, service FV name fix, canvas highlight system, LLM panel resize/minimize redesign, stats bar per-type navigation, feature edit icons, and feature count fix. Update this document whenever making structural changes.*
