# FeastArchitect — Complete LLM Developer Reference

> **If you are an LLM or developer picking up this codebase:**  
> Read this entire document before modifying any file. It contains hard-won knowledge
> from the full migration and feature development sessions, including every significant
> bug pattern encountered. Ignoring it will cost you hours.

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
13. [Canvas & Rendering](#13-canvas--rendering)
14. [DOM ID Reference](#14-dom-id-reference)
15. [CSS Architecture](#15-css-architecture)
16. [JSON Import/Export Format](#16-json-importexport-format)
17. [Django Integration](#17-django-integration)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [⚠️ All Known Bug Patterns](#19-️-all-known-bug-patterns)
20. [How-To Patterns for Common Tasks](#20-how-to-patterns-for-common-tasks)
21. [Method Index](#21-method-index)
22. [Diagnostic Scripts](#22-diagnostic-scripts)

---

## 1. What This Project Is

FeastArchitect is a **browser-based visual diagram editor** for designing [Feast](https://feast.dev/) feature store architectures. It is a Django app that serves a single-page canvas tool.

**What users do:**
- Drag, drop, and connect four node types: Data Source, Entity, Feature View, Feature Service
- Inspect any node in a rich side panel that shows metadata, lineage, and schema
- Browse, search, and filter **all features** across every Feature View in a global catalog
- Click any feature to view/edit its full rich metadata (descriptions, types, tags, serving config, quality metrics, statistics, security classification, transformation SQL, and more)
- Generate Python/YAML Feast code from the diagram
- Ask an LLM assistant about the architecture

**Tech stack:**
- Backend: Django (templates + REST API at `/api/`)
- Frontend: Vanilla JS ES6 classes, no bundler, no framework, no TypeScript
- Canvas: HTML5 Canvas 2D API  
- Styles: CSS custom properties in one `main.css` file (~4600 lines)
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
│   │   └── main.css                        ← ALL styles (4600+ lines, one file)
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
│           └── feast-diagram.js            ← FeastDiagram class — THE MAIN FILE (6463 lines)
│
└── templates/FeastArchitect/
    ├── architect.html                      ← Main page (extends base.html)
    ├── base.html                           ← Layout shell, loads CSS/JS, has #featHoverPopover
    ├── includes/
    │   ├── _django_context.html            ← Injects window.DJANGO_CONTEXT from Django
    │   └── _styles.html                    ← Additional inline <style> blocks
    └── components/
        ├── _canvas_area.html               ← <canvas id="diagramCanvas">
        ├── _detail_panel.html              ← #detailPanel (right side panel)
        ├── _toolbar.html                   ← Top toolbar buttons
        ├── _stats_bar.html                 ← Bottom stats (nodes/features/etc.)
        ├── _tooltip.html                   ← Canvas hover tooltip (#tooltip)
        ├── _modals.html                    ← Includes all modal partials
        ├── _fab_menu.html                  ← Floating action button
        ├── _llm_panel.html                 ← LLM assistant slide-in panel
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
  features: [ /* see Section 8 */ ]
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
  features: ['featureview_1', 'featureview_2'],    // FV IDs this service exposes
  featureServices: []                               // Other service IDs composed in
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

Features live in `node.features[]` on `featureview` and `service` nodes. The system supports two formats — old simple and new rich — simultaneously.

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
- `_buildFeatureCard` (L1982)
- `_buildRichFeatureCard` (L6302)
- `_openFeatureModal` (L5832)
- `_showFeatPopover` (L6148)

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

Feature Explorer — right col of panel when FV/service selected
  └── _buildFeatureExplorer(node, nodeId)
      └── _buildFeatureCard(f, idx, nodeId)      ← compact card
          ├── hover → _showFeatPopover()           ← rich floating popover
          └── click → _openFeatureModal()          ← full 5-tab modal

Feature Catalog — showFeatureBrowser()
  └── ALL features from ALL FVs in one scrollable list
      └── _buildRichFeatureCard(f, idx, nodeId, nodeName, nodeSubtype)
          ├── shows ALL metadata inline — no click needed
          ├── hover → _showFbPopover() → _showFeatPopover()
          └── click → _openFeatureModal()
```

---

## 9. The Detail Panel System

The right-side panel (`#detailPanel`) has **two distinct modes** controlled by CSS classes and header visibility.

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
  └── #panelContent
        └── .panel-wide-layout (860px, flex row)
              ├── #panelLeftCol  (340px fixed) ← _buildNodeDetails()
              └── #panelRightCol (flex:1)      ← depends on node.type:
                    featureview/service  → _buildFeatureExplorer()
                    datasource           → _buildDatasourceRight()
                    entity               → _buildEntityRight()
                    other                → empty state
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
| `.side-panel.wide` | 860px | node view (two columns) |
| `.side-panel.fb-mode` | 900px | feature catalog (full width) |

`closePanel()` removes **all three** active classes plus resets headers.

### The ⚡ All Features button

- DOM: `#panelFeatCatalogBtn` in `_detail_panel.html`
- CSS class: `.catalog-btn` (green tinted style)
- Visibility: hidden by default, shown by `_setupPanelForNode(node)` when any node is selected
- Action: calls `diagram.showFeatureBrowser()`

### _setupPanelForNode(node)

Called at the top of `showPanel()`. Shows `#panelNodeHeader`, hides `#panelFbHeader`, and controls visibility of action buttons (e.g., the All Features button).

---

## 10. The Feature Catalog Browser

`showFeatureBrowser()` (L6232) collects every feature from every `featureview` node, builds filter pills from the actual data, and renders `.rfc` cards.

### What each .rfc card shows (all visible without clicking)

1. Color dot + feature name (monospace bold)
2. Type chip (color-coded border/background)
3. PII, online, offline, classification badge chips
4. Source Feature View name (right-aligned, muted)
5. "Click to edit →" hint (opacity 0, appears on hover)
6. Description text (if present)
7. Transformation SQL (green monospace with left border accent, if present)
8. Metadata row: source column · owner · TTL · freshness · default value
9. Stat chips: mean · distinct count · null count (nulls highlighted red)
10. Tags as pill chips
11. Completeness % + progress bar (right edge)

### Filter pills

Pills are dynamically generated from the data:
- One pill per unique type (e.g., `Int64`, `String`, `Float32`)
- One pill per unique owner (up to 5)
- `🔒 PII` pill (only if any feature has `security.pii: true`)
- `⚡ Online` — features with `serving.online: true`
- `💾 Offline` — features with `serving.offline: true`

Filters are **stackable** (multiple can be active simultaneously). `_fbFilter()` implements AND logic across all active filters + search text.

### Search

`#fbSearchInput` filters by:
- `data-name` (feature name, lowercased)
- `data-type` (type string)
- `data-owner` (owner, lowercased)  
- `data-tags` (comma-joined tags, lowercased)

Note: transformation text is NOT currently searched (could be added to `_fbFilter`).

---

## 11. The Feature Detail Modal

Template: `templates/.../modals/_feature_detail_modal.html`  
DOM ID: `#featureDetailModal`  
Opened by: `_openFeatureModal(nodeId, idx)` (L5832)

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

### View mode — 5 tabs

| Tab | data-tab | Contents |
|---|---|---|
| Overview | `overview` | name, type, owner, sourceColumn, defaultValue, transformation (code block), description, tags |
| Serving & Validation | `serving` | online/offline toggles, TTL, min/max/nullable validation |
| Quality | `quality` | freshness, completeness progress bar, accuracy progress bar |
| Security | `security` | PII flag, sensitive flag, classification |
| Statistics | `stats` | mean, stdDev, min, max (Distribution) + nullCount, distinctCount, totalCount (Coverage) |

Tabs are rendered by `_renderFdmTab(tab, f, node)` (L5887) into `#fdmTabContent`.

### Edit mode

Toggled by `_toggleFeatureEdit()` → shows `#fdmEditMode`, hides `#fdmViewMode`.

Edit fields generated by `_renderFdmEditForm(f)` (L6032) into `#fdmEditGrid`:

| Field ID | Type | Maps to |
|---|---|---|
| `fdmF_name` | input | `f.name` |
| `fdmF_type` | input (mono) | `f.type` |
| `fdmF_owner` | input | `f.owner` |
| `fdmF_sourceColumn` | input (mono) | `f.sourceColumn` |
| `fdmF_defaultValue` | input (mono) | `f.defaultValue` |
| `fdmF_description` | textarea | `f.description` |
| `fdmF_tags` | input (comma-separated) | `f.tags[]` |
| `fdmF_transformation` | textarea (mono) | `f.transformation` |
| `fdmT_serveOnline` | toggle | `f.serving.online` |
| `fdmT_serveOffline` | toggle | `f.serving.offline` |
| `fdmF_serveTtl` | input | `f.serving.ttl` |
| `fdmF_valMin` | input | `f.validation.min` |
| `fdmF_valMax` | input | `f.validation.max` |
| `fdmT_valNullable` | toggle | `f.validation.nullable` |
| `fdmT_secPii` | toggle | `f.security.pii` |
| `fdmT_secSensitive` | toggle | `f.security.sensitive` |
| `fdmF_secClass` | input | `f.security.classification` |
| `fdmF_qualFreshness` | input | `f.quality.freshness` |
| `fdmF_qualCompleteness` | input | `f.quality.completeness` |
| `fdmF_qualAccuracy` | input | `f.quality.accuracy` |
| `fdmF_statMean` | input | `f.statistics.mean` |
| `fdmF_statStdDev` | input | `f.statistics.stdDev` |
| `fdmF_statNullCount` | input | `f.statistics.nullCount` |
| `fdmF_statDistinct` | input | `f.statistics.distinctCount` |

**Toggle switches** use `.fdm-switch` + `.on` class. Clicking toggles the `.on` class. `_saveFeatureEdit` reads them with `classList.contains('on')`.

### Closing

- `✕` button: calls `diagram._closeFeatureModal()`
- Overlay click: `onclick="if(event.target===this) diagram._closeFeatureModal()"`
- Escape key: handled in `bindEvents()` — checks `#featureDetailModal.active` FIRST before other Escape handlers

---

## 12. The Hover Popover System

The hover popover (`#featHoverPopover`) is a floating card defined in `base.html` (not inside `#detailPanel`). It has `pointer-events: none`.

### Three entry points

```js
_showFeatPopover(nodeId, idx, el)    // Called from feature cards in FV panel right col
_showFbPopover(nodeId, idx, el)      // Called from .rfc cards in catalog — delegates to above
_showColPopover(nodeId, idx, el)     // Called from schema columns in datasource right col
```

### Positioning logic (_showFeatPopover, L6148)

1. Gets `el.getBoundingClientRect()` (the card that triggered hover)
2. Gets `#detailPanel.getBoundingClientRect()` for the panel's left edge
3. Tries to position **left of the panel**: `left = panelRect.left - popoverWidth - 12`
4. If that would go off-screen (left < 8px): falls back to **right of the card**: `left = rect.right + 10`
5. Vertical: aligns to card top, clamped to viewport

### What the popover shows

- Color dot + feature name (large)
- Type string
- Description (if present)
- Key-value grid: Owner, Source col, TTL, Completeness, Freshness, Mean, Distinct count
- Badges: PII, classification, online, offline
- Transformation SQL snippet (truncated to 80 chars if long)
- Footer: "Click to view full details"

Hidden by `_hideFeatPopover()` which removes the `.visible` class from `#featHoverPopover`.

---

## 13. Canvas & Rendering

### Render loop

```js
animate() {
  this.render();
  if (this.config.miniMapEnabled) this.renderMiniMap();
  requestAnimationFrame(() => this.animate());
}
```

This runs at ~60fps continuously. All canvas drawing happens here. DOM updates happen separately.

### Coordinate system

- **World coordinates**: where nodes live (node.x, node.y)
- **Screen coordinates**: pixel position on canvas element

Conversion:
```js
screenToWorld(sx, sy) {
  return {
    x: (sx - this.offsetX) / this.scale,
    y: (sy - this.offsetY) / this.scale
  };
}
// Inverse: worldX * scale + offsetX = screenX
```

### Drawing a node

```
drawNode(node, config)
  ├── draws shadow, rounded rect, header bar
  ├── draws type-specific icon, name text
  ├── calls drawNodeContent(node, config)  ← routes by type
  │     ├── featureview → drawFeatureViewContent(node, config, contentY)
  │     ├── service     → drawServiceContent(node, config, contentY)
  │     ├── entity      → drawEntityContent(node, config, contentY)
  │     └── datasource  → drawDataSourceContent(node, config, contentY)
  └── drawNodePorts(node, config)
```

### Node dimensions (from `config.js`)

```js
DIMENSIONS = {
  nodeWidth: 200,
  nodeHeight: 100,   // base — actual height varies with content
  portRadius: 6
}
```

Nodes expand vertically based on feature count. Check `drawFeatureViewContent` for the exact height calculation.

### Selection visual

When `this.selectedNode === id`, `drawNode` draws an additional glow ring using `config.light` color.

---

## 14. DOM ID Reference

### Static IDs (defined in HTML templates)

| ID | Template | Purpose |
|---|---|---|
| `diagramCanvas` | `_canvas_area.html` | The main canvas element |
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
| `fdmViewMode` | `_feature_detail_modal.html` | Tab view container |
| `fdmEditMode` | `_feature_detail_modal.html` | Edit form container |
| `fdmTabContent` | `_feature_detail_modal.html` | Tab content area |
| `fdmEditGrid` | `_feature_detail_modal.html` | Edit form grid |
| `componentModal` | `_component_modal.html` | Add/Edit node modal |
| `modalTitle` | `_component_modal.html` | Modal title |
| `modalBody` | `_component_modal.html` | Modal form body |
| `tooltip` | `_tooltip.html` | Canvas hover tooltip |
| `tooltipIcon` | `_tooltip.html` | Node icon in tooltip |
| `tooltipTitle` | `_tooltip.html` | Node name in tooltip |
| `tooltipSubtitle` | `_tooltip.html` | Type/subtype in tooltip |
| `tooltipTags` | `_tooltip.html` | Tags section (hidden if empty) |
| `tooltipFeatures` | `_tooltip.html` | Features section |
| `tooltipFeatureMeta` | `_tooltip.html` | PII/online stats line |
| `notification` | `base.html` | Toast notification |
| `searchInput` | `_toolbar.html` | Global search input |
| `miniMap` | `_canvas_area.html` | Minimap container |
| `miniMapCanvas` | `_canvas_area.html` | Minimap canvas |

### Dynamic IDs (injected by JS via innerHTML)

These don't exist in templates — they're created by JS:

| ID | Created by | Purpose |
|---|---|---|
| `panelLeftCol` | `showPanel()` | Left column of two-col layout |
| `panelRightCol` | `showPanel()` | Right column of two-col layout |
| `featSearchInput` | `_buildFeatureExplorer()` | Search in FV feature list |
| `featTypeFilters` | `_buildFeatureExplorer()` | Type filter pills row |
| `fbSearchInput` | `showFeatureBrowser()` | Catalog search input |
| `fbFilters` | `showFeatureBrowser()` | Catalog filter pills |
| `fbStats` | `showFeatureBrowser()` | "42 features" count |
| `fbList` | `showFeatureBrowser()` | Catalog card list |
| `fdmEditGrid` | `_renderFdmEditForm()` | Edit form grid (cleared and rebuilt each open) |
| `inputName`, `inputKind`, etc. | `openModal()` | Add/Edit form fields |
| `featuresList`, `tagsList`, `tagInput` | `openModal()` | Features/tags edit lists |

---

## 15. CSS Architecture

All CSS is in `static/FeastArchitect/css/main.css` (~4600 lines). No preprocessor. No CSS-in-JS.

### CSS Custom Properties

```css
/* Dark theme (default) */
--bg-primary        /* darkest, canvas background */
--bg-secondary      /* cards, panels */
--bg-tertiary       /* inputs, hover states */
--border-color      /* all borders */
--text-primary      /* main text */
--text-secondary    /* body text */
--text-muted        /* labels, metadata, placeholders */
--feast-green       /* #10b981 — primary accent, all interactive highlights */
--feast-blue        /* #3b82f6 */
--feast-purple      /* #8b5cf6 */
--feast-orange      /* #f97316 */
--feast-red         /* #ef4444 */
--feast-yellow      /* #eab308 */
--grid-color        /* canvas dot grid */
--shadow-lg         /* panels/modals box-shadow */
--shadow-glow       /* glow effect on selected nodes */
--code-bg           /* code block backgrounds */
```

### CSS Class Family Reference

| Prefix | Component | ~Count |
|---|---|---|
| `.feat-*` | Feature explorer (right col of FV panel) | 46 |
| `.fdm-*` | Feature detail modal | 40 |
| `.rfc-*` | Rich feature cards in catalog | 30 |
| `.feature-*` | Generic feature list elements | 21 |
| `.fb-*` | Feature catalog browser container | 13 |
| `.panel-*` | Side panel structure | 19 |
| `.code-*` | Code editor panel | 24 |
| `.llm-*` | LLM assistant panel | 17 |
| `.edge-*` | Edge manager panel | 17 |
| `.search-*` | Search dropdown | 17 |
| `.tooltip-*` | Canvas hover tooltip | 12 |
| `.modal-*` | Modal overlays | 9 |
| `.btn-*` | Buttons | 8 |
| `.toolbar-*` | Top toolbar | 7 |

### Rules for CSS changes

1. **Always append** new CSS to the end of `main.css`. Never reorganize existing sections.
2. Dark theme is the only fully-implemented theme. CSS variables in `:root` handle it.
3. Do NOT use Django template syntax (`{% static %}`, `{{ var }}`) in `.css` files — Django does not process static files.
4. Mobile breakpoints are at the bottom of the file. Keep them there.

---

## 16. JSON Import/Export Format

```js
// Export (exportToJSON, L4263):
{
  nodes: [ ['entity_1', {...nodeObject}], ['featureview_1', {...}], ... ],  // Array.from(Map.entries())
  edges: [ { id: 'entity_1->fv_1', from: 'entity_1', to: 'featureview_1', animated: false }, ... ],
  exportDate: '2025-01-01T00:00:00.000Z',
  version: '3.0'
}
```

**Import (`importFromJSON`, L5208)** accepts both:
- Array format: `nodes: [ ['id', node], ... ]` (output of `Array.from(entries())`)
- Object format: `nodes: { 'id': node, ... }` (plain object)

After import, it rebuilds `inputs`/`outputs` arrays on all nodes from the edges array. ID counters are also updated to avoid collisions.

**Export does NOT call the API** — it's a local browser download via `downloadJSON()`.

---

## 17. Django Integration

### Context injection

`_django_context.html` runs inside a Django template and injects:

```js
window.DJANGO_CONTEXT = {
  repoId: null,           // int | null — null means "no repo, use example data"
  repoName: '',
  repoError: '',
  apiBaseUrl: '/api',
  user: {
    id: null, username: '', email: '', firstName: '', lastName: ''
  },
  csrfToken: '...'        // Django {% csrf_token %} value
}
```

### CSRF

All POST/PUT/DELETE calls need the CSRF token in the `X-CSRFToken` header. The `APIClient` reads it from `window.DJANGO_CONTEXT.csrfToken` (with fallbacks to cookie and meta tag).

**⚠️ Header merge bug (was fixed, don't re-introduce):**
```js
// ❌ Wrong — spreading options AFTER headers lets options overwrite X-CSRFToken
fetch(url, { headers: { 'X-CSRFToken': token }, ...options })

// ✅ Correct — merge headers explicitly
fetch(url, {
  ...options,
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': this.getCsrfToken(),
    ...(options.headers || {}),
  }
})
```

### Django template in `.css` and `.js` files

**Doesn't work.** Django only processes template files (`.html`, configured templates). Static files served directly do not go through the template engine. If you need a dynamic value in CSS or JS, inject it via `_django_context.html` and read it from `window.DJANGO_CONTEXT`.

### Static files

In templates, always use `{% load static %}` and `{% static '...' %}`. Never hardcode `/static/` paths.

---

## 18. Keyboard Shortcuts

Registered in two separate listeners (both in `feast-diagram.js`):

| Key | Action |
|---|---|
| `Escape` | Close feature modal (checked FIRST), then close all panels/modals |
| `Delete` | Delete selected node |
| `Ctrl/Cmd + F` | Focus search input |
| `Ctrl/Cmd + S` | Export JSON download |
| `Ctrl/Cmd + Shift + A` | Toggle LLM helper panel |
| `Ctrl/Cmd + Shift + D` | Toggle Django admin panel |

Note: There are two keydown listeners (one in `bindEvents`, one in `setupKeyboardShortcuts`). The feature modal Escape check is in `bindEvents` and runs first.

---

## 19. ⚠️ All Known Bug Patterns

These bugs have all been encountered and fixed at least once. Know them.

### Bug 1: NodeManager vs Map confusion
See Section 6. The #1 issue. `this.nodes.size` is `undefined`. Use `this.nodes.nodes.size`.

### Bug 2: Triple dereference after regex replace
Running `this\.nodes\.` → `this.nodes.nodes.` on lines that already have `this.nodes.nodes.` creates `this.nodes.nodes.nodes.`. Always check the output of any mass find-replace.

### Bug 3: CSRF token overwritten in fetch options spread
See Section 17. Spread `...options` BEFORE headers, then declare headers explicitly after.

### Bug 4: `getSubtypeColor` called without `this`
In drawing methods, `getSubtypeColor(node.subtype)` is a method call, not a global function. Must be `this.getSubtypeColor(node.subtype)`.

### Bug 5: `_fdmContext` nulled before timeout fires
In `_saveFeatureEdit`, the pattern `const savedCtx = {...this._fdmContext}` → `this.showPanel()` → `this._fdmContext = savedCtx` → `setTimeout(re-open, 60)` must restore context both outside AND inside the timeout. If you set `this._fdmContext = null` anywhere between those steps, the re-open silently does nothing.

### Bug 6: Transformation strings with inner single quotes
```js
// ❌ SyntaxError
transformation: 'SUM(x) WHERE y = 'done'',
// ✅ Fixed
transformation: "SUM(x) WHERE y = 'done'",
```

### Bug 7: Methods stubbed during monolith split — but many small methods are LEGITIMATE

The `audit-methods.js` script flags methods ≤4 lines as potential stubs. When you run it, you'll see ~30 small methods flagged. **Most of these are intentionally small.** Known legitimate short methods include:

```
getRepoSettings()       → returns this.repoSettings (1-liner, correct)
zoomIn() / zoomOut()    → calls renderer (1-liner, correct)
isNodeVisible()         → simple bounds check
hideTooltip()           → sets display:none (1-liner)
editSelected()          → calls showEditModal(selectedNode)
confirmDelete()         → calls deleteSelected with confirm dialog
_hideFeatPopover()      → removes .visible class
_closeFeatureModal()    → removes .active class, clears _fdmContext
escapeRegex()           → single line regex escape
truncateText()          → string slice
```

**Real stubs** look like: `methodName() { return null; }` or `methodName() { /* TODO */ }`. The `audit-methods.js` script is a starting point — use judgment.
When the original single-file `architect.html` was split into modules, some methods were accidentally truncated to just a signature + `return null`. Short methods (< 5 lines) that should have logic are suspect. Use `node scripts/audit-methods.js` to detect.

### Bug 8: CSS using Django template syntax
`{% static 'img.png' %}` in a `.css` file silently outputs nothing. The background-image just won't load. Use inline styles via `_styles.html` for dynamic values, or hardcode absolute paths.

### Bug 9: Wrong indentation after extraction
Methods extracted from the original had 20-space interior indentation instead of 8-space. This causes no runtime error but produces deeply inconsistent code. Run `node --check` to verify syntax, and visually inspect structure.

### Bug 10: New modal not included in `_modals.html`
A modal `.html` file does nothing unless included. After creating any new modal file, add `{% include "FeastArchitect/components/modals/_your_modal.html" %}` to `_modals.html`.

### Bug 11: Panel stuck in wrong width
`showPanel` adds `wide`. `showFeatureBrowser` adds `fb-mode` and removes `wide`. `closePanel` removes both. If these get out of sync (e.g. an error during `showFeatureBrowser` prevents the class removal), the panel will open at the wrong width. Fix: always check `closePanel()` runs `panel.classList.remove('open', 'wide', 'fb-mode')`.

### Bug 12: `loadComplexExample` is a standalone function, not a method
`example-data.js` exports a standalone function (not a class method). It's called in `loadInitialData` as:
```js
loadComplexExample(this.nodes, (from, to) => this.nodes.addConnection(from, to), () => this.autoLayout());
```
It is NOT `this.loadComplexExample()`. The method `loadComplexExample()` in `FeastDiagram` (L5257) is a *different* method that creates another example via `this.addDatasource(...)` etc.

### Bug 13: Edges use `from`/`to`, not `source`/`target`
The codebase is consistent: edges always have `{ from, to }`. Never use `source`/`target` for edge endpoints.

### Bug 14: `openModal()` dynamically creates form field IDs
`inputName`, `inputDescription`, `inputKind`, etc. do not exist in the DOM until `openModal()` is called. If you try to `getElementById('inputName')` outside of the modal flow, it returns null.

---

## 20. How-To Patterns for Common Tasks

### Add a new field to feature rich metadata

1. Add to feature schema docs (this README, Section 8)
2. Display in `_buildFeatureCard` (compact FV panel card, L1982)
3. Display in `_buildRichFeatureCard` (catalog card, L6302)
4. Display in `_renderFdmTab` under the appropriate tab (L5887)
5. Add edit input in `_renderFdmEditForm` (L6032) with ID pattern `fdmF_fieldname` or `fdmT_fieldname`
6. Read and save in `_saveFeatureEdit` (L6104) using `g('fieldname')` or `tog('fieldname')`
7. Optionally surface in `_showFeatPopover` for the hover preview (L6148)

### Add a new panel action button

1. Add `<button>` to `_detail_panel.html` inside `#panelNodeHeader .panel-actions`
2. Style with `.panel-action-btn` base class (optionally add modifier like `.catalog-btn`)
3. Control visibility in `_setupPanelForNode(node)` (L6452):
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
       <!-- content -->
     </div>
   </div>
   ```
2. Add `{% include "FeastArchitect/components/modals/_my_modal.html" %}` to `_modals.html`
3. Append CSS to `main.css`
4. Add `openMyModal()` / `closeMyModal()` to FeastDiagram:
   ```js
   openMyModal() { document.getElementById('myModal').classList.add('active'); }
   closeMyModal() { document.getElementById('myModal').classList.remove('active'); }
   ```
5. Add Escape key handling in `bindEvents()` — check BEFORE the generic Escape handler

### Add a new node type

1. Add to `NODE_CONFIG` in `config.js`
2. Add `addMyType(config)` to `NodeManager` following the pattern of existing add methods
3. Add delegation in `FeastDiagram.addMyType(config)` → `this.nodes.addMyType(config)`
4. Add `drawMyTypeContent(node, config, contentY)` method in FeastDiagram
5. Add case to `drawNodeContent()` switch
6. Add right-column builder `_buildMyTypeRight(node, nodeId)` 
7. Add case in `showPanel()` for right column routing
8. Add case in `openModal(type)` for the Add/Edit form
9. Add case in `saveComponent()` for saving the edit form
10. Add case in `generateCodeExample(node)` for code output
11. Add to `visibleLayers` in FeastDiagram constructor
12. Add to `updateLayerToggles()` and `_buildNodeDetails()` if needed

### Add a new tab to the Feature Detail Modal

1. Add `<button class="fdm-tab" data-tab="mytab" onclick="diagram._switchFdmTab(this,'mytab')">My Tab</button>` to `_feature_detail_modal.html`
2. Add an `else if (tab === 'mytab')` block in `_renderFdmTab()` (L5887)
3. Use the helper closures already defined at the top of `_renderFdmTab`: `row(k, v, cls)`, `sec(title, rows, fullWidth)`, `progressBar(label, val)`

### Modify which features are shown in the right column filter

Edit `_filterFeatures(query)` (L2033) for the FV panel right column, or `_fbFilter()` (L6410) for the catalog. Both read `data-*` attributes set on the card elements.

---

## 21. Method Index

All 181 methods in `feast-diagram.js` grouped by category with line numbers.

### Core / Lifecycle (72 methods)
| Method | Line | Size | Notes |
|---|---|---|---|
| `constructor` | 25 | 43 | inits modules, sets up proxy, calls init() |
| `initializeModules` | 74 | 25 | creates all sub-module instances |
| `initializeRepoSettings` | 134 | 10 | reads window.DJANGO_CONTEXT |
| `init` | 168 | 28 | resize, bindEvents, setupSearch, loadInitialData, animate |
| `loadInitialData` | 227 | 14 | async — loads from backend OR example data |
| `initializeUser` | 202 | 19 | reads user from DJANGO_CONTEXT |
| `animate` | 256 | 8 | requestAnimationFrame render loop |
| `bindEvents` | 653 | 27 | canvas mouse events + keydown |
| `setupKeyboardShortcuts` | 719 | 32 | additional keyboard shortcuts |
| `selectNode` | 899 | 5 | sets selectedNode, calls showPanel |
| `closePanel` | 909 | 9 | removes open/wide/fb-mode, resets headers |
| `deleteSelected` | 923 | 13 | removes node + connected edges |
| `autoLayout` | 981 | 47 | calls this.layout.calculate() |
| `fit` / `animateFit` | 1033/1050 | — | zoom to fit all nodes |
| `openModal` | 2056 | 230 | builds add/edit form HTML by type |
| `saveComponent` | 2288 | 135 | reads form, updates/creates node |
| `editSelected` | 2543 | 4 | calls showEditModal(selectedNode) |
| `exportToJSON` | 4263 | 7 | returns { nodes, edges, date, version } |
| `importFromJSON` | 5208 | 46 | loads from JSON object, rebuilds graph |
| `loadComplexExample` | 5257 | 441 | builds large example via addDatasource/addEntity/etc. |
| `getCsrfToken` | 5140 | 27 | DJANGO_CONTEXT → cookie → meta tag |
| `getSubtypeColor` | 5180 | 7 | returns hex color for FV subtype |
| `getUsedByCount` | 5190 | 8 | counts how many nodes use a given node |
| `screenToWorld` | 5777 | 5 | convert screen px to canvas world coords |
| `_setupPanelForNode` | 6452 | 6 | shows #panelNodeHeader, controls button visibility |

### Show / Close (17 methods)
| Method | Line | Notes |
|---|---|---|
| `showPanel` | 1680 | L1680 — always opens `wide`, routes right col by node type |
| `showFeatureBrowser` | 6232 | opens `fb-mode`, collects all FV features, builds catalog |
| `closePanel` | 909 | removes open/wide/fb-mode |
| `showAddModal` / `showEditModal` | 1540/1549 | calls openModal() |
| `showStatsModal` | 2480 | builds stats modal content |
| `showDataFlow` | 2605 | builds data flow stages |
| `showTooltip` | 3736 | canvas hover tooltip |
| `showNotification` | 3823 | toast notification |
| `showGuide` | 2666 | guide modal |
| `showUserSelector` | 3590 | user selector modal |
| `closeModal` | 2425 | closes #componentModal |

### Canvas Draw (9 methods)
| Method | Line | Notes |
|---|---|---|
| `drawEdges` | 292 | draws all edges with arrows |
| `drawNode` | 356 | draws one node — shadow, rect, header, ports |
| `drawNodeContent` | 471 | routes to type-specific draw method |
| `drawFeatureViewContent` | 501 | — |
| `drawServiceContent` | 521 | — |
| `drawEntityContent` | 540 | — |
| `drawDataSourceContent` | 550 | — |
| `drawNodePorts` | 568 | draws input/output ports |

### Canvas Render (12 methods)
| Method | Line | Notes |
|---|---|---|
| `render` | 269 | clears canvas, draws grid, draws edges, draws nodes |
| `renderMiniMap` | 590 | draws minimap |
| `renderEdgeManager` | 3254 | renders edge manager panel content |
| `renderFeaturesList` | 3530 | modal features list |
| `renderTagsList` | 3545 | modal tags list |
| `renderSearchResults` | 3851 | search dropdown |
| `renderPythonFiles` | 1597 | code editor file list |

### Feature System (16 methods)
| Method | Line | Notes |
|---|---|---|
| `_buildFeatureExplorer` | 1947 | FV right col — search + type pills + cards |
| `_buildFeatureCard` | 1982 | compact card for FV panel |
| `_buildRichFeatureCard` | 6302 | full-detail card for catalog |
| `_filterFeatures` | 2033 | filters cards in FV panel |
| `_bindFeatureExplorer` | 2044 | binds type pill click events |
| `_fbFilter` | 6410 | filters catalog cards |
| `_fbBindFilters` | 6392 | binds catalog pill click events |
| `_openFeatureModal` | 5832 | opens modal, sets header, renders overview tab |
| `_closeFeatureModal` | 5873 | closes modal, clears _fdmContext |
| `_switchFdmTab` | 5878 | handles tab button click |
| `_renderFdmTab` | 5887 | renders tab content HTML |
| `_toggleFeatureEdit` | 6005 | toggles view ↔ edit mode |
| `_renderFdmEditForm` | 6032 | builds edit form into #fdmEditGrid |
| `_saveFeatureEdit` | 6104 | reads form, writes to node, refreshes panel, re-opens |
| `_showFeatPopover` | 6148 | shows floating hover popover |
| `_showFbPopover` | 6446 | delegates to _showFeatPopover |
| `_hideFeatPopover` | 6224 | hides popover |

### Builders (6 methods)
| Method | Line | Notes |
|---|---|---|
| `_buildNodeDetails` | 1846 | left col HTML for all node types |
| `_buildDatasourceRight` | 1738 | datasource schema column list |
| `_buildEntityRight` | 1772 | entity "used by" FV list |
| `_showColPopover` | 1805 | hover popover for datasource columns |

### Code Generation (17 methods)
All `generate*` methods (L4164–L5115). Key: `generateFeatureViewCode(node)` (L4588) is called per-node. `generateFeatureViewsFile()` (L4629) generates the full `feature_views.py`.

### Toggle (8 methods)
`toggleTheme`, `toggleLLMHelper`, `toggleDjangoAdmin`, `toggleCodeEditor`, `toggleEdgeManager`, `toggleMiniMap`, `toggleLayer`, `toggleSearchSetting`

### Update (8 methods)
`updateCodeEditor`, `updateStats`, `updateDBTypeInfo`, `updateLLMContext`, `updateLayerToggles`, `updateRepoSubtitle`, `updateTooltip`, `updateToggleUI`

---

## 22. Diagnostic Scripts

Save these in `scripts/` and run from the project root (`FeastArchitect/`).

---

### `scripts/check-syntax.sh`
Runs `node --check` on every JS module. Run this after ANY edit to JS files.

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

---

### `scripts/audit-methods.js`
Finds stub methods, duplicates, and missing critical methods. Run this when something mysteriously returns `null` or does nothing.

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
  'closePanel','selectNode','showFeatureBrowser','_buildFeatureExplorer','_buildFeatureCard',
  '_buildRichFeatureCard','_fbFilter','_fbBindFilters','_openFeatureModal','_closeFeatureModal',
  '_renderFdmTab','_toggleFeatureEdit','_renderFdmEditForm','_saveFeatureEdit',
  '_showFeatPopover','_hideFeatPopover','_buildNodeDetails','drawNode','render','animate',
  'bindEvents','exportToJSON','importFromJSON','autoLayout','getSubtypeColor','getCsrfToken'];

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

---

### `scripts/find.js`
Search any string across all `.js`, `.css`, `.html` files. Essential for tracing where a class, ID, or method is defined vs. used.

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

---

### `scripts/audit-node-access.js`
Detects incorrect `this.nodes.*` access patterns that don't go through `this.nodes.nodes.*` or a valid NodeManager method.

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
  // Triple dereference
  if (/this\.nodes\.nodes\.nodes\./.test(line))
    issues.push({n, msg:'TRIPLE DEREF', t});
  // .size without passthrough
  if (/this\.nodes\.size\b/.test(line))
    issues.push({n, msg:'this.nodes.size — no passthrough, use this.nodes.nodes.size', t});
  // Catch unknown direct access: this.nodes.SOMETHING (where SOMETHING not in NM_OK)
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

---

### `scripts/audit-css.js`
Lists all CSS custom properties, finds used-but-undeclared variables, and maps class family sizes.

```js
#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const css = fs.readFileSync('static/FeastArchitect/css/main.css','utf8');
function readAll(dirs) {
  let s='';
  function walk(d) {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{
      const p=path.join(d,e.name);
      if(e.isDirectory()) walk(p);
      else if(['.js','.html'].some(x=>e.name.endsWith(x))) s+=fs.readFileSync(p,'utf8')+'\n';
    });
  }
  dirs.forEach(walk); return s;
}
const usage = readAll(['static/FeastArchitect/js','templates']);
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
const used = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(m=>m[1]));
const undecl = [...used].filter(v=>!defined.has(v));
const families = {};
[...css.matchAll(/\.([\w-]+)\s*[{,:\[]/g)].map(m=>m[1]).forEach(c=>{
  const p=c.split('-')[0]; families[p]=(families[p]||0)+1;
});
console.log('\n═══ CSS Audit ═══');
console.log(` Variables defined: ${defined.size}  |  Used: ${used.size}`);
if (undecl.length) { console.log('\n⚠️  Used but not defined:'); undecl.forEach(v=>console.log('  '+v)); }
else console.log('\n✅  All used variables are defined');
console.log('\n Class families:');
Object.entries(families).sort((a,b)=>b[1]-a[1]).slice(0,20)
  .forEach(([p,c])=>console.log(`  .${p.padEnd(20)}-*  ${c}`));
```

---

### `scripts/validate-features.js`
Checks `example-data.js` for transformation string quote issues, out-of-range quality values, and unknown type values.

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
  // Transformation with inner single quotes
  const sm = t.match(/^transformation:\s*'(.*)'/);
  if (sm && sm[1].includes("'"))
    issues.push({n, sev:'error', msg:"Single-quoted transformation contains inner quotes — use double quotes", t});
  // Quality out of range
  const cm = t.match(/completeness:\s*([\d.]+)/);
  if (cm && (parseFloat(cm[1])<0 || parseFloat(cm[1])>100))
    issues.push({n, sev:'error', msg:`completeness ${cm[1]} out of 0-100 range`, t});
  // Unknown type
  const tm = t.match(/^\s*type:\s*['"]([^'"]+)['"]/);
  if (tm && !t.includes('dbType') && !VALID_TYPES.has(tm[1]))
    issues.push({n, sev:'warn', msg:`Unknown feature type: "${tm[1]}"`, t});
});
const rich = (content.match(/serving:\s*\{/g)||[]).length;
const sq = (content.match(/transformation:\s*'/g)||[]).length;
const dq = (content.match(/transformation:\s*"/g)||[]).length;
console.log('\n═══ Feature Schema Validation ═══');
console.log(` Rich features (have serving config): ~${rich}`);
console.log(` Transformations: ${dq} double-quoted ✅  |  ${sq} single-quoted ⚠️`);
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
  this.nodes.nodes.forEach(fn)       ← iterate
  this.nodes.nodes.values()          ← iterator
  this.nodes.addFeatureView(cfg)     ← create (returns new ID)
  this.nodes.addConnection(a, b)     ← add edge
  this.nodes.edges                   ← the edges Array  { from, to, id, animated }

CANVAS STATE (proxied to this.renderer):
  this.ctx          == this.renderer.ctx
  this.scale        == this.renderer.scale
  this.offsetX/Y    == this.renderer.offsetX/Y

PANEL MODES:
  showPanel(id)         → open + wide     (node view, 860px)
  showFeatureBrowser()  → open + fb-mode  (catalog, 900px)
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
```

---

*Last updated: reflects full codebase state after Feature Catalog and Rich Feature Metadata implementation. Update this document when making structural changes.*
