/**
 * Feast Diagram Main Class
 * 
 * Orchestrates all modules to provide the complete diagram functionality.
 * This is the main entry point that coordinates canvas rendering, node management,
 * UI interactions, API communication, and code generation.
 * 
 * File: feast-diagram.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/feast-diagram.js
 * 
 * @module FeastDiagram
 * @requires CanvasRenderer, NodeManager, UIManager, APIClient, CodeGenerator, 
 *           LLMHelper, SearchManager, LayoutManager, loadComplexExample
 */

/**
 * Main Feast Diagram Application Class
 * @class
 */
class FeastDiagram {
    /**
     * Create FeastDiagram instance
     * @param {string} canvasId - ID of the canvas element
     */
    constructor(canvasId) {
        // Initialize canvas and context
        this.canvas = document.getElementById(canvasId);
        this.container = this.canvas.parentElement;
        
        // Initialize all sub-modules
        this.initializeModules();
        
        // Application state
        this.selectedNode = null;
        this.hoveredNode = null;
        this.isDragging = false;
        this.isPanning = false;
        this.draggedNode = null;
        this.panStart = { x: 0, y: 0 };
        this.lastMouse = { x: 0, y: 0 };
        
        // Layer visibility
        this.visibleLayers = {
            datasource: true,
            entity: true,
            featureview: true,
            service: true
        };
        
        // Theme
        this.theme = 'dark';
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize all sub-modules
     * @private
     */
    initializeModules() {
        // Configuration
        this.config = {
            colors: NODE_CONFIG,
            nodeWidth: DIMENSIONS.nodeWidth,
            nodeHeight: DIMENSIONS.nodeHeight,
            portRadius: DIMENSIONS.portRadius,
            miniMapEnabled: true
        };
        
        // Core modules
        this.renderer = new CanvasRenderer(this.canvas, this.config);
        this.nodes = new NodeManager(this.config, DATABASE_TYPES);
        this.ui = new UIManager();
        this.api = new APIClient('/api');
        this.codeGen = new CodeGenerator(this.getRepoSettings());
        this.llm = new LLMHelper(this.api, this.getRepoSettings());
        this.search = new SearchManager();
        this.layout = new LayoutManager();
        
        // Repository settings
        this.repoSettings = this.initializeRepoSettings();
        
        // Update code generator with actual settings
        this.codeGen.setRepoSettings(this.repoSettings);
    }

    /**
     * Initialize repository settings from Django context or defaults
     * @private
     * @returns {Object} Repository settings
     */
    initializeRepoSettings() {
        const djangoContext = window.DJANGO_CONTEXT || {};
        
        return {
            name: 'enterprise_feature_store',
            location: '/opt/feast/feature_repo',
            defaultOwner: 'Data Platform Team',
            id: djangoContext.repoId || this.getRepoIdFromUrl(),
            description: 'Enterprise feature store powering machine learning across personalization, fraud detection, and search ranking use cases.'
        };
    }

    /**
     * Get repository ID from URL parameters
     * @private
     * @returns {number|null} Repository ID or null
     */
    getRepoIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const repoId = params.get('repo_id');
        return repoId ? parseInt(repoId) : null;
    }

    /**
     * Get current repository settings
     * @returns {Object} Repository settings
     */
    getRepoSettings() {
        return this.repoSettings;
    }

    /**
     * Initialize the application
     */
    init() {
        // Setup canvas size
        this.renderer.resize(this.container);
        window.addEventListener('resize', () => this.renderer.resize(this.container));
        
        // Bind all event handlers
        this.bindEvents();
        
        // Setup UI components
        this.setupSearch();
        this.setupKeyboardShortcuts();
        this.renderer.setupMiniMap(() => this.nodes.getBounds());
        
        // Update initial UI state
        this.ui.updateRepoSubtitle(this.repoSettings);
        this.updateStats();
        
        // Initialize user from Django context
        this.initializeUser();
        
        // Load data
        this.loadInitialData();
        
        // Start render loop
        this.animate();
        
        // Warn about unsaved changes
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    }

    /**
     * Initialize user from Django context
     * @private
     */
    initializeUser() {
        const djangoContext = window.DJANGO_CONTEXT || {};
        
        if (djangoContext.user) {
            const user = {
                id: djangoContext.user.id,
                name: `${djangoContext.user.firstName} ${djangoContext.user.lastName}`.trim() || djangoContext.user.username,
                initials: (djangoContext.user.firstName?.[0] || djangoContext.user.username[0]).toUpperCase(),
                role: 'Data Engineer',
                team: 'Data Engineering'
            };
            
            this.ui.updateUserDisplay(user);
            
            // Check for repo error
            if (djangoContext.repoError) {
                this.ui.showNotification('Error', djangoContext.repoError);
            }
        }
    }

    /**
     * Load initial data (from backend or example)
     * @private
     */
    async loadInitialData() {
        if (this.repoSettings.id) {
            await this.loadFromBackend();
        } else {
            loadComplexExample(this.nodes, 
                (from, to) => this.nodes.addConnection(from, to),
                () => this.autoLayout()
            );
            
            // Fit view after layout
            setTimeout(() => this.animateFit(), 1000);
        }
    }

    /**
     * Handle beforeunload event
     * @private
     */
    handleBeforeUnload(e) {
        if (this.repoSettings.id && this.nodes.size > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    }

    /**
     * Main animation/render loop
     * @private
     */
    animate() {
        this.render();
        
        if (this.config.miniMapEnabled) {
            this.renderMiniMap();
        }
        
        requestAnimationFrame(() => this.animate());
    }

    /**
     * Render the diagram
     */
    render() {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
        this.renderer.clear(bgColor);
        
        this.renderer.applyTransform();
        
        // Draw edges
        this.drawEdges();
        
        // Draw nodes
        this.nodes.forEach(node => {
            if (this.isNodeVisible(node)) {
                this.drawNode(node);
            }
        });
        
        this.renderer.restoreTransform();
    }

    /**
     * Draw all edges/connections
     * @private
     */
    drawEdges() {
        this.nodes.edges.forEach(edge => {
            const from = this.nodes.get(edge.from);
            const to = this.nodes.get(edge.to);
            
            if (!from || !to) return;
            if (!this.isNodeVisible(from) || !this.isNodeVisible(to)) return;
            
            const start = this.nodes.getPortPosition(from, 'output');
            const end = this.nodes.getPortPosition(to, 'input');
            
            const isHighlighted = this.selectedNode && 
                (edge.from === this.selectedNode || edge.to === this.selectedNode);
            
            this.renderer.drawEdge(start, end, isHighlighted);
        });
    }

    /**
     * Draw a single node
     * @private
     * @param {Object} node - Node to draw
     */
    drawNode(node) {
        const config = this.config.colors[node.type];
        const isSelected = this.selectedNode === node.id;
        const isHovered = this.hoveredNode === node.id;
        
        // Use database icon for datasources if available
        let icon = config.icon;
        if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
            icon = node.dbType.icon;
        }
        
        // Draw base node
        this.renderer.drawNode(node, isSelected, isHovered, {
            ...config,
            icon: icon
        });
        
        // Draw node content (features, counts, etc.)
        this.drawNodeContent(node, config);
        
        // Draw ports
        this.drawNodePorts(node);
        
        // Draw selection indicator
        if (isSelected) {
            this.renderer.drawSelectionIndicator(node, config.bg);
        }
    }

