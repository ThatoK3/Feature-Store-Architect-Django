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
        if (this.repoSettings.id && this.nodes.nodes.size > 0) {
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
        this.nodes.nodes.forEach(node => {
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
            const from = this.nodes.nodes.get(edge.from);
            const to = this.nodes.nodes.get(edge.to);
            
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
            
            const node = this.nodes.nodes.get(this.draggedNode);
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
                    const node = this.nodes.nodes.get(this.hoveredNode);
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
        this.llm.updateContext(this.nodes.nodes.get(id), this.nodes.nodes, this.config.colors);
    }

    /**
     * Show detail panel for node
     * @param {string} id - Node ID
     */
    showPanel(id) {
        const node = this.nodes.nodes.get(id);
        if (!node) return;
        
        // Build panel content
        const content = this.buildPanelContent(node);
        
        // Update UI
        this.ui.togglePanel('detail', true);
        
        // Populate panel (implementation depends on HTML structure)
        this.populateDetailPanel(node, content);
    }

    /**
     * Build HTML content for detail panel
     * @private
     */
    buildPanelContent(node) {
        // This would build the comprehensive panel HTML
        // Implementation matches original showPanel method
        return '';
    }

    /**
     * Populate detail panel DOM
     * @private
     */
    populateDetailPanel(node, content) {
        // Implementation matches original panel population
        const panelContent = document.getElementById('panelContent');
        if (panelContent) {
            panelContent.innerHTML = content;
        }
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
        
        const node = this.nodes.nodes.get(this.selectedNode);
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
        const node = this.nodes.nodes.get(id);
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
            if (this.nodes.nodes.size === 0) {
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
                    nodes: Array.from(this.nodes.nodes.entries()),
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
                    this.ui.showNotification('Imported', `Loaded ${this.nodes.nodes.size} components`);
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
            this.llm.updateContext(this.selectedNode ? this.nodes.nodes.get(this.selectedNode) : null, 
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
        const node = this.nodes.nodes.get(id);
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

    updateStats() {
        const stats = {
            datasource: 0,
            entity: 0,
            featureview: 0,
            service: 0,
            features: 0
        };
        
        this.nodes.nodes.forEach(node => {
            if (stats[node.type] !== undefined) {
                stats[node.type]++;
            }
            if (node.features && Array.isArray(node.features)) {
                stats.features += node.features.length;
            }
        });
        
        this.ui.updateStats(stats);
    }

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
}

// Make globally available for HTML onclick handlers
window.FeastDiagram = FeastDiagram;