    /**
     * Draw node content (text, badges, etc.)
     * @private
     */
    drawNodeContent(node, config) {
        const ctx = this.renderer.ctx;
        const contentY = node.y + 52;
        
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim();
        ctx.font = '12px Inter, sans-serif';
        
        if (node.type === 'featureview') {
            this.drawFeatureViewContent(node, config, contentY);
        } else if (node.type === 'service') {
            this.drawServiceContent(node, config, contentY);
        } else if (node.type === 'entity') {
            this.drawEntityContent(node, config, contentY);
        } else if (node.type === 'datasource') {
            this.drawDataSourceContent(node, config, contentY);
        }
        
        // Draw tags if present
        if (node.tags && node.tags.length > 0) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`#${node.tags[0]}${node.tags.length > 1 ? ` +${node.tags.length - 1}` : ''}`, 
                node.x + 12, node.y + this.config.nodeHeight - 12);
        }
    }

    /**
     * Draw feature view specific content
     * @private
     */
    drawFeatureViewContent(node, config, contentY) {
        const ctx = this.renderer.ctx;
        
        ctx.fillStyle = config.light;
        ctx.fillText(`${node.features.length} features • ${node.entities.length} entities`, 
            node.x + 12, contentY);
        
        // Subtype badge
        ctx.fillStyle = getSubtypeColor(node.subtype);
        this.renderer.roundRect(node.x + this.config.nodeWidth - 60, node.y + 50, 48, 18, 9);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(node.subtype, node.x + this.config.nodeWidth - 48, node.y + 63);
    }

    /**
     * Draw service specific content
     * @private
     */
    drawServiceContent(node, config, contentY) {
        const ctx = this.renderer.ctx;
        const viewCount = node.features.length;
        const serviceCount = node.featureServices ? node.featureServices.length : 0;
        
        ctx.fillStyle = config.light;
        ctx.fillText(`${viewCount} views${serviceCount > 0 ? ` • ${serviceCount} services` : ''}`, 
            node.x + 12, contentY);
        
        if (node.details.usedBy && node.details.usedBy.length > 0) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();
            ctx.fillText(`Used by ${node.details.usedBy.length} apps`, node.x + 12, contentY + 16);
        }
    }

    /**
     * Draw entity specific content
     * @private
     */
    drawEntityContent(node, config, contentY) {
        const ctx = this.renderer.ctx;
        ctx.fillStyle = config.light;
        ctx.fillText(`Key: ${node.joinKey}`, node.x + 12, contentY);
    }

    /**
     * Draw data source specific content
     * @private
     */
    drawDataSourceContent(node, config, contentY) {
        const ctx = this.renderer.ctx;
        const dbName = node.dbType ? node.dbType.name : node.kind;
        
        ctx.fillStyle = config.light;
        ctx.fillText(dbName, node.x + 12, contentY);
        
        if (node.ownedBy) {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`Owner: ${truncateText(node.ownedBy, 25)}`, node.x + 12, contentY + 16);
        }
    }

    /**
     * Draw node input/output ports
     * @private
     */
    drawNodePorts(node) {
        const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
        
        const inputPos = this.nodes.getPortPosition(node, 'input');
        const outputPos = this.nodes.getPortPosition(node, 'output');
        
        this.renderer.drawPort(inputPos, bgColor);
        this.renderer.drawPort(outputPos, bgColor);
    }

    /**
     * Check if node type layer is visible
     * @param {Object} node - Node to check
     * @returns {boolean} Whether node should be visible
     */
    isNodeVisible(node) {
        return this.visibleLayers[node.type];
    }

    /**
     * Render minimap
     */
    renderMiniMap() {
        const bounds = this.nodes.getBounds();
        const miniMapCanvas = document.getElementById('miniMapCanvas');
        
        if (miniMapCanvas) {
            this.renderer.renderMiniMap(miniMapCanvas, this.nodes.nodes, this.nodes.edges, 
                bounds, this.theme);
        }
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    /**
     * Bind all event listeners
     * @private
     */
    bindEvents() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    }

    /**
     * Setup search functionality
     * @private
     */
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchDropdown = document.getElementById('searchDropdown');
        
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => this.handleSearch(e));
        searchInput.addEventListener('focus', (e) => {
            if (searchInput.value.trim().length > 0) {
                this.handleSearch(e);
            }
        });
        
        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && searchDropdown) {
                searchDropdown.classList.remove('active');
            }
        });
        
        // Escape to close
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchDropdown) {
                searchDropdown.classList.remove('active');
                searchInput.blur();
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     * @private
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape closes panels/modals
            if (e.key === 'Escape') {
                this.ui.closeAllPanels();
                this.ui.closeAllModals();
            }
            
            // Delete removes selected node
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteSelected();
            }
            
            // Ctrl/Cmd + F focuses search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
            }
            
            // Ctrl/Cmd + Shift + A opens LLM
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.toggleLLMHelper();
            }
            
            // Ctrl/Cmd + Shift + D opens Django panel
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDjangoAdmin();
            }
        });
    }

    /**
     * Handle mouse down on canvas
     * @private
     */
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const nodeId = this.getNodeAt(x, y);
        
        if (nodeId) {
            this.isDragging = true;
            this.draggedNode = nodeId;
            this.selectNode(nodeId);
        } else {
            this.isPanning = true;
            this.panStart = { x, y };
            this.ui.setCanvasCursor('grabbing');
        }
    }

    /**
     * Handle mouse move on canvas
     * @private
     */
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.lastMouse = { x, y };
        
        if (this.isDragging && this.draggedNode) {
            // Update node position
            const dx = (x - this.lastMouse.x) / this.renderer.scale;
            const dy = (y - this.lastMouse.y) / this.renderer.scale;
            
            const node = this.nodes.get(this.draggedNode);
            if (node) {
                node.x += dx;
                node.y += dy;
            }
        } else if (this.isPanning) {
            // Pan viewport
            this.renderer.offsetX += x - this.panStart.x;
            this.renderer.offsetY += y - this.panStart.y;
            this.panStart = { x, y };
        } else {
            // Handle hover
            const prevHover = this.hoveredNode;
            this.hoveredNode = this.getNodeAt(x, y);
            
            if (this.hoveredNode !== prevHover) {
                if (this.hoveredNode) {
                    const node = this.nodes.get(this.hoveredNode);
                    this.ui.showTooltip(node, e.clientX, e.clientY, this.config.colors);
                    this.ui.setCanvasCursor('pointer');
                } else {
                    this.ui.hideTooltip();
                    this.ui.setCanvasCursor('default');
                }
            } else if (this.hoveredNode) {
                this.ui.updateTooltip(e.clientX, e.clientY);
            }
        }
    }

    /**
     * Handle mouse up on canvas
     * @private
     */
    onMouseUp(e) {
        this.isDragging = false;
        this.draggedNode = null;
        this.isPanning = false;
        this.ui.setCanvasCursor(this.hoveredNode ? 'pointer' : 'default');
    }

    /**
     * Handle mouse wheel (zoom)
     * @private
     */
    onWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(4, this.renderer.scale * delta));
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Zoom towards mouse position
        const worldPos = this.renderer.screenToWorld(x, y);
        this.renderer.scale = newScale;
        this.renderer.offsetX = x - worldPos.x * newScale;
        this.renderer.offsetY = y - worldPos.y * newScale;
    }

    /**
     * Handle double click (edit node)
     * @private
     */
    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const nodeId = this.getNodeAt(x, y);
        if (nodeId) {
            this.showEditModal(nodeId);
        }
    }

    /**
     * Get node at screen coordinates
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @returns {string|null} Node ID or null
     */
    getNodeAt(x, y) {
        const pos = this.renderer.screenToWorld(x, y);
        
        for (const [id, node] of this.nodes.nodes) {
            if (!this.isNodeVisible(node)) continue;
            
            if (pos.x >= node.x && 
                pos.x <= node.x + this.config.nodeWidth &&
                pos.y >= node.y && 
                pos.y <= node.y + this.config.nodeHeight) {
                return id;
            }
        }
        
        return null;
    }

    // ==========================================
    // Node Operations
    // ==========================================

    /**
     * Select a node and show its details
     * @param {string} id - Node ID to select
     */
    selectNode(id) {
        this.selectedNode = id;
        this.showPanel(id);
        this.updateCodeEditor();
        this.llm.updateContext(this.nodes.get(id), this.nodes.nodes, this.config.colors);
    }

    /**
     * Close detail panel
     */
    closePanel() {
        this.ui.togglePanel('detail', false);
        this.selectedNode = null;
    }

    /**
     * Delete currently selected node
     */
    deleteSelected() {
        if (!this.selectedNode) return;
        
        const node = this.nodes.get(this.selectedNode);
        if (!node) return;
        
        if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
            this.nodes.removeNode(this.selectedNode);
            this.selectedNode = null;
            this.closePanel();
            this.updateStats();
            this.ui.showNotification('Deleted', `"${node.name}" has been removed`);
        }
    }

    /**
     * Center viewport on specific node
     * @param {string} id - Node ID
     */
    centerOnNode(id) {
        const node = this.nodes.get(id);
        if (!node) return;
        
        const transform = this.layout.calculateCenterTransform(
            node, 
            this.renderer.width, 
            this.renderer.height,
            { nodeWidth: this.config.nodeWidth, nodeHeight: this.config.nodeHeight }
        );
        
        this.renderer.animateTo(transform.scale, transform.offsetX, transform.offsetY);
    }

    // ==========================================
    // Layout Operations
    // ==========================================

    /**
     * Auto-layout all nodes
     */
    autoLayout() {
        const positions = this.layout.autoLayout(
            this.nodes.nodes, 
            this.renderer.width, 
            this.renderer.height
        );
        
        // Animate nodes to new positions
        this.layout.animateNodes(this.nodes.nodes, positions);
    }

    /**
     * Fit all nodes in view
     */
    fit() {
        const bounds = this.nodes.getBounds();
        const transform = this.layout.calculateFitTransform(
            bounds, 
            this.renderer.width, 
            this.renderer.height
        );
        
        this.renderer.scale = transform.scale;
        this.renderer.offsetX = transform.offsetX;
        this.renderer.offsetY = transform.offsetY;
    }

    /**
     * Animate fit to bounds
     */
    animateFit() {
        const bounds = this.nodes.getBounds();
        const transform = this.layout.calculateFitTransform(
            bounds, 
            this.renderer.width, 
            this.renderer.height
        );
        
        this.renderer.animateTo(transform.scale, transform.offsetX, transform.offsetY);
    }

    /**
     * Reset view to default
     */
    resetView() {
        this.renderer.scale = 1;
        this.renderer.offsetX = 50;
        this.renderer.offsetY = 50;
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.renderer.scale = Math.min(4, this.renderer.scale * 1.2);
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.renderer.scale = Math.max(0.1, this.renderer.scale / 1.2);
    }

    // ==========================================
    // Data Operations
    // ==========================================

    /**
     * Load repository from backend
     */
    async loadFromBackend() {
        try {
            this.ui.showNotification('Loading', 'Fetching repository from server...');
            
            const data = await this.api.getRepository(this.repoSettings.id);
            
            // Update settings
            this.repoSettings = {
                name: data.name,
                location: data.location,
                defaultOwner: data.default_owner,
                id: data.id,
                description: data.description || ''
            };
            
            this.ui.updateRepoSubtitle(this.repoSettings);
            this.codeGen.setRepoSettings(this.repoSettings);
            
            // Load architecture
            if (data.architecture_json) {
                this.nodes.importFromJSON(data.architecture_json);
            }
            
            // Load backend entities as nodes if empty
            if (this.nodes.size === 0) {
                if (data.data_sources) {
                    data.data_sources.forEach(ds => this.addDataSourceFromBackend(ds));
                }
                if (data.entities) {
                    data.entities.forEach(ent => this.addEntityFromBackend(ent));
                }
            }
            
            this.updateStats();
            this.ui.showNotification('Loaded', `Repository "${data.name}" loaded`);
            
            setTimeout(() => this.animateFit(), 500);
            
        } catch (error) {
            console.error('Failed to load from backend:', error);
            this.ui.showNotification('Error', 'Failed to load repository. Using example data.');
            loadComplexExample(this.nodes, 
                (from, to) => this.nodes.addConnection(from, to),
                () => this.autoLayout()
            );
        }
    }

    /**
     * Add data source from backend data
     * @private
     */
    addDataSourceFromBackend(ds) {
        return this.nodes.addDataSource({
            name: ds.name,
            kind: ds.kind,
            description: ds.description || '',
            tags: ds.tags || [],
            ownedBy: ds.owned_by || this.repoSettings.defaultOwner,
            accessProcess: ds.access_process || '',
            x: ds.pos_x || 100,
            y: ds.pos_y || 100,
            columnSecurity: ds.column_security || generateDefaultColumnSecurity()
        });
    }

    /**
     * Add entity from backend data
     * @private
     */
    addEntityFromBackend(ent) {
        return this.nodes.addEntity({
            name: ent.name,
            joinKey: ent.join_key || 'id',
            description: ent.description || '',
            tags: ent.tags || [],
            x: ent.pos_x || 100,
            y: ent.pos_y || 100
        });
    }

    /**
     * Push repository to backend
     */
    async pushRepo() {
        const confirmed = confirm(
            this.repoSettings.id 
                ? `Update repository "${this.repoSettings.name}"?`
                : 'Create new repository?'
        );
        
        if (!confirmed) return;
        
        this.ui.toggleModal('pushRepo', true);
        this.ui.updatePushProgress(0, 'Initializing...');
        
        const payload = {
            name: this.repoSettings.name,
            location: this.repoSettings.location,
            description: this.repoSettings.description,
            default_owner: this.repoSettings.defaultOwner,
            architecture_json: this.nodes.exportToJSON(),
            settings: this.search.settings
        };
        
        try {
            this.ui.updatePushProgress(30, 'Sending to server...');
            
            let response;
            if (this.repoSettings.id) {
                response = await this.api.updateRepository(this.repoSettings.id, payload);
            } else {
                response = await this.api.createRepository(payload);
                this.repoSettings.id = response.id;
                
                // Update URL
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('repo_id', response.id);
                window.history.pushState({}, '', newUrl);
            }
            
            this.ui.updatePushProgress(100, 'Success!', 'success');
            this.ui.showNotification('Push Successful', 
                this.repoSettings.id ? 'Repository updated' : 'Repository created');
            
        } catch (error) {
            console.error('Push failed:', error);
            this.ui.updatePushProgress(100, `Error: ${error.message}`, 'error');
        }
    }

    /**
     * Export repository to JSON file
     */
    async export() {
        try {
            if (this.repoSettings.id) {
                const data = await this.api.exportRepository(this.repoSettings.id);
                this.downloadJSON(data, `${data.repository.name}-${new Date().toISOString().split('T')[0]}.json`);
                this.ui.showNotification('Exported', 'Architecture exported from server');
            } else {
                const data = {
                    repository: this.repoSettings,
                    nodes: Array.from(this.nodes.entries()),
                    edges: this.nodes.edges,
                    exportDate: new Date().toISOString(),
                    version: '3.0'
                };
                this.downloadJSON(data, `${this.repoSettings.name}-${new Date().toISOString().split('T')[0]}.json`);
                this.ui.showNotification('Exported', 'Architecture saved to JSON file');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.ui.showNotification('Error', 'Export failed');
        }
    }

    /**
     * Import repository from JSON file
     */
    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                if (this.repoSettings.id) {
                    // Backend import
                    const result = await this.api.importRepository(file);
                    window.location.href = `/ui/feast?repo_id=${result.id}`;
                } else {
                    // Local import
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.nodes.importFromJSON(data.architecture || data);
                    this.updateStats();
                    this.fit();
                    this.ui.showNotification('Imported', `Loaded ${this.nodes.size} components`);
                }
            } catch (error) {
                if (error.isConflict) {
                    alert(`Import conflict: ${error.detail}\nExisting ID: ${error.existingId}`);
                } else {
                    alert('Error importing file: ' + error.message);
                }
            }
        };
        
        input.click();
    }

    /**
     * Download JSON data as file
     * @private
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Reset diagram to example data
     */
    reset() {
        this.nodes.clear();
        this.selectedNode = null;
        this.closePanel();
        
        loadComplexExample(this.nodes, 
            (from, to) => this.nodes.addConnection(from, to),
            () => this.autoLayout()
        );
        
        this.updateStats();
        this.ui.showNotification('Reset', 'Diagram has been reset to example data');
        setTimeout(() => this.fit(), 100);
    }

    // ==========================================
    // UI Toggles
    // ==========================================

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.ui.updateThemeIcons(this.theme);
        this.ui.showNotification('Theme Changed', `Switched to ${this.theme} mode`);
    }

    toggleLLMHelper() {
        const isOpen = this.ui.togglePanel('llm');
        if (isOpen) {
            this.llm.initialize();
            this.llm.updateContext(this.selectedNode ? this.nodes.get(this.selectedNode) : null, 
                this.nodes.nodes, this.config.colors);
        }
    }

    toggleDjangoAdmin() {
        this.ui.togglePanel('django');
    }

    toggleCodeEditor() {
        this.ui.togglePanel('codeEditor');
        if (this.ui.panels.codeEditor) {
            this.updateCodeEditor();
        }
    }

    toggleEdgeManager() {
        this.ui.togglePanel('edgeManager');
    }

    toggleMiniMap() {
        this.config.miniMapEnabled = !this.config.miniMapEnabled;
        const miniMap = document.getElementById('miniMap');
        if (miniMap) {
            miniMap.style.display = this.config.miniMapEnabled ? 'block' : 'none';
        }
    }

    // ==========================================
    // Modal Operations
    // ==========================================

    showAddModal(type) {
        this.currentModalType = type;
        // Implementation opens modal with form for new node
        this.ui.toggleModal('component', true);
    }

    showEditModal(id) {
        const node = this.nodes.get(id);
        if (!node) return;
        
        this.editingNode = id;
        this.currentModalType = node.type;
        // Implementation opens modal with populated form
        this.ui.toggleModal('component', true);
    }

    showSettings() {
        // Populate settings form
        document.getElementById('settingsRepoName').value = this.repoSettings.name;
        document.getElementById('settingsRepoLocation').value = this.repoSettings.location;
        document.getElementById('settingsRepoDescription').value = this.repoSettings.description || '';
        document.getElementById('settingsDefaultOwner').value = this.repoSettings.defaultOwner;
        
        this.ui.toggleModal('settings', true);
    }

    // ==========================================
    // Update Methods
    // ==========================================

    updateCodeEditor() {
        if (!this.ui.panels.codeEditor) return;
        
        const format = document.getElementById('codeFormatSelect')?.value || 'python';
        
        switch(format) {
            case 'python':
                this.renderPythonFiles();
                break;
            case 'json':
                this.renderJSONExport();
                break;
            case 'yaml':
                this.renderYAMLConfig();
                break;
        }
    }

    renderPythonFiles() {
        // Implementation renders file browser and code
        const content = this.codeGen.generateEntitiesFile(this.nodes.nodes);
        // Update DOM...
    }

    renderJSONExport() {
        const content = this.codeGen.generateJSONExport(this.nodes.nodes, this.nodes.edges);
        // Update DOM...
    }

    renderYAMLConfig() {
        const content = this.codeGen.generateYAMLConfig();
        // Update DOM...
    }

    // ==========================================
    // Search
    // ==========================================

    handleSearch(e) {
        const query = e.target.value;
        const dropdown = document.getElementById('searchDropdown');
        const resultsContainer = document.getElementById('searchDropdownContent');
        
        if (!query.trim()) {
            dropdown?.classList.remove('active');
            return;
        }
        
        const results = this.search.search(query, this.nodes.nodes);
        const html = this.search.renderResults(results, query, this.config.colors);
        
        if (resultsContainer) {
            resultsContainer.innerHTML = html;
        }
        dropdown?.classList.add('active');
    }

    selectSearchResult(id, type) {
        document.getElementById('searchDropdown')?.classList.remove('active');
        document.getElementById('searchInput').value = '';
        
        this.selectNode(id);
        this.centerOnNode(id);
    }

    // ==========================================
    // Layer Visibility
    // ==========================================

    toggleLayer(type) {
        this.visibleLayers[type] = !this.visibleLayers[type];
        
        // Update toggle button UI
        const toggleIds = {
            datasource: 'toggleSources',
            entity: 'toggleEntities',
            featureview: 'toggleViews',
            service: 'toggleServices'
        };
        
        const btn = document.getElementById(toggleIds[type]);
        if (btn) {
            if (this.visibleLayers[type]) {
                btn.classList.remove('hidden-layer');
                btn.querySelector('.eye-icon').textContent = '👁';
            } else {
                btn.classList.add('hidden-layer');
                btn.querySelector('.eye-icon').textContent = '🚫';
            }
        }
    }

    // ==========================================
    // Missing Methods (from original architect.html)
    // ==========================================

    showPanel(id) {
                    const node = this.nodes.get(id);
                    const panel = document.getElementById('detailPanel');
                    const config = this.config.colors[node.type];
                    
                    let icon = config.icon;
                    if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
                        icon = node.dbType.icon;
                    }
                    
                    document.getElementById('panelIcon').textContent = icon;
                    document.getElementById('panelType').textContent = config.label;
                    document.getElementById('panelType').style.color = config.light;
                    document.getElementById('panelBadge').style.background = `${config.bg}20`;
                    
                    document.getElementById('panelTitle').textContent = node.name;
                    
                    let subtitle = '';
                    if (node.type === 'featureview') {
                        subtitle = `${node.subtype} • ${node.features.length} features`;
                    } else if (node.type === 'service') {
                        const totalDeps = node.features.length + (node.featureServices ? node.featureServices.length : 0);
                        subtitle = `${totalDeps} dependencies`;
                    } else if (node.type === 'entity') {
                        subtitle = `Join key: ${node.joinKey}`;
                    } else if (node.type === 'datasource') {
                        const dbName = node.dbType ? node.dbType.name : node.kind;
                        subtitle = `${dbName} • ${node.ownedBy}`;
                    }
                    document.getElementById('panelSubtitle').textContent = subtitle;
                    
                    const tagsContainer = document.getElementById('panelTags');
                    if (node.tags && node.tags.length > 0) {
                        tagsContainer.innerHTML = node.tags.map(tag => 
                            `<span class="tag">#${tag}</span>`
                        ).join('');
                    } else {
                        tagsContainer.innerHTML = '';
                    }
                    
                    const content = document.getElementById('panelContent');
                    let html = '';
                    
                    if (node.description) {
                        html += `
                            <div class="panel-section">
                                <div class="section-header">
                                    <div class="section-title">Description</div>
                                </div>
                                <div class="notes-section">
                                    <div class="notes-text">${node.description}</div>
                                </div>
                            </div>
                        `;
                    }
                    
                    html += `<div class="panel-section"><div class="detail-card">`;
                    
                    if (node.type === 'entity') {
                        html += `
                            <div class="detail-row">
                                <span class="detail-label">Join Key</span>
                                <span class="detail-value highlight">${node.joinKey}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Used By</span>
                                <span class="detail-value">${this.getUsedByCount(id)} views</span>
                            </div>
                        `;
                    } else if (node.type === 'featureview') {
                        html += `
                            <div class="detail-row">
                                <span class="detail-label">Type</span>
                                <span class="detail-value" style="color: ${this.getSubtypeColor(node.subtype)}">${node.subtype}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Entities</span>
                                <span class="detail-value">${node.entities.length}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Features</span>
                                <span class="detail-value">${node.features.length}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">TTL</span>
                                <span class="detail-value">${node.details.ttl || 'Not set'}</span>
                            </div>
                        `;
                    } else if (node.type === 'service') {
                        html += `
                            <div class="detail-row">
                                <span class="detail-label">Feature Views</span>
                                <span class="detail-value">${node.features.length}</span>
                            </div>
                            ${node.featureServices && node.featureServices.length > 0 ? `
                            <div class="detail-row">
                                <span class="detail-label">Feature Services</span>
                                <span class="detail-value">${node.featureServices.length}</span>
                            </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Used By</span>
                                <span class="detail-value">${node.details.usedBy ? node.details.usedBy.length : 0} applications</span>
                            </div>
                        `;
                    } else if (node.type === 'datasource') {
                        const dbName = node.dbType ? node.dbType.name : node.kind;
                        html += `
                            <div class="detail-row">
                                <span class="detail-label">Type</span>
                                <span class="detail-value">${dbName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Category</span>
                                <span class="detail-value">${node.dbType ? node.dbType.category : 'Unknown'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Debezium Support</span>
                                <span class="detail-value">${node.debeziumAvailable ? '✅ Yes' : '❌ No'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Owned By</span>
                                <span class="detail-value">${node.ownedBy}</span>
                            </div>
                            ${node.details.connection ? `
                            <div class="detail-row">
                                <span class="detail-label">Connection</span>
                                <span class="detail-value" style="font-size: 11px;">${node.details.connection}</span>
                            </div>
                            ` : ''}
                        `;
                        
                        if (node.accessProcess) {
                            html += `</div></div>
                            <div class="panel-section">
                                <div class="section-header">
                                    <div class="section-title">Access Process</div>
                                </div>
                                <div class="notes-section">
                                    <div class="notes-text">${node.accessProcess}</div>
                                </div>
                                <button class="access-request-btn" onclick="diagram.requestAccess('${id}')">
                                    <span>🔐</span>
                                    <span>Request Access</span>
                                </button>
                            </div>
                            <div class="panel-section"><div class="detail-card">`;
                        }
                    }
                    
                    html += `</div></div>`;
                    
                    if (node.type === 'featureview' && node.features.length > 0) {
                        html += `
                            <div class="panel-section">
                                <div class="section-header">
                                    <div class="section-title">Features</div>
                                    <div class="section-badge">${node.features.length}</div>
                                </div>
                                <div class="feature-list">
                                    ${node.features.map(f => `
                                        <div class="feature-item">
                                            <div class="feature-info">
                                                <div class="feature-icon">⚡</div>
                                                <div>
                                                    <div class="feature-name">${f.name}</div>
                                                    <div class="feature-type">${f.type}</div>
                                                </div>
                                            </div>
                                            <span class="feature-badge">${f.type}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    
                    html += `
                        <div class="panel-section">
                            <div class="section-header">
                                <div class="section-title">Lineage</div>
                            </div>
                            <div class="connection-graph">
                    `;
                    
                    if (node.inputs.length > 0) {
                        node.inputs.forEach(inputId => {
                            const input = this.nodes.get(inputId);
                            if (input && this.isNodeVisible(input)) {
                                const inputConfig = this.config.colors[input.type];
                                let inputIcon = inputConfig.icon;
                                if (input.type === 'datasource' && input.dbType && input.dbType.icon) {
                                    inputIcon = input.dbType.icon;
                                }
                                html += `
                                    <div class="connection-node" onclick="diagram.selectNode('${inputId}')">
                                        <div class="connection-icon" style="background: ${inputConfig.bg}20; color: ${inputConfig.light};">
                                            ${inputIcon}
                                        </div>
                                        <div class="connection-info">
                                            <div class="connection-name">${input.name}</div>
                                            <div class="connection-meta">${inputConfig.label}</div>
                                        </div>
                                        <span class="connection-arrow">←</span>
                                    </div>
                                `;
                            }
                        });
                    }
                    
                    html += `
                        <div class="connection-node" style="border-color: ${config.bg}; background: ${config.bg}10;">
                            <div class="connection-icon" style="background: ${config.bg}20; color: ${config.light};">
                                ${icon}
                            </div>
                            <div class="connection-info">
                                <div class="connection-name">${node.name}</div>
                                <div class="connection-meta" style="color: ${config.light};">${config.label}</div>
                            </div>
                        </div>
                    `;
                    
                    if (node.outputs.length > 0) {
                        node.outputs.forEach(outputId => {
                            const output = this.nodes.get(outputId);
                            if (output && this.isNodeVisible(output)) {
                                const outputConfig = this.config.colors[output.type];
                                let outputIcon = outputConfig.icon;
                                if (output.type === 'datasource' && output.dbType && output.dbType.icon) {
                                    outputIcon = output.dbType.icon;
                                }
                                html += `
                                    <div class="connection-node" onclick="diagram.selectNode('${outputId}')">
                                        <div class="connection-icon" style="background: ${outputConfig.bg}20; color: ${outputConfig.light};">
                                            ${outputIcon}
                                        </div>
                                        <div class="connection-info">
                                            <div class="connection-name">${output.name}</div>
                                            <div class="connection-meta">${outputConfig.label}</div>
                                        </div>
                                        <span class="connection-arrow">→</span>
                                    </div>
                                `;
                            }
                        });
                    }
                    
                    html += `</div></div>`;
                    
                    if (node.details.usedBy && node.details.usedBy.length > 0) {
                        html += `
                            <div class="panel-section">
                                <div class="section-header">
                                    <div class="section-title">Used By Applications</div>
                                    <div class="section-badge">${node.details.usedBy.length}</div>
                                </div>
                                <div class="service-usage">
                                    ${node.details.usedBy.map((app, idx) => {
                                        const appData = typeof app === 'string' ? { name: app } : app;
                                        return `
                                        <div class="usage-card" onclick="diagram.showUsageDetails(${idx})">
                                            <div class="usage-details">ℹ️</div>
                                            <div class="usage-icon" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                                                🖥️
                                            </div>
                                            <div class="usage-name">${appData.name}</div>
                                            <div class="usage-type">${appData.environment || 'Production'}</div>
                                            ${appData.sla ? `<div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">SLA: ${appData.sla}</div>` : ''}
                                        </div>
                                    `}).join('')}
                                </div>
                            </div>
                        `;
                    }
                    
                    if (node.details.notes) {
                        html += `
                            <div class="panel-section">
                                <div class="section-header">
                                    <div class="section-title">Notes</div>
                                </div>
                                <div class="notes-section">
                                    <div class="notes-text">${node.details.notes}</div>
                                </div>
                            </div>
                        `;
                    }
                    
                    html += `
                        <div class="panel-section">
                            <div class="section-header">
                                <div class="section-title">Python API</div>
                            </div>
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-lang">Python</span>
                                    <button class="code-copy" onclick="diagram.copyCode(this)">Copy</button>
                                </div>
                                <div class="code-content">${this.generateCodeExample(node)}</div>
                            </div>
                        </div>
                    `;
                    
                    content.innerHTML = html;
                    panel.classList.add('open');
                }

    openModal(type, existingNode = null) {
                    const modal = document.getElementById('componentModal');
                    const title = document.getElementById('modalTitle');
                    const body = document.getElementById('modalBody');
                    
                    const titles = {
                        datasource: existingNode ? 'Edit Data Source' : 'Add Data Source',
                        entity: existingNode ? 'Edit Entity' : 'Add Entity',
                        featureview: existingNode ? 'Edit Feature View' : 'Add Feature View',
                        service: existingNode ? 'Edit Feature Service' : 'Add Feature Service'
                    };
                    
                    title.textContent = titles[type];
                    
                    let html = '';
                    
                    html += `
                        <div class="form-group">
                            <label class="form-label">Name *</label>
                            <input type="text" class="form-input" id="inputName" 
                                value="${existingNode ? existingNode.name : ''}" 
                                placeholder="e.g., User Demographics">
                        </div>
                    `;
                    
                    if (type === 'datasource') {
                        // Generate options from comprehensive database types
                        const dbOptions = Object.entries(this.databaseTypes).map(([key, db]) => 
                            `<option value="${key}" ${existingNode?.kind === key ? 'selected' : ''}>${db.icon} ${db.name}</option>`
                        ).join('');
                        
                        html += `
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Source Type</label>
                                    <select class="form-select" id="inputKind" onchange="diagram.updateDBTypeInfo()">
                                        <option value="">Select database...</option>
                                        <optgroup label="Relational">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Relational').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="NoSQL">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'NoSQL').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Cloud Warehouse">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Cloud Warehouse').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Streaming">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Streaming').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Object Storage">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Object Storage').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="In-Memory">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'In-Memory').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Graph">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Graph').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Time-Series">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => v.category === 'Time-Series').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Others">
                                            ${Object.entries(this.databaseTypes).filter(([k,v]) => !['Relational', 'NoSQL', 'Cloud Warehouse', 'Streaming', 'Object Storage', 'In-Memory', 'Graph', 'Time-Series'].includes(v.category)).map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                                        </optgroup>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Connection (optional)</label>
                                    <input type="text" class="form-input" id="inputConnection" 
                                        value="${existingNode?.details?.connection || ''}"
                                        placeholder="host:port/db">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Owned By</label>
                                <input type="text" class="form-input" id="inputOwnedBy" 
                                    value="${existingNode?.ownedBy || this.repoSettings.defaultOwner}"
                                    placeholder="Team name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Access Process</label>
                                <textarea class="form-textarea" id="inputAccessProcess" placeholder="Steps to get access...">${existingNode?.accessProcess || ''}</textarea>
                                <div class="form-hint" id="dbTypeHint">${existingNode?.dbType ? `Default: ${existingNode.dbType.defaultProcess}` : 'Select a database type to see default access process'}</div>
                            </div>
                        `;
                    } else if (type === 'entity') {
                        html += `
                            <div class="form-group">
                                <label class="form-label">Join Key *</label>
                                <input type="text" class="form-input" id="inputJoinKey" 
                                    value="${existingNode ? existingNode.joinKey : 'id'}"
                                    placeholder="e.g., user_id">
                                <div class="form-hint">The column name used to join features</div>
                            </div>
                        `;
                    } else if (type === 'featureview') {
                        const entities = Array.from(this.nodes.values())
                            .filter(n => n.type === 'entity')
                            .map(e => `<option value="${e.id}" ${existingNode?.entities?.includes(e.id) ? 'selected' : ''}>${e.name}</option>`)
                            .join('');
                        
                        html += `
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">View Type</label>
                                    <select class="form-select" id="inputSubtype">
                                        <option value="batch" ${existingNode?.subtype === 'batch' ? 'selected' : ''}>Batch</option>
                                        <option value="stream" ${existingNode?.subtype === 'stream' ? 'selected' : ''}>Stream</option>
                                        <option value="on_demand" ${existingNode?.subtype === 'on_demand' ? 'selected' : ''}>On-Demand</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">TTL (seconds)</label>
                                    <input type="number" class="form-input" id="inputTTL" 
                                        value="${existingNode?.details?.ttl || ''}"
                                        placeholder="86400">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Entities *</label>
                                <select class="form-select" id="inputEntities" multiple size="3">
                                    ${entities}
                                </select>
                                <div class="form-hint">Hold Ctrl/Cmd to select multiple</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Features</label>
                                <div class="features-builder">
                                    <div class="features-list-builder" id="featuresList">
                                        ${this.tempFeatures.map((f, idx) => `
                                            <div class="feature-tag-builder">
                                                <div class="feature-tag-info">
                                                    <span class="feature-tag-name">${f.name}</span>
                                                    <span class="feature-tag-type">${f.type}</span>
                                                </div>
                                                <button class="feature-tag-remove" onclick="diagram.removeFeature(${idx})">×</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="feature-input-row" style="margin-top: 12px;">
                                        <input type="text" class="form-input feature-input" id="featureName" placeholder="Feature name">
                                        <select class="form-select" id="featureType" style="width: 140px;">
                                            <option value="String">String</option>
                                            <option value="Int64">Int64</option>
                                            <option value="Float32">Float32</option>
                                            <option value="Float64">Float64</option>
                                            <option value="Bool">Bool</option>
                                        </select>
                                        <button class="btn btn-primary" onclick="diagram.addFeature()">Add</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else if (type === 'service') {
                        const views = Array.from(this.nodes.values())
                            .filter(n => n.type === 'featureview')
                            .map(v => `<option value="${v.id}" ${existingNode?.features?.includes(v.id) ? 'selected' : ''}>${v.name}</option>`)
                            .join('');
                        
                        const services = Array.from(this.nodes.values())
                            .filter(n => n.type === 'service' && n.id !== existingNode?.id)
                            .map(s => `<option value="${s.id}" ${existingNode?.featureServices?.includes(s.id) ? 'selected' : ''}>${s.name}</option>`)
                            .join('');
                        
                        html += `
                            <div class="form-group">
                                <label class="form-label">Feature Views</label>
                                <select class="form-select" id="inputFeatures" multiple size="4">
                                    ${views}
                                </select>
                            </div>
                            
                            ${services ? `
                            <div class="form-group">
                                <label class="form-label">Feature Services (dependencies)</label>
                                <select class="form-select" id="inputFeatureServices" multiple size="3">
                                    ${services}
                                </select>
                                <div class="form-hint">Optional: compose from other services</div>
                            </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label class="form-label">Used By Applications (comma-separated)</label>
                                <input type="text" class="form-input" id="inputUsedBy" 
                                    value="${existingNode?.details?.usedBy ? existingNode.details.usedBy.map(u => typeof u === 'string' ? u : u.name).join(', ') : ''}"
                                    placeholder="e.g., recommendation-api, fraud-service">
                                <div class="form-hint">Applications that consume this service</div>
                            </div>
                        `;
                    }
                    
                    html += `
                        <div class="form-group">
                            <label class="form-label">Tags</label>
                            <div class="features-builder">
                                <div class="features-list-builder" id="tagsList">
                                    ${this.tempTags.map((tag, idx) => `
                                        <div class="feature-tag-builder">
                                            <div class="feature-tag-info">
                                                <span class="feature-tag-name">#${tag}</span>
                                            </div>
                                            <button class="feature-tag-remove" onclick="diagram.removeTag(${idx})">×</button>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="feature-input-row" style="margin-top: 12px;">
                                    <input type="text" class="form-input feature-input" id="tagInput" placeholder="Add tag..." onkeypress="if(event.key==='Enter') diagram.addTag()">
                                    <button class="btn btn-primary" onclick="diagram.addTag()">Add Tag</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    html += `
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="inputDescription" placeholder="Describe this component...">${existingNode ? existingNode.description : ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notes (internal documentation)</label>
                            <textarea class="form-textarea" id="inputNotes" placeholder="Add implementation notes, SLAs, ownership info...">${existingNode ? existingNode.details?.notes || '' : ''}</textarea>
                        </div>
                    `;
                    
                    body.innerHTML = html;
                    modal.classList.add('active');
                }

    saveComponent() {
                    const name = document.getElementById('inputName').value.trim();
                    if (!name) {
                        alert('Name is required');
                        return;
                    }
                    
                    const description = document.getElementById('inputDescription')?.value || '';
                    const notes = document.getElementById('inputNotes')?.value || '';
                    
                    const baseConfig = {
                        name,
                        description,
                        tags: [...this.tempTags],
                        details: { notes }
                    };
                    
                    if (this.editingNode) {
                        const node = this.nodes.get(this.editingNode);
                        node.name = name;
                        node.description = description;
                        node.tags = [...this.tempTags];
                        node.details.notes = notes;
                        
                        if (node.type === 'datasource') {
                            const kind = document.getElementById('inputKind').value;
                            node.kind = kind;
                            node.dbType = this.databaseTypes[kind];
                            node.details.connection = document.getElementById('inputConnection')?.value || '';
                            node.ownedBy = document.getElementById('inputOwnedBy')?.value || this.repoSettings.defaultOwner;
                            node.accessProcess = document.getElementById('inputAccessProcess')?.value || '';
                            node.debeziumAvailable = node.dbType ? node.dbType.debezium : false;
                            node.sparkPattern = node.dbType ? node.dbType.sparkPattern : 'Custom connector';
                        } else if (node.type === 'entity') {
                            node.joinKey = document.getElementById('inputJoinKey').value || 'id';
                        } else if (node.type === 'featureview') {
                            node.subtype = document.getElementById('inputSubtype').value;
                            node.details.ttl = document.getElementById('inputTTL')?.value || '';
                            node.features = [...this.tempFeatures];
                            
                            const entitySelect = document.getElementById('inputEntities');
                            const selectedEntities = Array.from(entitySelect.selectedOptions).map(o => o.value);
                            
                            this.nodes.edges = this.nodes.edges.filter(e => e.to !== this.editingNode);
                            node.inputs = [];
                            
                            node.entities = selectedEntities;
                            selectedEntities.forEach(eid => this.addConnection(eid, this.editingNode));
                        } else if (node.type === 'service') {
                            const fvSelect = document.getElementById('inputFeatures');
                            const selectedFVs = Array.from(fvSelect.selectedOptions).map(o => o.value);
                            
                            const fsSelect = document.getElementById('inputFeatureServices');
                            const selectedFSs = fsSelect ? Array.from(fsSelect.selectedOptions).map(o => o.value) : [];
                            
                            this.nodes.edges = this.nodes.edges.filter(e => e.to !== this.editingNode);
                            node.inputs = [];
                            
                            node.features = selectedFVs;
                            node.featureServices = selectedFSs;
                            selectedFVs.forEach(fvid => this.addConnection(fvid, this.editingNode));
                            selectedFSs.forEach(fsid => this.addConnection(fsid, this.editingNode));
                            
                            const usedBy = document.getElementById('inputUsedBy')?.value || '';
                            node.details.usedBy = usedBy.split(',').map(s => s.trim()).filter(s => s).map(s => ({ name: s, environment: 'Production' }));
                        }
                        
                        if (this.selectedNode === this.editingNode) {
                            this.showPanel(this.editingNode);
                        }
                        
                        this.showNotification('Updated', `"${name}" has been updated`);
                    } else {
                        let newId;
                        
                        if (this.currentModalType === 'datasource') {
                            const kind = document.getElementById('inputKind').value;
                            newId = this.addDatasource({
                                ...baseConfig,
                                kind: kind,
                                ownedBy: document.getElementById('inputOwnedBy')?.value || this.repoSettings.defaultOwner,
                                accessProcess: document.getElementById('inputAccessProcess')?.value || '',
                                details: {
                                    ...baseConfig.details,
                                    connection: document.getElementById('inputConnection')?.value || ''
                                }
                            });
                        } else if (this.currentModalType === 'entity') {
                            newId = this.addEntity({
                                ...baseConfig,
                                joinKey: document.getElementById('inputJoinKey').value || 'id'
                            });
                        } else if (this.currentModalType === 'featureview') {
                            const entitySelect = document.getElementById('inputEntities');
                            const selectedEntities = Array.from(entitySelect.selectedOptions).map(o => o.value);
                            
                            newId = this.addFeatureView({
                                ...baseConfig,
                                subtype: document.getElementById('inputSubtype').value,
                                entities: selectedEntities,
                                features: [...this.tempFeatures],
                                details: {
                                    ...baseConfig.details,
                                    ttl: document.getElementById('inputTTL')?.value || ''
                                }
                            });
                        } else if (this.currentModalType === 'service') {
                            const fvSelect = document.getElementById('inputFeatures');
                            const selectedFVs = Array.from(fvSelect.selectedOptions).map(o => o.value);
                            
                            const fsSelect = document.getElementById('inputFeatureServices');
                            const selectedFSs = fsSelect ? Array.from(fsSelect.selectedOptions).map(o => o.value) : [];
                            
                            const usedBy = document.getElementById('inputUsedBy')?.value || '';
                            
                            newId = this.addService({
                                ...baseConfig,
                                features: selectedFVs,
                                featureServices: selectedFSs,
                                details: {
                                    ...baseConfig.details,
                                    usedBy: usedBy.split(',').map(s => s.trim()).filter(s => s).map(s => ({ name: s, environment: 'Production' }))
                                }
                            });
                        }
                        
                        if (newId) {
                            this.selectNode(newId);
                            this.showNotification('Created', `"${name}" has been created`);
                        }
                    }
                    
                    this.closeModal();
                    this.autoLayout();
                    this.updateCodeEditor();
                }

    closeModal() {
                    document.getElementById('componentModal').classList.remove('active');
                    this.currentModalType = null;
                    this.tempFeatures = [];
                    this.tempTags = [];
                    this.editingNode = null;
                }

    confirmDelete() {
                    this.deleteSelected();
                    this.closeModal();
                }

    async saveSettings() {
                    this.repoSettings.name = document.getElementById('settingsRepoName').value || 'feature_repo';
                    this.repoSettings.location = document.getElementById('settingsRepoLocation').value || '/opt/feast';
                    this.repoSettings.defaultOwner = document.getElementById('settingsDefaultOwner').value || 'Data Platform Team';
                    this.repoSettings.description = document.getElementById('settingsRepoDescription').value || '';
                    
                    this.updateRepoSubtitle();
                    document.getElementById('settingsModal').classList.remove('active');
                    
                    // Persist to backend if we have a repo ID
                    if (this.repoId) {
                        try {
                            const response = await fetch(`${this.apiBaseUrl}/repositories/${this.repoId}/`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': this.getCsrfToken()
                                },
                                body: JSON.stringify({
                                    name: this.repoSettings.name,
                                    location: this.repoSettings.location,
                                    default_owner: this.repoSettings.defaultOwner,
                                    description: this.repoSettings.description
                                })
                            });
                            
                            if (response.ok) {
                                this.showNotification('Settings Saved', 'Repository configuration updated on server');
                            } else {
                                throw new Error('Failed to save settings');
                            }
                        } catch (error) {
                            console.error('Save settings failed:', error);
                            this.showNotification('Warning', 'Settings saved locally but not synced to server');
                        }
                    } else {
                        this.showNotification('Settings Saved', 'Repository configuration updated (local only)');
                    }
                    
                    this.updateCodeEditor();
                }

    showStatsModal() {
                    const modal = document.getElementById('statsModal');
                    const grid = document.getElementById('statsGrid');
                    
                    const stats = {
                        datasource: { count: 0, items: [], color: '#3b82f6', icon: '🗄️' },
                        entity: { count: 0, items: [], color: '#8b5cf6', icon: '👤' },
                        featureview: { count: 0, items: [], color: '#10b981', icon: '📊' },
                        service: { count: 0, items: [], color: '#f97316', icon: '🚀' }
                    };
                    
                    this.nodes.forEach((node, id) => {
                        if (stats[node.type]) {
                            stats[node.type].count++;
                            stats[node.type].items.push(node.name);
                        }
                    });
                    
                    grid.innerHTML = Object.entries(stats).map(([type, data]) => `
                        <div class="stat-detail-card">
                            <div class="stat-detail-header">
                                <div class="stat-detail-icon" style="background: ${data.color}20; color: ${data.color};">
                                    ${data.icon}
                                </div>
                                <div>
                                    <div class="stat-detail-title">${this.config.colors[type].label}s</div>
                                    <div class="stat-detail-value">${data.count}</div>
                                </div>
                            </div>
                            <div class="stat-detail-list">
                                ${data.items.map(item => `
                                    <div class="stat-detail-item">
                                        <span>${item}</span>
                                        <span style="color: var(--text-muted); font-size: 11px;">${type}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('');
                    
                    const fileTree = document.getElementById('fileTree');
                    fileTree.innerHTML = `
                        <div class="file-tree-item dir">${this.repoSettings.name}/</div>
                        <div class="file-tree-item dir" style="padding-left: 40px;">data/</div>
                        <div class="file-tree-item" style="padding-left: 60px;">registry.db</div>
                        ${Array.from(this.nodes.values()).filter(n => n.type === 'datasource').map(n => 
                            `<div class="file-tree-item" style="padding-left: 60px;">${n.name.toLowerCase().replace(/\s+/g, '_')}.parquet</div>`
                        ).join('')}
                        <div class="file-tree-item" style="padding-left: 40px;">entities.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">data_sources.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">feature_views.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">services.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">debezium_configs.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">spark_jobs.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">django_models.py</div>
                        <div class="file-tree-item" style="padding-left: 40px;">postgres_rls.sql</div>
                        <div class="file-tree-item" style="padding-left: 40px;">feature_store.yaml</div>
                        <div class="file-tree-item" style="padding-left: 40px;">requirements.txt</div>
                    `;
                    
                    modal.classList.add('active');
                }

    editSelected() {
                    if (this.selectedNode) {
                        this.showEditModal(this.selectedNode);
                    }
                }

    addEdgeFromManager() {
                    const fromId = document.getElementById('edgeFromSelect').value;
                    const toId = document.getElementById('edgeToSelect').value;
                    
                    if (!fromId || !toId) {
                        alert('Please select both source and target nodes');
                        return;
                    }
                    
                    if (fromId === toId) {
                        alert('Cannot connect a node to itself');
                        return;
                    }
                    
                    const exists = this.nodes.edges.some(e => e.from === fromId && e.to === toId);
                    if (exists) {
                        alert('Connection already exists');
                        return;
                    }
                    
                    const fromNode = this.nodes.get(fromId);
                    const toNode = this.nodes.get(toId);
                    
                    const validConnections = {
                        'entity': ['featureview'],
                        'datasource': ['featureview'],
                        'featureview': ['service'],
                        'service': ['service']
                    };
                    
                    if (!validConnections[fromNode.type]?.includes(toNode.type)) {
                        alert(`Invalid connection: ${fromNode.type} cannot connect to ${toNode.type}`);
                        return;
                    }
                    
                    this.addConnection(fromId, toId);
                    
                    if (toNode.type === 'featureview' && fromNode.type === 'entity') {
                        if (!toNode.entities.includes(fromId)) {
                            toNode.entities.push(fromId);
                        }
                    }
                    
                    if (toNode.type === 'service' && fromNode.type === 'featureview') {
                        if (!toNode.features.includes(fromId)) {
                            toNode.features.push(fromId);
                        }
                    }
                    
                    this.renderEdgeManager();
                    this.showNotification('Connected', `${fromNode.name} → ${toNode.name}`);
                    
                    document.getElementById('edgeFromSelect').value = '';
                    document.getElementById('edgeToSelect').value = '';
                }

    showDataFlow() {
                    const modal = document.getElementById('dataFlowModal');
                    const stagesContainer = document.getElementById('dataFlowStages');
                    
                    const stages = [
                        {
                            name: 'Source Database',
                            icon: '🗄️',
                            status: 'healthy',
                            details: 'PostgreSQL 14.2\nConnections: 45/100\nReplication: Active'
                        },
                        {
                            name: 'Debezium Connector',
                            icon: '⚡',
                            status: 'healthy',
                            details: 'Version: 2.1\nLag: 120ms\nEvents/sec: 1,240'
                        },
                        {
                            name: 'Kafka Topic',
                            icon: '📨',
                            status: 'healthy',
                            details: 'Partitions: 12\nReplication: 3\nRetention: 7 days'
                        },
                        {
                            name: 'Spark Structured Streaming',
                            icon: '🔥',
                            status: 'warning',
                            details: 'Executors: 4/4\nBatch Duration: 5s\nLatency: 8s (elevated)'
                        },
                        {
                            name: 'Postgres Offline Store',
                            icon: '🐘',
                            status: 'healthy',
                            details: 'Size: 2.4TB\nTables: 156\nConnections: 23'
                        }
                    ];
                    
                    stagesContainer.innerHTML = stages.map((stage, idx) => `
                        <div class="data-flow-stage ${idx === 0 ? 'active' : ''}" onclick="this.classList.toggle('expanded')">
                            <div class="stage-icon" style="background: var(--bg-tertiary);">
                                ${stage.icon}
                            </div>
                            <div class="stage-info">
                                <div class="stage-title">${stage.name}</div>
                                <div class="stage-status">
                                    <span class="stage-status-dot status-${stage.status === 'healthy' ? 'green' : stage.status === 'warning' ? 'yellow' : 'red'}"></span>
                                    <span style="color: var(--${stage.status === 'healthy' ? 'feast-green' : stage.status === 'warning' ? 'feast-yellow' : 'feast-red'});">
                                        ${stage.status === 'healthy' ? 'Healthy' : stage.status === 'warning' ? 'Warning' : 'Error'}
                                    </span>
                                </div>
                                <div class="stage-details">
                                    ${stage.details.replace(/\n/g, '<br>')}
                                </div>
                            </div>
                        </div>
                        ${idx < stages.length - 1 ? '<div class="flow-connector">↓</div>' : ''}
                    `).join('');
                    
                    modal.classList.add('active');
                }

    showGuide() {
                    document.getElementById('guideModal').classList.add('active');
                    
                    // Initialize mermaid diagrams if library is loaded
                    if (window.mermaid) {
                        setTimeout(() => {
                            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                        }, 100);
                    }
                    
                    // Default to overview context
                    this.switchGuideContext('overview');
                }

    switchGuideContext(context) {
                    // Update tab states
                    document.querySelectorAll('.context-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    const activeTab = document.getElementById(`tab-${context}`);
                    if (activeTab) {
                        activeTab.classList.add('active');
                    }
                    
                    // Update content visibility
                    document.querySelectorAll('.guide-content').forEach(content => {
                        content.style.display = 'none';
                    });
                    const activeContent = document.getElementById(`guide-${context}`);
                    if (activeContent) {
                        activeContent.style.display = 'block';
                    }
                    
                    // Re-render mermaid diagrams for the visible context
                    if (window.mermaid) {
                        setTimeout(() => {
                            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                        }, 50);
                    }
                }

    showPattern(patternId) {
                    // Update pattern tabs
                    const clickedTab = event.target;
                    document.querySelectorAll('.pattern-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    clickedTab.classList.add('active');
                    
                    // Update pattern content
                    document.querySelectorAll('.pattern-content').forEach(content => {
                        content.style.display = 'none';
                    });
                    const targetContent = document.getElementById(`pattern-${patternId}`);
                    if (targetContent) {
                        targetContent.style.display = 'block';
                    }
                    
                    // Re-render mermaid
                    if (window.mermaid) {
                        setTimeout(() => {
                            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                        }, 50);
                    }
                }

    toggleSearchSetting(setting) {
                    this.searchSettings[setting] = !this.searchSettings[setting];
                    this.updateToggleUI(`toggle${setting.charAt(0).toUpperCase() + setting.slice(1)}`, this.searchSettings[setting]);
                }

    saveUsageDetails() {
                    if (this.editingUsage === null) return;
                    
                    const node = this.nodes.get(this.selectedNode);
                    if (!node) return;
                    
                    const updatedApp = {
                        name: document.getElementById('usageName').value,
                        environment: document.getElementById('usageEnv').value,
                        sla: document.getElementById('usageSLA').value,
                        contact: document.getElementById('usageContact').value,
                        description: document.getElementById('usageDesc').value
                    };
                    
                    if (typeof node.details.usedBy[this.editingUsage] === 'string') {
                        node.details.usedBy[this.editingUsage] = updatedApp;
                    } else {
                        node.details.usedBy[this.editingUsage] = { ...node.details.usedBy[this.editingUsage], ...updatedApp };
                    }
                    
                    document.getElementById('usageModal').classList.remove('active');
                    this.showPanel(this.selectedNode);
                    this.showNotification('Updated', 'Application details saved');
                }

    showUsageDetails(idx) {
                    const node = this.nodes.get(this.selectedNode);
                    if (!node || !node.details.usedBy || !node.details.usedBy[idx]) return;
                    
                    const app = typeof node.details.usedBy[idx] === 'string' 
                        ? { name: node.details.usedBy[idx], environment: 'Production', sla: '99.9%', contact: '', description: '' }
                        : node.details.usedBy[idx];
                    
                    this.editingUsage = idx;
                    
                    document.getElementById('usageModalTitle').textContent = `Edit: ${app.name}`;
                    document.getElementById('usageModalBody').innerHTML = `
                        <div class="form-group">
                            <label class="form-label">Application Name</label>
                            <input type="text" class="form-input" id="usageName" value="${app.name}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Environment</label>
                                <select class="form-select" id="usageEnv">
                                    <option value="Production" ${app.environment === 'Production' ? 'selected' : ''}>Production</option>
                                    <option value="Staging" ${app.environment === 'Staging' ? 'selected' : ''}>Staging</option>
                                    <option value="Development" ${app.environment === 'Development' ? 'selected' : ''}>Development</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">SLA</label>
                                <input type="text" class="form-input" id="usageSLA" value="${app.sla || '99.9%'}" placeholder="99.9%">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contact</label>
                            <input type="text" class="form-input" id="usageContact" value="${app.contact || ''}" placeholder="team@company.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" id="usageDesc" placeholder="How this app uses the features...">${app.description || ''}</textarea>
                        </div>
                    `;
                    
                    document.getElementById('usageModal').classList.add('active');
                }

    switchUser() {
                    const select = document.getElementById('userSelect');
                    const users = {
                        john: { name: 'John Doe', initials: 'JD', role: 'Data Engineer', team: 'Data Engineering' },
                        jane: { name: 'Jane Smith', initials: 'JS', role: 'Data Scientist', team: 'Machine Learning' },
                        bob: { name: 'Bob Johnson', initials: 'BJ', role: 'Platform Admin', team: 'Platform' },
                        alice: { name: 'Alice Chen', initials: 'AC', role: 'ML Engineer', team: 'Machine Learning' }
                    };
                    
                    const user = users[select.value];
                    if (user) {
                        document.getElementById('teamSelect').value = user.team;
                        document.getElementById('roleSelect').value = user.role;
                    }
                }

    closePushModal() {
                    if (this.pushInterval) {
                        clearInterval(this.pushInterval);
                        this.pushInterval = null;
                    }
                    document.getElementById('pushRepoModal').classList.remove('active');
                }

    async refreshRepo() {
                    if (!this.repoId) {
                        this.showNotification('Error', 'No repository ID to refresh');
                        return;
                    }
                    
                    this.showNotification('Refresh', 'Fetching latest repository state...');
                    
                    try {
                        const response = await fetch(`${this.apiBaseUrl}/repositories/${this.repoId}/check_status/`);
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        // Check if server has newer version
                        const currentHash = SparkMD5.hash(JSON.stringify(this.exportToJSON()));
                        
                        if (data.server_hash && data.server_hash !== currentHash) {
                            // Server has different version - reload
                            if (confirm('Server has a different version. Reload? (local changes will be lost)')) {
                                await this.loadFromBackend();
                            }
                        } else {
                            this.showNotification('Up to date', 'Repository is synchronized');
                        }
                        
                    } catch (error) {
                        console.error('Refresh failed:', error);
                        this.showNotification('Error', 'Failed to refresh repository');
                    }
                }

    copyCodeEditor() {
                    const content = document.getElementById('codeEditorContent').innerText;
                    navigator.clipboard.writeText(content);
                    this.showNotification('Copied', 'Code copied to clipboard');
                }

    selectCodeFile(filename) {
                    this.currentCodeFile = filename;
                    
                    document.querySelectorAll('.file-browser-item').forEach(el => {
                        el.classList.remove('active');
                        if (el.querySelector('.file-name').textContent === filename) {
                            el.classList.add('active');
                        }
                    });
                    
                    document.getElementById('currentFileName').textContent = filename;
                    document.getElementById('currentFilePath').textContent = `${this.repoSettings.name}/${filename}`;
                    
                    let content = '';
                    switch(filename) {
                        case 'entities.py':
                            content = this.generateEntitiesFile();
                            break;
                        case 'data_sources.py':
                            content = this.generateDataSourcesFile();
                            break;
                        case 'feature_views.py':
                            content = this.generateFeatureViewsFile();
                            break;
                        case 'services.py':
                            content = this.generateServicesFile();
                            break;
                        case 'debezium_configs.py':
                            content = this.generateDebeziumConfigs();
                            break;
                        case 'spark_jobs.py':
                            content = this.generateSparkJobs();
                            break;
                        case 'django_models.py':
                            content = this.generateDjangoModels();
                            break;
                        case 'postgres_rls.sql':
                            content = this.generatePostgresRLS();
                            break;
                    }
                    
                    document.getElementById('codeEditorContent').innerHTML = content;
                }

    renderPythonFileBrowser() {
                    const sidebar = document.getElementById('fileSidebar');
                    const files = [
                        { name: 'entities.py', icon: '👤', desc: 'Entity definitions', active: this.currentCodeFile === 'entities.py' },
                        { name: 'data_sources.py', icon: '🗄️', desc: 'Data source configs', active: this.currentCodeFile === 'data_sources.py' },
                        { name: 'feature_views.py', icon: '📊', desc: 'Feature view definitions', active: this.currentCodeFile === 'feature_views.py' },
                        { name: 'services.py', icon: '🚀', desc: 'Feature services', active: this.currentCodeFile === 'services.py' },
                        { name: 'debezium_configs.py', icon: '⚡', desc: 'CDC connectors', active: this.currentCodeFile === 'debezium_configs.py' },
                        { name: 'spark_jobs.py', icon: '🔥', desc: 'Streaming jobs', active: this.currentCodeFile === 'spark_jobs.py' },
                        { name: 'django_models.py', icon: '🎭', desc: 'Access control models', active: this.currentCodeFile === 'django_models.py' },
                        { name: 'postgres_rls.sql', icon: '🐘', desc: 'Row Level Security', active: this.currentCodeFile === 'postgres_rls.sql' }
                    ];
                    
                    sidebar.innerHTML = `
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Python Files
                        </div>
                        <div class="file-browser">
                            ${files.map(f => `
                                <div class="file-browser-item ${f.active ? 'active' : ''}" onclick="diagram.selectCodeFile('${f.name}')">
                                    <span class="file-icon">${f.icon}</span>
                                    <span class="file-name">${f.name}</span>
                                    <span class="file-description">${f.desc}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    this.selectCodeFile(this.currentCodeFile);
                }

    renderSingleFile(filename, title, content) {
                    document.getElementById('fileSidebar').innerHTML = `
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${title}
                        </div>
                        <div class="file-browser">
                            <div class="file-browser-item active">
                                <span class="file-icon">📄</span>
                                <span class="file-name">${filename}</span>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('currentFileName').textContent = filename;
                    document.getElementById('currentFilePath').textContent = `${this.repoSettings.name}/${filename}`;
                    document.getElementById('codeEditorContent').innerHTML = content;
                }

    async askLLM(promptType) {
                    const messagesContainer = document.getElementById('llmMessages');
                    const context = this.selectedNode ? this.nodes.get(this.selectedNode) : null;
                    
                    let userMessage = '';
                    
                    switch(promptType) {
                        case 'generate_code':
                            userMessage = 'Generate Feast code for this architecture';
                            break;
                        case 'optimize':
                            userMessage = 'Suggest optimizations for my feature views';
                            break;
                        case 'lineage':
                            userMessage = 'Explain this data lineage';
                            break;
                        case 'validate':
                            userMessage = 'Validate my entity relationships';
                            break;
                    }
                    
                    // Add user message
                    const userMsgDiv = document.createElement('div');
                    userMsgDiv.className = 'llm-message user';
                    userMsgDiv.textContent = userMessage;
                    messagesContainer.appendChild(userMsgDiv);
                    
                    // Show loading
                    const loadingDiv = document.createElement('div');
                    loadingDiv.className = 'llm-message assistant';
                    loadingDiv.innerHTML = '<div class="spinner"></div> Thinking...';
                    messagesContainer.appendChild(loadingDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // Check if we have a chat session
                    if (!this.currentChatSession) {
                        // Create new session via backend
                        try {
                            const response = await fetch(`${this.apiBaseUrl}/chats/`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': this.getCsrfToken()
                                },
                                body: JSON.stringify({
                                    repository_id: this.repoId,
                                    title: `Chat about ${this.repoSettings.name}`,
                                    initial_message: userMessage,
                                    query_type: promptType
                                })
                            });
                            
                            if (!response.ok) {
                                throw new Error('Failed to create chat session');
                            }
                            
                            const data = await response.json();
                            this.currentChatSession = data.id;
                            
                            // Remove loading, messages already in response
                            loadingDiv.remove();
                            
                            // Display messages from response
                            if (data.messages) {
                                data.messages.forEach(msg => {
                                    if (msg.role === 'assistant') {
                                        const assistantMsgDiv = document.createElement('div');
                                        assistantMsgDiv.className = 'llm-message assistant';
                                        assistantMsgDiv.innerHTML = msg.content;
                                        messagesContainer.appendChild(assistantMsgDiv);
                                    }
                                });
                            }
                            
                            this.addLLMActionButtons(messagesContainer.lastChild);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            return;
                            
                        } catch (error) {
                            console.error('LLM session creation failed:', error);
                            loadingDiv.innerHTML = 'Error: LLM service unavailable. Using local fallback...';
                            
                            // Fall back to local generation
                            setTimeout(() => {
                                loadingDiv.remove();
                                this.fallbackLLMResponse(promptType, context, messagesContainer);
                            }, 1000);
                            return;
                        }
                    }
                    
                    // Existing session - send message
                    try {
                        const response = await fetch(`${this.apiBaseUrl}/chats/${this.currentChatSession}/send_message/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': this.getCsrfToken()
                            },
                            body: JSON.stringify({
                                message: userMessage,
                                query_type: promptType
                            })
                        });
                        
                        const data = await response.json();
                        
                        loadingDiv.remove();
                        
                        if (data.success) {
                            const assistantMsgDiv = document.createElement('div');
                            assistantMsgDiv.className = 'llm-message assistant';
                            assistantMsgDiv.innerHTML = data.response;
                            messagesContainer.appendChild(assistantMsgDiv);
                            this.addLLMActionButtons(assistantMsgDiv);
                        } else {
                            throw new Error(data.error || 'Unknown error');
                        }
                        
                    } catch (error) {
                        console.error('LLM query failed:', error);
                        loadingDiv.remove();
                        this.fallbackLLMResponse(promptType, context, messagesContainer);
                    }
                    
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }

    sendLLMMessage() {
                    const input = document.getElementById('llmInput');
                    const message = input.value.trim();
                    if (!message) return;
                    
                    const messagesContainer = document.getElementById('llmMessages');
                    
                    const userMsgDiv = document.createElement('div');
                    userMsgDiv.className = 'llm-message user';
                    userMsgDiv.textContent = message;
                    messagesContainer.appendChild(userMsgDiv);
                    
                    input.value = '';
                    
                    const loadingDiv = document.createElement('div');
                    loadingDiv.className = 'llm-message assistant';
                    loadingDiv.innerHTML = '<div class="spinner"></div> Analyzing your feature store...';
                    messagesContainer.appendChild(loadingDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    setTimeout(() => {
                        loadingDiv.remove();
                        
                        const assistantMsgDiv = document.createElement('div');
                        assistantMsgDiv.className = 'llm-message assistant';
                        assistantMsgDiv.innerHTML = `
                            <p>I've analyzed your question about "${message}".</p>
                            <p>Based on your current architecture with ${this.nodes.size} components, I recommend reviewing the data lineage from sources to services to ensure consistency.</p>
                            <p>Would you like me to:</p>
                            <ul style="margin-left: 20px; margin-top: 8px;">
                                <li>Generate specific code for a component</li>
                                <li>Analyze feature dependencies</li>
                                <li>Suggest performance improvements</li>
                            </ul>
                        `;
                        messagesContainer.appendChild(assistantMsgDiv);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 2000);
                }

    applyLLMSuggestion() {
                    this.showNotification('Applied', 'LLM suggestions applied to diagram');
                }

    copyLLMResponse(btn) {
                    const message = btn.closest('.llm-message');
                    const text = message.querySelector('p')?.textContent || '';
                    navigator.clipboard.writeText(text);
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = 'Copy', 2000);
                }

    dismissLLM(btn) {
                    btn.closest('.llm-message').remove();
                }

    addFeature() {
                    const name = document.getElementById('featureName').value.trim();
                    const type = document.getElementById('featureType').value;
                    
                    if (name) {
                        this.tempFeatures.push({ name, type });
                        document.getElementById('featureName').value = '';
                        this.renderFeaturesList();
                    }
                }

    removeFeature(idx) {
                    this.tempFeatures.splice(idx, 1);
                    this.renderFeaturesList();
                }

    addTag() {
                    const input = document.getElementById('tagInput');
                    const tag = input.value.trim().toLowerCase().replace(/\s+/g, '_');
                    
                    if (tag && !this.tempTags.includes(tag)) {
                        this.tempTags.push(tag);
                        input.value = '';
                        this.renderTagsList();
                    }
                }

    removeTag(idx) {
                    this.tempTags.splice(idx, 1);
                    this.renderTagsList();
                }

    async requestAccess(nodeId) {
                    const node = this.nodes.get(nodeId);
                    if (!node) return;
                    
                    // Find the backend data source ID if it exists
                    // This requires storing backend IDs on nodes - add this when loading from backend
                    const backendId = node.backendId;
                    
                    if (!backendId) {
                        // Local-only node, just show notification
                        this.showNotification('Access Requested', `Request sent to ${node.ownedBy} for ${node.name}`);
                        setTimeout(() => {
                            this.showNotification('Request Approved', `You now have read access to ${node.name}`);
                        }, 2000);
                        return;
                    }
                    
                    try {
                        // Create audit log entry for access request
                        const response = await fetch(`${this.apiBaseUrl}/audit-logs/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': this.getCsrfToken()
                            },
                            body: JSON.stringify({
                                action: 'ACCESS_REQUEST',
                                resource_type: 'datasource',
                                resource_name: node.name,
                                details: {
                                    data_source_id: backendId,
                                    owner: node.ownedBy
                                }
                            })
                        });
                        
                        if (response.ok) {
                            this.showNotification('Access Requested', `Request logged for ${node.name}`);
                        } else {
                            throw new Error('Failed to log request');
                        }
                        
                    } catch (error) {
                        console.error('Access request failed:', error);
                        this.showNotification('Error', 'Failed to submit access request');
                    }
                }

    showAddMenu() {
                    const menu = document.querySelector('.fab-menu');
                    const buttons = ['fabSource', 'fabEntity', 'fabView', 'fabService'];
                    const isVisible = document.getElementById('fabSource').style.display !== 'none';
                    
                    buttons.forEach((id, idx) => {
                        setTimeout(() => {
                            document.getElementById(id).style.display = isVisible ? 'none' : 'flex';
                        }, idx * 50);
                    });
                }

    copyCode(btn) {
                    const code = btn.closest('.code-block').querySelector('.code-content').innerText;
                    navigator.clipboard.writeText(code);
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = 'Copy', 2000);
                }

    updateDBTypeInfo() {
                    const kind = document.getElementById('inputKind').value;
                    const dbType = this.databaseTypes[kind];
                    if (dbType) {
                        document.getElementById('dbTypeHint').textContent = `Default process: ${dbType.defaultProcess}`;
                    }
                }

    renderEdgeManager() {
                    const edgeList = document.getElementById('edgeList');
                    const fromSelect = document.getElementById('edgeFromSelect');
                    const toSelect = document.getElementById('edgeToSelect');
                    
                    const totalEdges = this.nodes.edges.length;
                    const validEdges = this.nodes.edges.filter(e => this.nodes.has(e.from) && this.nodes.has(e.to)).length;
                    const orphanedEdges = totalEdges - validEdges;
                    
                    document.getElementById('edgeCountTotal').textContent = totalEdges;
                    document.getElementById('edgeCountValid').textContent = validEdges;
                    document.getElementById('edgeCountOrphaned').textContent = orphanedEdges;
                    
                    if (this.nodes.edges.length === 0) {
                        edgeList.innerHTML = `
                            <div class="empty-state" style="padding: 40px 20px;">
                                <div class="empty-icon">🔗</div>
                                <div class="empty-title">No Connections</div>
                                <p style="font-size: 13px;">Create connections between nodes to establish lineage</p>
                            </div>
                        `;
                    } else {
                        edgeList.innerHTML = this.nodes.edges.map(edge => {
                            const fromNode = this.nodes.get(edge.from);
                            const toNode = this.nodes.get(edge.to);
                            const isValid = fromNode && toNode;
                            
                            if (!isValid) {
                                return `
                                    <div class="edge-item" style="border-color: var(--feast-red); opacity: 0.7;">
                                        <div class="edge-header">
                                            <div style="color: var(--feast-red); font-size: 20px;">⚠️</div>
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500; color: var(--feast-red);">Orphaned Connection</div>
                                                <div style="font-size: 12px; color: var(--text-muted);">
                                                    ${!fromNode ? `Missing source: ${edge.from}` : ''}
                                                    ${!fromNode && !toNode ? ' | ' : ''}
                                                    ${!toNode ? `Missing target: ${edge.to}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="edge-actions">
                                            <button class="edge-btn danger" onclick="diagram.deleteEdge('${edge.id}')">Delete</button>
                                        </div>
                                    </div>
                                `;
                            }
                            
                            const fromConfig = this.config.colors[fromNode.type];
                            const toConfig = this.config.colors[toNode.type];
                            
                            let fromIcon = fromConfig.icon;
                            if (fromNode.type === 'datasource' && fromNode.dbType && fromNode.dbType.icon) {
                                fromIcon = fromNode.dbType.icon;
                            }
                            
                            let toIcon = toConfig.icon;
                            if (toNode.type === 'datasource' && toNode.dbType && toNode.dbType.icon) {
                                toIcon = toNode.dbType.icon;
                            }
                            
                            return `
                                <div class="edge-item">
                                    <div class="edge-header">
                                        <div class="edge-node-icon" style="background: ${fromConfig.bg}20; color: ${fromConfig.light};">
                                            ${fromIcon}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500;">${fromNode.name}</div>
                                            <div style="font-size: 11px; color: var(--text-muted);">${fromConfig.label}</div>
                                        </div>
                                        <span class="edge-arrow">→</span>
                                        <div class="edge-node-icon" style="background: ${toConfig.bg}20; color: ${toConfig.light};">
                                            ${toIcon}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500;">${toNode.name}</div>
                                            <div style="font-size: 11px; color: var(--text-muted);">${toConfig.label}</div>
                                        </div>
                                    </div>
                                    <div class="edge-actions">
                                        <button class="edge-btn" onclick="diagram.selectNode('${edge.from}')">View Source</button>
                                        <button class="edge-btn" onclick="diagram.selectNode('${edge.to}')">View Target</button>
                                        <button class="edge-btn danger" onclick="diagram.deleteEdge('${edge.id}')">Disconnect</button>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    }
                    
                    const nodeOptions = Array.from(this.nodes.values()).map(node => {
                        const config = this.config.colors[node.type];
                        let icon = config.icon;
                        if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
                            icon = node.dbType.icon;
                        }
                        return `<option value="${node.id}">${icon} ${node.name}</option>`;
                    }).join('');
                    
                    fromSelect.innerHTML = '<option value="">Select source...</option>' + nodeOptions;
                    toSelect.innerHTML = '<option value="">Select target...</option>' + nodeOptions;
                }

    deleteEdge(edgeId) {
                    if (!confirm('Are you sure you want to delete this connection?')) return;
                    
                    const edgeIndex = this.nodes.edges.findIndex(e => e.id === edgeId);
                    if (edgeIndex === -1) return;
                    
                    const edge = this.nodes.edges[edgeIndex];
                    
                    this.nodes.edges.splice(edgeIndex, 1);
                    
                    const fromNode = this.nodes.get(edge.from);
                    const toNode = this.nodes.get(edge.to);
                    
                    if (fromNode) {
                        fromNode.outputs = fromNode.outputs.filter(id => id !== edge.to);
                    }
                    if (toNode) {
                        toNode.inputs = toNode.inputs.filter(id => id !== edge.from);
                    }
                    
                    if (toNode && toNode.type === 'featureview') {
                        toNode.entities = toNode.entities.filter(id => id !== edge.from);
                    }
                    if (toNode && toNode.type === 'service') {
                        toNode.features = toNode.features.filter(id => id !== edge.from);
                        if (toNode.featureServices) {
                            toNode.featureServices = toNode.featureServices.filter(id => id !== edge.from);
                        }
                    }
                    
                    this.renderEdgeManager();
                    this.showNotification('Disconnected', 'Connection removed');
                    
                    if (this.selectedNode) {
                        this.showPanel(this.selectedNode);
                    }
                }

    async updateDjangoPanel() {
                    // Fetch current user from backend
                    try {
                        const userResponse = await fetch(`${this.apiBaseUrl}/auth/user/`);
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            this.currentUser = {
                                id: userData.id,
                                name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
                                initials: (userData.first_name?.[0] || userData.username[0]).toUpperCase(),
                                role: 'Authenticated User',
                                team: 'Django User'
                            };
                        }
                    } catch (e) {
                        // Use existing mock user
                    }
                    
                    document.getElementById('djangoCurrentUser').textContent = this.currentUser.name;
                    document.getElementById('djangoTeam').textContent = this.currentUser.team;
                    document.getElementById('djangoRole').textContent = this.currentUser.role;
                    
                    // Fetch real audit logs
                    try {
                        const auditResponse = await fetch(`${this.apiBaseUrl}/audit-logs/?limit=10`);
                        if (auditResponse.ok) {
                            const auditData = await auditResponse.json();
                            const auditContainer = document.getElementById('djangoAuditLog');
                            
                            if (auditData.results && auditData.results.length > 0) {
                                auditContainer.innerHTML = auditData.results.map(event => {
                                    const time = new Date(event.timestamp).toLocaleTimeString();
                                    return `
                                        <div class="audit-log-item">
                                            <div class="audit-time">${time}</div>
                                            <div>
                                                <span class="audit-action">${event.action}</span>
                                                <span style="color: var(--text-muted);"> • </span>
                                                <span>${event.resource_name}</span>
                                            </div>
                                            <div class="audit-user">${event.user_username || 'System'}</div>
                                        </div>
                                    `;
                                }).join('');
                            }
                        }
                    } catch (e) {
                        // Fallback to mock data
                        const auditContainer = document.getElementById('djangoAuditLog');
                        const auditEvents = [
                            { time: '2 min ago', action: 'Viewed', resource: 'User Database', user: this.currentUser.name },
                            { time: '15 min ago', action: 'Modified', resource: 'Transaction History', user: this.currentUser.name }
                        ];
                        auditContainer.innerHTML = auditEvents.map(event => `
                            <div class="audit-log-item">
                                <div class="audit-time">${event.time}</div>
                                <div>
                                    <span class="audit-action">${event.action}</span>
                                    <span style="color: var(--text-muted);"> • </span>
                                    <span>${event.resource}</span>
                                </div>
                                <div class="audit-user">${event.user}</div>
                            </div>
                        `).join('');
                    }
                    
                    // Update permissions based on actual data sources
                    const permsContainer = document.getElementById('djangoPermissions');
                    const datasources = Array.from(this.nodes.values()).filter(n => n.type === 'datasource');
                    
                    permsContainer.innerHTML = datasources.map(ds => {
                        const perm = this.calculatePermission(ds);
                        const permClass = {
                            'owned': 'perm-owned',
                            'granted': 'perm-granted',
                            'pending': 'perm-pending',
                            'denied': 'perm-denied'
                        }[perm];
                        
                        return `
                            <div class="detail-row">
                                <span class="detail-label">${ds.name}</span>
                                <span class="permission-badge ${permClass}">
                                    ${perm === 'owned' ? '👑 Owned' : 
                                      perm === 'granted' ? '✅ Granted' : 
                                      perm === 'pending' ? '⏳ Pending' : '❌ Denied'}
                                </span>
                            </div>
                        `;
                    }).join('') || '<p style="color: var(--text-muted);">No data sources</p>';
                    
                    // Column security - use actual node data
                    const colContainer = document.getElementById('djangoColumnSecurity');
                    if (this.selectedNode && this.nodes.get(this.selectedNode)?.type === 'datasource') {
                        const node = this.nodes.get(this.selectedNode);
                        const columns = node.columnSecurity || { piiColumns: [], maskedColumns: [], restrictedColumns: [] };
                        
                        colContainer.innerHTML = `
                            <div class="column-security-grid">
                                ${['user_id', 'email', 'name', 'phone', 'ssn', 'created_at', 'updated_at'].map(col => {
                                    const isPii = columns.piiColumns.includes(col);
                                    const isMasked = columns.maskedColumns.includes(col);
                                    const isRestricted = columns.restrictedColumns.includes(col);
                                    
                                    let status = 'accessible';
                                    let statusClass = 'status-accessible';
                                    
                                    if (isRestricted) {
                                        status = 'denied';
                                        statusClass = 'status-denied';
                                    } else if (isMasked) {
                                        status = 'masked';
                                        statusClass = 'status-masked';
                                    }
                                    
                                    return `
                                        <div class="column-item">
                                            <span>${col} ${isPii ? '🔒' : ''}</span>
                                            <span class="column-status ${statusClass}" title="${status}"></span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;
                    } else {
                        colContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Select a data source to view column security</p>';
                    }
                }

    renderFeaturesList() {
                    const container = document.getElementById('featuresList');
                    if (!container) return;
                    
                    container.innerHTML = this.tempFeatures.map((f, idx) => `
                        <div class="feature-tag-builder">
                            <div class="feature-tag-info">
                                <span class="feature-tag-name">${f.name}</span>
                                <span class="feature-tag-type">${f.type}</span>
                            </div>
                            <button class="feature-tag-remove" onclick="diagram.removeFeature(${idx})">×</button>
                        </div>
                    `).join('');
                }

    renderTagsList() {
                    const container = document.getElementById('tagsList');
                    if (!container) return;
                    
                    container.innerHTML = this.tempTags.map((tag, idx) => `
                        <div class="feature-tag-builder">
                            <div class="feature-tag-info">
                                <span class="feature-tag-name">#${tag}</span>
                            </div>
                            <button class="feature-tag-remove" onclick="diagram.removeTag(${idx})">×</button>
                        </div>
                    `).join('');
                }

    async forcePushRepo(payload) {
                    document.getElementById('pushStatus').innerHTML = 'Force updating...';
                    
                    try {
                        const response = await fetch(`${this.apiBaseUrl}/repositories/${this.repoSettings.id}/force_update/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': this.getCsrfToken()
                            },
                            body: JSON.stringify(payload)
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            document.getElementById('pushProgress').style.width = '100%';
                            document.getElementById('pushProgress').style.backgroundColor = 'var(--feast-green)';
                            document.getElementById('pushStatus').innerHTML = 
                                '✅ Force update successful!';
                            this.showNotification('Force Updated', 'Repository overwritten');
                        } else {
                            throw new Error(data.detail || 'Force update failed');
                        }
                    } catch (error) {
                        document.getElementById('pushStatus').innerHTML = 
                            `❌ Force update failed: ${error.message}`;
                        document.getElementById('pushProgress').style.backgroundColor = 'var(--feast-red)';
                    }
                }

    showUserSelector() {
                    document.getElementById('userSelectorModal').classList.add('active');
                }

    updateLLMContext() {
                    const container = document.getElementById('llmContextContent');
                    
                    if (!this.selectedNode) {
                        const stats = {
                            nodes: this.nodes.size,
                            edges: this.nodes.edges.length,
                            sources: Array.from(this.nodes.values()).filter(n => n.type === 'datasource').length,
                            entities: Array.from(this.nodes.values()).filter(n => n.type === 'entity').length,
                            views: Array.from(this.nodes.values()).filter(n => n.type === 'featureview').length,
                            services: Array.from(this.nodes.values()).filter(n => n.type === 'service').length
                        };
                        
                        container.innerHTML = `
                            <div class="llm-context-item">
                                <span>📊</span>
                                <span>Architecture Overview: ${stats.nodes} components</span>
                            </div>
                            <div class="llm-context-item">
                                <span>🔗</span>
                                <span>${stats.edges} connections</span>
                            </div>
                            <div class="llm-context-item">
                                <span>🗄️</span>
                                <span>${stats.sources} sources, ${stats.entities} entities</span>
                            </div>
                            <div class="llm-context-item">
                                <span>⚡</span>
                                <span>${stats.views} views, ${stats.services} services</span>
                            </div>
                        `;
                    } else {
                        const node = this.nodes.get(this.selectedNode);
                        const config = this.config.colors[node.type];
                        
                        let icon = config.icon;
                        if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
                            icon = node.dbType.icon;
                        }
                        
                        container.innerHTML = `
                            <div class="llm-context-item">
                                <span>${icon}</span>
                                <span><strong>${node.name}</strong> (${config.label})</span>
                            </div>
                            ${node.description ? `
                            <div class="llm-context-item">
                                <span>📝</span>
                                <span>${node.description.substring(0, 60)}${node.description.length > 60 ? '...' : ''}</span>
                            </div>
                            ` : ''}
                            ${node.features ? `
                            <div class="llm-context-item">
                                <span>⚡</span>
                                <span>${node.features.length} features</span>
                            </div>
                            ` : ''}
                            ${node.entities ? `
                            <div class="llm-context-item">
                                <span>👤</span>
                                <span>${node.entities.length} entities</span>
                            </div>
                            ` : ''}
                        `;
                    }
                }

    updateLayerToggles() {
                    const toggles = {
                        datasource: 'toggleSources',
                        entity: 'toggleEntities',
                        featureview: 'toggleViews',
                        service: 'toggleServices'
                    };
                    
                    Object.entries(toggles).forEach(([type, id]) => {
                        const btn = document.getElementById(id);
                        if (this.visibleLayers[type]) {
                            btn.classList.remove('hidden-layer');
                            btn.querySelector('.eye-icon').textContent = '👁';
                        } else {
                            btn.classList.add('hidden-layer');
                            btn.querySelector('.eye-icon').textContent = '🚫';
                        }
                    });
                }

    fallbackLLMResponse(promptType, context, container) {
                    // Your existing mock response logic as fallback
                    let assistantResponse = '';
                    
                    switch(promptType) {
                        case 'generate_code':
                            assistantResponse = this.generateLLMCodeResponse(context);
                            break;
                        case 'optimize':
                            assistantResponse = this.generateLLMOptimizeResponse(context);
                            break;
                        case 'lineage':
                            assistantResponse = this.generateLLMLineageResponse(context);
                            break;
                        case 'validate':
                            assistantResponse = this.generateLLMValidateResponse();
                            break;
                    }
                    
                    const assistantMsgDiv = document.createElement('div');
                    assistantMsgDiv.className = 'llm-message assistant';
                    assistantMsgDiv.innerHTML = assistantResponse + '<p style="color: var(--text-muted); font-size: 11px; margin-top: 8px;">[Local fallback - backend unavailable]</p>';
                    container.appendChild(assistantMsgDiv);
                    this.addLLMActionButtons(assistantMsgDiv);
                }

    updateRepoSubtitle() {
                    document.getElementById('repoSubtitle').textContent = `${this.repoSettings.name} • ${this.repoSettings.location}`;
                }

    updateStats() {
                    const stats = {
                        datasource: 0,
                        entity: 0,
                        featureview: 0,
                        service: 0,
                        features: 0
                    };
                    
                    this.nodes.forEach(node => {
                        if (stats[node.type] !== undefined) {
                            stats[node.type]++;
                        }
                        if (node.features && Array.isArray(node.features)) {
                            stats.features += node.features.length;
                        }
                    });
                    
                    document.getElementById('statSources').textContent = stats.datasource;
                    document.getElementById('statEntities').textContent = stats.entity;
                    document.getElementById('statViews').textContent = stats.featureview;
                    document.getElementById('statServices').textContent = stats.service;
                    document.getElementById('statFeatures').textContent = stats.features;
                }

    showTooltip(nodeId, x, y) {
                    const node = this.nodes.get(nodeId);
                    const tooltip = document.getElementById('tooltip');
                    
                    let icon = this.config.colors[node.type].icon;
                    if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
                        icon = node.dbType.icon;
                    }
                    
                    document.getElementById('tooltipIcon').textContent = icon;
                    document.getElementById('tooltipTitle').textContent = node.name;
                    
                    let subtitle = `${this.config.colors[node.type].label}`;
                    if (node.subtype) subtitle += ` • ${node.subtype}`;
                    if (node.kind) {
                        const dbName = node.dbType ? node.dbType.name : node.kind;
                        subtitle += ` • ${dbName}`;
                    }
                    document.getElementById('tooltipSubtitle').textContent = subtitle;
                    
                    const tagsDiv = document.getElementById('tooltipTags');
                    const tagList = document.getElementById('tooltipTagList');
                    if (node.tags && node.tags.length > 0) {
                        tagsDiv.style.display = 'block';
                        tagList.innerHTML = node.tags.map(tag => 
                            `<span class="tooltip-tag">#${tag}</span>`
                        ).join('');
                    } else {
                        tagsDiv.style.display = 'none';
                    }
                    
                    const featuresDiv = document.getElementById('tooltipFeatures');
                    const featureList = document.getElementById('tooltipFeatureList');
                    
                    if (node.features && node.features.length > 0) {
                        featuresDiv.style.display = 'block';
                        featureList.innerHTML = node.features.slice(0, 5).map(f => {
                            const name = typeof f === 'string' ? f : f.name;
                            return `<span class="tooltip-feature-tag">${name}</span>`;
                        }).join('');
                        if (node.features.length > 5) {
                            featureList.innerHTML += `<span style="color: var(--text-muted); font-size: 11px;">+${node.features.length - 5} more</span>`;
                        }
                    } else {
                        featuresDiv.style.display = 'none';
                    }
                    
                    const descDiv = document.getElementById('tooltipDescription');
                    const descText = document.getElementById('tooltipDescText');
                    if (node.description) {
                        descDiv.style.display = 'block';
                        descText.textContent = node.description;
                    } else {
                        descDiv.style.display = 'none';
                    }
                    
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${Math.min(x + 20, window.innerWidth - 340)}px`;
                    tooltip.style.top = `${Math.min(y + 20, window.innerHeight - 200)}px`;
                }

    updateTooltip(x, y) {
                    const tooltip = document.getElementById('tooltip');
                    tooltip.style.left = `${Math.min(x + 20, window.innerWidth - 340)}px`;
                    tooltip.style.top = `${Math.min(y + 20, window.innerHeight - 200)}px`;
                }

    hideTooltip() {
                    document.getElementById('tooltip').style.display = 'none';
                }

    showNotification(title, text) {
                    const notif = document.getElementById('notification');
                    document.getElementById('notifTitle').textContent = title;
                    document.getElementById('notifText').textContent = text;
                    
                    notif.classList.add('show');
                    setTimeout(() => {
                        notif.classList.remove('show');
                    }, 3000);
                }

    loadPattern(patternName) {
                    this.showNotification('Loading Pattern', `Importing ${patternName} architecture...`);
                    // Implementation would load predefined architectures
                    document.getElementById('guideModal').classList.remove('active');
                }

    addLLMActionButtons(messageDiv) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'llm-actions';
                    actionsDiv.innerHTML = `
                        <button class="llm-action-btn" onclick="diagram.applyLLMSuggestion()">Apply to Diagram</button>
                        <button class="llm-action-btn" onclick="diagram.copyLLMResponse(this)">Copy</button>
                        <button class="llm-action-btn" onclick="diagram.dismissLLM(this)">Dismiss</button>
                    `;
                    messageDiv.appendChild(actionsDiv);
                }

    renderSearchResults(grouped, query) {
                    let html = '';
                    
                    const categories = [
                        { key: 'featureview', label: 'Feature Views', icon: '📊', color: '#10b981' },
                        { key: 'feature', label: 'Features', icon: '⚡', color: '#06b6d4' },
                        { key: 'entity', label: 'Entities', icon: '👤', color: '#8b5cf6' },
                        { key: 'service', label: 'Services', icon: '🚀', color: '#f97316' },
                        { key: 'datasource', label: 'Data Sources', icon: '🗄️', color: '#3b82f6' }
                    ];
                    
                    categories.forEach(cat => {
                        const items = grouped[cat.key];
                        if (items && items.length > 0) {
                            html += `
                                <div class="search-category">
                                    <div class="search-category-header">
                                        <span class="search-category-icon">${cat.icon}</span>
                                        <span>${cat.label}</span>
                                    </div>
                            `;
                            
                            items.forEach(item => {
                                const highlightedName = this.highlightText(item.name, query);
                                const metaText = this.getSearchResultMeta(item);
                                
                                html += `
                                    <div class="search-result-item" onclick="diagram.selectSearchResult('${item.id}', '${item.type}')">
                                        <div class="search-result-icon" style="background: ${cat.color}20; color: ${cat.color};">
                                            ${cat.icon}
                                        </div>
                                        <div class="search-result-info">
                                            <div class="search-result-name">${highlightedName}</div>
                                            <div class="search-result-meta">${metaText}</div>
                                        </div>
                                        ${item.matchType !== 'name' ? `<span class="search-result-badge">${item.matchType}</span>` : ''}
                                    </div>
                                `;
                            });
                            
                            html += '</div>';
                        }
                    });
                    
                    return html;
                }

    groupSearchResults(results) {
                    const grouped = {
                        featureview: [],
                        feature: [],
                        entity: [],
                        service: [],
                        datasource: []
                    };
                    
                    results.forEach(result => {
                        if (result.nodeType === 'featureview') {
                            if (grouped.featureview.length < 5) grouped.featureview.push(result);
                        } else if (result.nodeType === 'feature') {
                            if (grouped.feature.length < 5) grouped.feature.push(result);
                        } else if (result.nodeType === 'entity') {
                            if (grouped.entity.length < 5) grouped.entity.push(result);
                        } else if (result.nodeType === 'service') {
                            if (grouped.service.length < 5) grouped.service.push(result);
                        } else if (result.nodeType === 'datasource') {
                            if (grouped.datasource.length < 5) grouped.datasource.push(result);
                        }
                    });
                    
                    return grouped;
                }

    getSearchResultMeta(item) {
                    if (item.type === 'feature') {
                        return `in ${item.parentName} • ${item.dataType || 'Feature'}`;
                    } else if (item.type === 'app') {
                        return `uses ${item.parentName}`;
                    } else if (item.matchType === 'description') {
                        return 'matches description';
                    } else if (item.matchType === 'tag') {
                        return `tag: #${item.matchText}`;
                    } else if (item.matchType === 'access') {
                        return 'matches access process';
                    }
                    return this.config.colors[item.nodeType]?.label || '';
                }

    performSearch(query) {
                    const results = [];
                    
                    this.nodes.forEach((node, id) => {
                        if (node.name.toLowerCase().includes(query)) {
                            results.push({
                                type: 'node',
                                nodeType: node.type,
                                id: id,
                                name: node.name,
                                matchType: 'name',
                                matchText: node.name
                            });
                        }
                        
                        if (this.searchSettings.descriptions && node.description && 
                            node.description.toLowerCase().includes(query)) {
                            results.push({
                                type: 'node',
                                nodeType: node.type,
                                id: id,
                                name: node.name,
                                matchType: 'description',
                                matchText: node.description
                            });
                        }
                        
                        if (this.searchSettings.tags && node.tags) {
                            node.tags.forEach(tag => {
                                if (tag.toLowerCase().includes(query)) {
                                    results.push({
                                        type: 'node',
                                        nodeType: node.type,
                                        id: id,
                                        name: node.name,
                                        matchType: 'tag',
                                        matchText: tag
                                    });
                                }
                            });
                        }
                        
                        if (node.type === 'featureview' && node.features) {
                            node.features.forEach(feature => {
                                const featureName = typeof feature === 'string' ? feature : feature.name;
                                if (featureName.toLowerCase().includes(query)) {
                                    results.push({
                                        type: 'feature',
                                        nodeType: 'feature',
                                        id: id,
                                        name: featureName,
                                        parentName: node.name,
                                        matchType: 'feature',
                                        matchText: featureName,
                                        dataType: typeof feature === 'string' ? 'Unknown' : feature.type
                                    });
                                }
                            });
                        }
                        
                        if (this.searchSettings.usedBy && node.details.usedBy) {
                            node.details.usedBy.forEach(app => {
                                const appName = typeof app === 'string' ? app : app.name;
                                if (appName.toLowerCase().includes(query)) {
                                    results.push({
                                        type: 'app',
                                        nodeType: 'app',
                                        id: id,
                                        name: appName,
                                        parentName: node.name,
                                        matchType: 'usedBy',
                                        matchText: appName
                                    });
                                }
                            });
                        }
                        
                        if (this.searchSettings.access && node.accessProcess && 
                            node.accessProcess.toLowerCase().includes(query)) {
                            results.push({
                                type: 'node',
                                nodeType: node.type,
                                id: id,
                                name: node.name,
                                matchType: 'access',
                                matchText: node.accessProcess
                            });
                        }
                    });
                    
                    return this.groupSearchResults(results);
                }

    addDatasource(config) {
                    const id = `source_${++this.counters.datasource}`;
                    const dbType = this.databaseTypes[config.kind] || { 
                        name: config.kind, 
                        debezium: false,
                        defaultProcess: 'Contact data platform team',
                        sparkPattern: 'Custom connector'
                    };
                    
                    const node = {
                        id,
                        type: 'datasource',
                        name: config.name,
                        kind: config.kind,
                        dbType: dbType,
                        description: config.description || '',
                        tags: config.tags || [],
                        ownedBy: config.ownedBy || this.repoSettings.defaultOwner,
                        accessProcess: config.accessProcess || dbType.defaultProcess,
                        details: config.details || {},
                        x: config.x || 100,
                        y: config.y || 100,
                        inputs: [],
                        outputs: [],
                        createdAt: new Date().toISOString(),
                        // New fields for comprehensive DB support
                        debeziumAvailable: dbType.debezium,
                        sparkPattern: dbType.sparkPattern,
                        columnSecurity: config.columnSecurity || this.generateDefaultColumnSecurity()
                    };
                    this.nodes.set(id, node);
                    this.updateStats();
                    return id;
                }

    addEntity(config) {
                    const id = `entity_${++this.counters.entity}`;
                    const node = {
                        id,
                        type: 'entity',
                        name: config.name,
                        joinKey: config.joinKey || 'id',
                        description: config.description || '',
                        tags: config.tags || [],
                        details: config.details || {},
                        x: config.x || 100,
                        y: config.y || 100,
                        inputs: [],
                        outputs: [],
                        createdAt: new Date().toISOString()
                    };
                    this.nodes.set(id, node);
                    this.updateStats();
                    return id;
                }

    addFeatureView(config) {
                    const id = `fv_${++this.counters.featureview}`;
                    const node = {
                        id,
                        type: 'featureview',
                        name: config.name,
                        subtype: config.subtype || 'batch',
                        description: config.description || '',
                        tags: config.tags || [],
                        entities: config.entities || [],
                        features: config.features || [],
                        details: config.details || {},
                        x: config.x || 100,
                        y: config.y || 100,
                        inputs: [],
                        outputs: [],
                        createdAt: new Date().toISOString()
                    };
                    this.nodes.set(id, node);
                    
                    if (config.entities) {
                        config.entities.forEach(entityId => {
                            if (this.nodes.has(entityId)) {
                                this.addConnection(entityId, id);
                            }
                        });
                    }
                    
                    this.updateStats();
                    return id;
                }

    addService(config) {
                    const id = `service_${++this.counters.service}`;
                    const node = {
                        id,
                        type: 'service',
                        name: config.name,
                        description: config.description || '',
                        tags: config.tags || [],
                        features: config.features || [],
                        featureServices: config.featureServices || [],
                        details: config.details || {},
                        x: config.x || 100,
                        y: config.y || 100,
                        inputs: [],
                        outputs: [],
                        createdAt: new Date().toISOString()
                    };
                    this.nodes.set(id, node);
                    
                    if (config.features) {
                        config.features.forEach(fvId => {
                            if (this.nodes.has(fvId)) {
                                this.addConnection(fvId, id);
                            }
                        });
                    }
                    if (config.featureServices) {
                        config.featureServices.forEach(fsId => {
                            if (this.nodes.has(fsId)) {
                                this.addConnection(fsId, id);
                            }
                        });
                    }
                    
                    this.updateStats();
                    return id;
                }

    renderPatternLibrary() {
                    // This method is now deprecated - patterns are shown in Data Engineer context
                    // Kept for backward compatibility but does nothing
                    console.log('Pattern library moved to Data Engineer guide context');
                }

    generateCodeExample(node) {
                    if (node.type === 'featureview') {
                        return `<span class="code-comment"># Retrieve features from ${node.name}</span>
    <span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureStore
    
    store = FeatureStore(repo_path=<span class="code-string">"${this.repoSettings.location}"</span>)
    
    features = store.get_online_features(
        features=[
            ${node.features.slice(0, 2).map(f => `<span class="code-string">"${node.name}:${f.name}"</span>`).join(',\n        ')}${node.features.length > 2 ? ',' : ''}
        ],
        entity_rows=[{<span class="code-string">"${this.nodes.get(node.entities[0])?.joinKey || 'id'}"</span>: <span class="code-string">"123"</span>}]
    ).to_df()`;
                    } else if (node.type === 'service') {
                        return `<span class="code-comment"># Use feature service</span>
    <span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureStore
    
    store = FeatureStore(repo_path=<span class="code-string">"${this.repoSettings.location}"</span>)
    
    features = store.get_online_features(
        feature_service=<span class="code-string">"${node.name}"</span>,
        entity_rows=[{<span class="code-string">"user_id"</span>: <span class="code-string">"123"</span>}]
    ).to_df()`;
                    } else if (node.type === 'entity') {
                        return `<span class="code-comment"># Define entity</span>
    <span class="code-keyword">from</span> feast <span class="code-keyword">import</span> Entity, ValueType
    
    <span class="code-keyword">${node.name.toLowerCase().replace(/\s+/g, '_')}</span> = Entity(
        name=<span class="code-string">"${node.name}"</span>,
        join_keys=[<span class="code-string">"${node.joinKey}"</span>],
        value_type=ValueType.STRING
    )`;
                    }
                    return `<span class="code-comment"># Component code example</span>`;
                }

    applyUserContext() {
        const user = document.getElementById('userSelect')?.value || 'john';
        this.switchUser.call({ ...this, currentUser: user });
        document.getElementById('userSelectorModal').classList.remove('active');
        this.showNotification('Context Updated', `Switched to ${user} context`);
    }

// Make globally available for HTML onclick handlers

}

window.FeastDiagram = FeastDiagram;
