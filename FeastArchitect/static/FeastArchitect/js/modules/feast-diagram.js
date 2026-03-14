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
        
        // Proxy canvas state to renderer so legacy this.ctx / this.scale etc. work
        const r = this.renderer;
        Object.defineProperties(this, {
            ctx:           { get() { return r.ctx; }, set(v) { r.ctx = v; } },
            scale:         { get() { return r.scale; }, set(v) { r.scale = v; } },
            offsetX:       { get() { return r.offsetX; }, set(v) { r.offsetX = v; } },
            offsetY:       { get() { return r.offsetY; }, set(v) { r.offsetY = v; } },
            width:         { get() { return r.width; }, set(v) { r.width = v; } },
            height:        { get() { return r.height; }, set(v) { r.height = v; } },
            miniMapCtx:    { get() { return r.miniMapCtx; }, set(v) { r.miniMapCtx = v; } },
            miniMapCanvas: { get() { return r.miniMapCanvas; }, set(v) { r.miniMapCanvas = v; } },
        });
        
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

    // Delegation helpers — the original monolith had these on the class directly
    addConnection(fromId, toId) {
        if (!this.nodes.nodes.has(fromId) || !this.nodes.nodes.has(toId)) return;
        const exists = this.nodes.edges.some(e => e.from === fromId && e.to === toId);
        if (exists) return;
        
        const edge = { 
            from: fromId, 
            to: toId, 
            id: `${fromId}->${toId}`,
            animated: false
        };
        this.nodes.edges.push(edge);
        
        const fromNode = this.nodes.nodes.get(fromId);
        const toNode = this.nodes.nodes.get(toId);
        if (fromNode) fromNode.outputs.push(toId);
        if (toNode) toNode.inputs.push(fromId);
    }

    generateDefaultColumnSecurity() {
        return {
            piiColumns: ['email', 'phone', 'ssn', 'address', 'name'],
            maskedColumns: ['email', 'phone'],
            restrictedColumns: ['ssn', 'salary']
        };
    }

    /**
     * Initialize repository settings from Django context or defaults
     * @private
     * @returns {Object} Repository settings
     */
    initializeRepoSettings() {
        const djangoContext = window.DJANGO_CONTEXT || {};
        const isNew = this.isNewRepo();

        return {
            name: isNew ? 'new_feature_store' : 'enterprise_feature_store',
            location: isNew ? '/opt/feast/feature_repo' : '/opt/feast/feature_repo',
            defaultOwner: 'Data Platform Team',
            id: djangoContext.repoId || this.getRepoIdFromUrl(),
            description: isNew ? '' : 'Enterprise feature store powering machine learning across personalization, fraud detection, and search ranking use cases.',
            isNew: isNew
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
        if (!repoId) return null;
        const parsed = parseInt(repoId);
        return isNaN(parsed) ? null : parsed;
    }

    isNewRepo() {
        // ?new  — presence-only flag for blank repo creation
        return new URLSearchParams(window.location.search).has('new');
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
            this.updateStats();
        } else if (this.repoSettings.isNew) {
            // Empty new repo — blank canvas, no example data
            this.updateStats();
            this._showNewRepoBanner();
        } else {
            loadComplexExample(this.nodes, 
                (from, to) => this.nodes.addConnection(from, to),
                () => this.autoLayout()
            );
            this.updateStats();
            // Fit view after layout
            setTimeout(() => this.animateFit(), 1000);
        }
    }

    _showNewRepoBanner() {
        document.getElementById('newRepoBanner')?.remove();
        const isDefault = this.repoSettings.name === 'new_feature_store';
        const banner = document.createElement('div');
        banner.id = 'newRepoBanner';
        banner.className = 'new-repo-banner';
        if (isDefault) {
            banner.innerHTML = `
                <span class="new-repo-banner-icon">✨</span>
                <span class="new-repo-banner-text">New repository — rename it in <strong>Settings</strong> before pushing</span>
                <button class="new-repo-banner-btn" onclick="diagram.showSettings()">Open Settings</button>
                <button class="new-repo-banner-close" onclick="this.parentElement.remove()">✕</button>
            `;
        } else {
            banner.innerHTML = `
                <span class="new-repo-banner-icon">📦</span>
                <span class="new-repo-banner-text">Imported <strong>${this.repoSettings.name}</strong> — unsaved, push to create on server</span>
                <button class="new-repo-banner-btn" onclick="diagram.pushRepo()">Push Now</button>
                <button class="new-repo-banner-close" onclick="this.parentElement.remove()">✕</button>
            `;
        }
        document.body.appendChild(banner);
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
            
            const start = this.getPortPosition(from, 'output');
            const end = this.getPortPosition(to, 'input');
            
            const isHighlighted = this.selectedNode && 
                (edge.from === this.selectedNode || edge.to === this.selectedNode);
            
            this.ctx.beginPath();
            
            const dist = Math.abs(end.x - start.x);
            const cp1x = start.x + dist * 0.5;
            const cp1y = start.y;
            const cp2x = end.x - dist * 0.5;
            const cp2y = end.y;
            
            this.ctx.moveTo(start.x, start.y);
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
            
            if (isHighlighted) {
                this.ctx.strokeStyle = '#f97316';
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = '#f97316';
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            const angle = Math.atan2(end.y - cp2y, end.x - cp2x);
            const arrowLength = 10;
            const arrowAngle = Math.PI / 6;
            
            this.ctx.beginPath();
            this.ctx.moveTo(end.x, end.y);
            this.ctx.lineTo(
                end.x - arrowLength * Math.cos(angle - arrowAngle),
                end.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            this.ctx.moveTo(end.x, end.y);
            this.ctx.lineTo(
                end.x - arrowLength * Math.cos(angle + arrowAngle),
                end.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            this.ctx.strokeStyle = isHighlighted ? '#f97316' : 'rgba(148, 163, 184, 0.4)';
            this.ctx.stroke();
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
        const isFeatureHighlighted = this._featureHighlightIds && this._featureHighlightIds.has(node.id);
        
        const width = this.config.nodeWidth;
        const height = this.config.nodeHeight;
        
        if (isSelected) {
            this.ctx.shadowColor = config.bg;
            this.ctx.shadowBlur = 30;
        } else if (isFeatureHighlighted) {
            this.ctx.shadowColor = '#f59e0b';
            this.ctx.shadowBlur = 25;
        } else if (isHovered) {
            this.ctx.shadowColor = config.bg;
            this.ctx.shadowBlur = 15;
        }
        
        const gradient = this.ctx.createLinearGradient(node.x, node.y, node.x, node.y + height);
        const bgPrimary = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim();
        gradient.addColorStop(0, bgPrimary);
        gradient.addColorStop(1, getComputedStyle(document.body).getPropertyValue('--bg-primary').trim());
        
        this.ctx.fillStyle = gradient;
        this.roundRect(node.x, node.y, width, height, 12);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isSelected ? config.bg : isFeatureHighlighted ? '#f59e0b' : getComputedStyle(document.body).getPropertyValue('--border-color').trim();
        this.ctx.lineWidth = isSelected ? 3 : isFeatureHighlighted ? 2 : 1;
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
        
        this.ctx.fillStyle = config.bg;
        this.roundRect(node.x, node.y, width, 32, { tl: 12, tr: 12, bl: 0, br: 0 });
        this.ctx.fill();
        
        // Draw database icon for datasources if available
        let icon = config.icon;
        if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
            icon = node.dbType.icon;
        }
        
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(icon, node.x + 12, node.y + 24);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Inter, sans-serif';
        const title = this.truncateText(node.name, 26);
        this.ctx.fillText(title, node.x + 36, node.y + 22);
        
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim();
        this.ctx.font = '12px Inter, sans-serif';
        
        let contentY = node.y + 52;
        
        if (node.type === 'featureview') {
            const entityCount = node.entities.length;
            const featureCount = node.features.length;
            this.ctx.fillStyle = config.light;
            this.ctx.fillText(`${featureCount} features • ${entityCount} entities`, node.x + 12, contentY);
            
            this.ctx.fillStyle = this.getSubtypeColor(node.subtype);
            this.roundRect(node.x + width - 60, node.y + 50, 48, 18, 9);
            this.ctx.fill();
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px Inter, sans-serif';
            this.ctx.fillText(node.subtype, node.x + width - 48, node.y + 63);
        } else if (node.type === 'service') {
            const viewCount = node.features.length;
            const serviceCount = node.featureServices ? node.featureServices.length : 0;
            this.ctx.fillStyle = config.light;
            this.ctx.fillText(`${viewCount} views${serviceCount > 0 ? ` • ${serviceCount} services` : ''}`, node.x + 12, contentY);
            
            if (node.details.usedBy && node.details.usedBy.length > 0) {
                this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();
                this.ctx.fillText(`Used by ${node.details.usedBy.length} apps`, node.x + 12, contentY + 16);
            }
        } else if (node.type === 'entity') {
            this.ctx.fillStyle = config.light;
            this.ctx.fillText(`Key: ${node.joinKey}`, node.x + 12, contentY);
        } else if (node.type === 'datasource') {
            this.ctx.fillStyle = config.light;
            const dbName = node.dbType ? node.dbType.name : node.kind;
            this.ctx.fillText(dbName, node.x + 12, contentY);
            
            if (node.ownedBy) {
                this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
                this.ctx.font = '10px Inter, sans-serif';
                this.ctx.fillText(`Owner: ${this.truncateText(node.ownedBy, 25)}`, node.x + 12, contentY + 16);
            }
        }
        
        if (node.tags && node.tags.length > 0) {
            this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
            this.ctx.font = '10px Inter, sans-serif';
            this.ctx.fillText(`#${node.tags[0]}${node.tags.length > 1 ? ` +${node.tags.length - 1}` : ''}`, node.x + 12, node.y + height - 12);
        }
        
        this.drawPort(node, 'input');
        this.drawPort(node, 'output');
        
        if (isSelected) {
            this.ctx.strokeStyle = config.bg;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.roundRect(node.x - 8, node.y - 8, width + 16, height + 16, 16);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
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
        ctx.fillStyle = this.getSubtypeColor(node.subtype);
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
        if (!this.miniMapCtx) return;
        
        const ctx = this.miniMapCtx;
        const bounds = this.getBounds();
        
        const scaleX = 200 / bounds.width;
        const scaleY = 150 / bounds.height;
        const scale = Math.min(scaleX, scaleY) * 0.9;
        
        ctx.clearRect(0, 0, 200, 150);
        
        ctx.fillStyle = this.theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, 200, 150);
        
        ctx.save();
        ctx.translate(
            (200 - bounds.width * scale) / 2 - bounds.minX * scale,
            (150 - bounds.height * scale) / 2 - bounds.minY * scale
        );
        ctx.scale(scale, scale);
        
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 2 / scale;
        this.nodes.edges.forEach(edge => {
            const from = this.nodes.nodes.get(edge.from);
            const to = this.nodes.nodes.get(edge.to);
            if (!from || !to) return;
            
            ctx.beginPath();
            ctx.moveTo(from.x + this.config.nodeWidth / 2, from.y + this.config.nodeHeight / 2);
            ctx.lineTo(to.x + this.config.nodeWidth / 2, to.y + this.config.nodeHeight / 2);
            ctx.stroke();
        });
        
        this.nodes.nodes.forEach(node => {
            if (!this.isNodeVisible(node)) return;
            
            const config = this.config.colors[node.type];
            ctx.fillStyle = config.bg;
            ctx.fillRect(node.x, node.y, this.config.nodeWidth, this.config.nodeHeight);
        });
        
        ctx.restore();
        
        const vpX = (-this.offsetX / this.scale - bounds.minX) * scale + (200 - bounds.width * scale) / 2;
        const vpY = (-this.offsetY / this.scale - bounds.minY) * scale + (150 - bounds.height * scale) / 2;
        const vpW = (this.width / this.scale) * scale;
        const vpH = (this.height / this.scale) * scale;
        
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    /**
     * Bind all event listeners
     * @private
     */
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const featModal = document.getElementById('featureDetailModal');
                if (featModal && featModal.classList.contains('active')) {
                    this._closeFeatureModal();
                    return;
                }
            }
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteSelected();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.export();
            }
        });
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
        
        // Click on a search result — use mousedown so it fires before blur
        if (searchDropdown) {
            searchDropdown.addEventListener('mousedown', (e) => {
                const item = e.target.closest('.search-result-item');
                if (!item) return;
                e.preventDefault(); // prevent input blur before click fires
                const id   = item.dataset.nodeId;
                const type = item.dataset.resultType;
                if (id) this.selectSearchResult(id, type);
            });
        }

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
                if (document.getElementById('ticketModal')?.classList.contains('active')) {
                    this.closeTicketModal();
                    return;
                }
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
     * Close detail panel
     */
    closePanel() {
        const panel = document.getElementById('detailPanel');
        panel.classList.remove('open', 'wide', 'fb-mode');
        const fbH = document.getElementById('panelFbHeader');
        const nodeH = document.getElementById('panelNodeHeader');
        if (fbH) fbH.style.display = 'none';
        if (nodeH) nodeH.style.display = '';
        this.selectedNode = null;
        this.render();
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
        
        const targetScale = 1.5;
        const targetOffsetX = (this.width / 2) - (node.x + this.config.nodeWidth / 2) * targetScale;
        const targetOffsetY = (this.height / 2) - (node.y + this.config.nodeHeight / 2) * targetScale;
        
        const startScale = this.scale;
        const startOffsetX = this.offsetX;
        const startOffsetY = this.offsetY;
        
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.scale = startScale + (targetScale - startScale) * eased;
            this.offsetX = startOffsetX + (targetOffsetX - startOffsetX) * eased;
            this.offsetY = startOffsetY + (targetOffsetY - startOffsetY) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    // ==========================================
    // Layout Operations
    // ==========================================

    /**
     * Auto-layout all nodes
     */
    autoLayout() {
        const columns = {
            datasource: [],
            entity: [],
            featureview: [],
            service: []
        };
        
        this.nodes.nodes.forEach((node, id) => {
            if (columns[node.type]) {
                columns[node.type].push(id);
            }
        });
        
        const colWidth = 360;
        const rowHeight = 140;
        const startX = 120;
        const startY = 120;
        
        const sortByConnections = (ids) => {
            return ids.sort((a, b) => {
                const nodeA = this.nodes.nodes.get(a);
                const nodeB = this.nodes.nodes.get(b);
                return (nodeB.inputs.length + nodeB.outputs.length) - 
                       (nodeA.inputs.length + nodeA.outputs.length);
            });
        };
        
        let colIndex = 0;
        ['datasource', 'entity', 'featureview', 'service'].forEach(type => {
            let nodes = columns[type];
            if (nodes.length === 0) return;
            
            nodes = sortByConnections(nodes);
            
            const colX = startX + colIndex * colWidth;
            const totalHeight = nodes.length * rowHeight;
            const startColY = Math.max(startY, (this.height - totalHeight) / 2);
            
            nodes.forEach((id, idx) => {
                const node = this.nodes.nodes.get(id);
                const targetY = startColY + idx * rowHeight;
                this.animateNodePosition(node, colX, targetY);
            });
            
            colIndex++;
        });
    }

    /**
     * Fit all nodes in view
     */
    fit() {
        if (this.nodes.nodes.size === 0) return;
        
        const bounds = this.getBounds();
        const padding = 100;
        
        const scaleX = (this.width - padding * 2) / bounds.width;
        const scaleY = (this.height - padding * 2) / bounds.height;
        this.scale = Math.min(scaleX, scaleY, 1.5);
        
        this.offsetX = (this.width - bounds.width * this.scale) / 2 - bounds.minX * this.scale;
        this.offsetY = (this.height - bounds.height * this.scale) / 2 - bounds.minY * this.scale;
    }

    /**
     * Animate fit to bounds
     */
    animateFit() {
        if (this.nodes.nodes.size === 0) return;
        
        const bounds = this.getBounds();
        const padding = 100;
        
        const targetScale = Math.min(
            (this.width - padding * 2) / bounds.width,
            (this.height - padding * 2) / bounds.height,
            1.5
        );
        
        const targetOffsetX = (this.width - bounds.width * targetScale) / 2 - bounds.minX * targetScale;
        const targetOffsetY = (this.height - bounds.height * targetScale) / 2 - bounds.minY * targetScale;
        
        const startScale = this.scale;
        const startOffsetX = this.offsetX;
        const startOffsetY = this.offsetY;
        
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.scale = startScale + (targetScale - startScale) * eased;
            this.offsetX = startOffsetX + (targetOffsetX - startOffsetX) * eased;
            this.offsetY = startOffsetY + (targetOffsetY - startOffsetY) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
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
                this.autoLayout();  // reposition with current spacing
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
            // Auto-open the All Features browser on load
            setTimeout(() => this.showFeatureBrowser(), 700);
            
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
        const id = `source_${++this.nodes.counters.datasource}`;
        const dbType = this.nodes.databaseTypes[ds.kind] || { 
            name: ds.kind, 
            debezium: false,
            defaultProcess: ds.access_process || 'Contact data platform team',
            sparkPattern: 'Custom connector'
        };
        
        const node = {
            id,
            type: 'datasource',
            name: ds.name,
            kind: ds.kind,
            dbType: dbType,
            description: ds.description || '',
            tags: ds.tags || [],
            ownedBy: ds.owned_by || this.repoSettings.defaultOwner,
            accessProcess: ds.access_process || '',
            details: {
                connection: ds.connection_string || '',
                topic: ds.topic || '',
                notes: ''
            },
            x: ds.pos_x || 100,
            y: ds.pos_y || 100,
            inputs: [],
            outputs: [],
            createdAt: ds.created_at,
            debeziumAvailable: ds.debezium_supported,
            sparkPattern: dbType.sparkPattern,
            columnSecurity: ds.column_security || this.generateDefaultColumnSecurity()
        };
        this.nodes.nodes.set(id, node);
        return id;
    }

    /**
     * Add entity from backend data
     * @private
     */
    addEntityFromBackend(ent) {
        const id = `entity_${++this.nodes.counters.entity}`;
        const node = {
            id,
            type: 'entity',
            name: ent.name,
            joinKey: ent.join_key || 'id',
            description: ent.description || '',
            tags: ent.tags || [],
            details: {},
            x: ent.pos_x || 100,
            y: ent.pos_y || 100,
            inputs: [],
            outputs: [],
            createdAt: ent.created_at
        };
        this.nodes.nodes.set(id, node);
        return id;
    }

    /**
     * Push repository to backend
     */
    async pushRepo() {
        const repoId = this.repoSettings.id;
        const repoName = this.repoSettings.name;

        // Block push for new repos that still have the default name
        if (!repoId && repoName === 'new_feature_store') {
            this.showNotification('Rename Required',
                'Please rename your repository in Settings before pushing.', 'error');
            this.showSettings();
            return;
        }

        // Confirmation based on repo ID presence
        if (!repoId) {
            if (!confirm(`Create new repository "${repoName}"?`)) {
                return;
            }
        } else {
            if (!confirm(`Are you sure you want to update repository "${repoName}"?`)) {
                return;
            }
        }
        
        // Show modal with progress
        const modal = document.getElementById('pushRepoModal');
        document.getElementById('pushModalMessage').innerHTML = repoId 
            ? `Updating repository "${repoName}"...` 
            : 'Creating new repository...';
        document.getElementById('pushProgress').style.width = '0%';
        document.getElementById('pushStatus').innerHTML = 'Initializing...';
        modal.classList.add('active');
        
        // Prepare payload
        const payload = {
            name: this.repoSettings.name,
            location: this.repoSettings.location,
            description: this.repoSettings.description,
            default_owner: this.repoSettings.defaultOwner,
            architecture_json: this.exportToJSON(),
            settings: this.search.settings
        };
        
        // Add hash for conflict detection if updating
        if (repoId) {
            // Compute simple hash of current state
            const stateStr = JSON.stringify(this.exportToJSON());
            payload.client_hash = SparkMD5.hash(stateStr);
            payload.client_timestamp = new Date().toISOString();
        }
        
        try {
            document.getElementById('pushProgress').style.width = '30%';
            document.getElementById('pushStatus').innerHTML = 'Sending to server...';
            
            let response;
            
            if (repoId) {
                // Update existing
                response = await fetch(`${this.api.baseUrl}/repositories/${repoId}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCsrfToken()
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new
                response = await fetch(`${this.api.baseUrl}/repositories/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCsrfToken()
                    },
                    body: JSON.stringify(payload)
                });
            }
            
            document.getElementById('pushProgress').style.width = '70%';
            document.getElementById('pushStatus').innerHTML = 'Processing response...';
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 409) {
                    // Conflict detected
                    document.getElementById('pushStatus').innerHTML = 
                        `❌ Conflict: ${data.detail || 'Repository modified by another session'}`;
                    document.getElementById('pushProgress').style.backgroundColor = 'var(--feast-red)';
                    
                    // Offer force update option
                    if (confirm('Conflict detected. Force overwrite server version?')) {
                        await this.forcePushRepo(payload);
                        return;
                    }
                    return;
                }
                throw new Error(data.detail || `HTTP ${response.status}`);
            }
            
            // Success
            document.getElementById('pushProgress').style.width = '100%';
            document.getElementById('pushProgress').style.backgroundColor = 'var(--feast-green)';
            
            if (!repoId) {
                // New repo created
                this.repoSettings.id = data.id;
                this.repoSettings.isNew = false;
                // Replace ?new with ?repo_id=<id> without reload
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('new');
                newUrl.searchParams.set('repo_id', data.id);
                window.history.replaceState({}, '', newUrl);
                document.getElementById('newRepoBanner')?.remove();
                document.getElementById('pushStatus').innerHTML = 
                    `✅ Repository created! ID: ${data.id}`;
            } else {
                document.getElementById('pushStatus').innerHTML = 
                    `✅ Repository "${repoName}" updated successfully!`;
            }
            
            this.updateRepoSubtitle();
            this.showNotification('Push Successful', 
                `Repository ${repoId ? 'updated' : 'created'}`);
            
        } catch (error) {
            console.error('Push failed:', error);
            document.getElementById('pushStatus').innerHTML = 
                `❌ Error: ${error.message}`;
            document.getElementById('pushProgress').style.backgroundColor = 'var(--feast-red)';
        }
    }

    /**
     * Export repository to JSON file
     */
    export() {
        const data = {
            repository: this.repoSettings,
            nodes: Object.fromEntries(this.nodes.nodes.entries()),
            edges: this.nodes.edges,
            exportDate: new Date().toISOString(),
            version: '3.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = (this.repoSettings.name || 'feast-architecture').replace(/[^a-z0-9]/gi, '-');
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Exported', 'Architecture saved to JSON file');
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

                    // Apply repository metadata if present
                    if (data.repository) {
                        const repo = data.repository;
                        this.repoSettings.name         = repo.name         || this.repoSettings.name;
                        this.repoSettings.location     = repo.location     || this.repoSettings.location;
                        this.repoSettings.description  = repo.description  || this.repoSettings.description;
                        this.repoSettings.defaultOwner = repo.defaultOwner || this.repoSettings.defaultOwner;
                        // Keep isNew=true so user still needs to push — but clear the default name block
                        // so push is allowed (name is no longer 'new_feature_store')
                        document.getElementById('newRepoBanner')?.remove();
                        this._showNewRepoBanner();  // re-show with updated name
                        this.ui.updateRepoSubtitle(this.repoSettings);
                        this.codeGen.setRepoSettings(this.repoSettings);
                    }

                    this.updateStats();
                    this.fit();
                    this.ui.showNotification('Imported',
                        `Loaded ${this.nodes.nodes.size} components` +
                        (data.repository ? ` — "${data.repository.name}"` : ''));
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
        this.nodes.nodes.clear();
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
        
        const icon = this.theme === 'dark' ? '☀️' : '🌙';
        document.getElementById('themeIcon').textContent = icon;
        document.getElementById('settingsThemeIcon').textContent = icon;
        
        this.showNotification('Theme Changed', `Switched to ${this.theme} mode`);
    }

    toggleLLMHelper() {
        const panel = document.getElementById('llmPanel');
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
            panel.classList.remove('open');
            this.llmPanelOpen = false;
        } else {
            panel.classList.remove('minimized');
            panel.classList.add('open');
            this.llmPanelOpen = true;
            this.updateLLMContext();
            this._initLLMPanel(panel);
            this._llmRestoreSession();
        }
    }

    async _llmRestoreSession() {
        // If no active session, check if user has a recent session for this repo
        if (this.llm.sessionId) return;
        const container = document.getElementById('llmMessages');
        if (!container || container.children.length > 0) return;
        try {
            const res  = await fetch(`${this.api.baseUrl}/chats/history/`, {
                headers: { 'X-CSRFToken': this.getCsrfToken() }
            });
            if (!res.ok) return;
            const data = await res.json();
            // Find most recent session for this repo
            const sessions = data.sessions || [];
            const repoSession = sessions.find(s =>
                s.repository_id === this.repoSettings.id && s.message_count > 0
            );
            if (!repoSession) return;

            // Show a restore prompt
            container.innerHTML = `
                <div class="llm-restore-prompt">
                    <div class="llm-restore-icon">💬</div>
                    <div class="llm-restore-text">
                        You have a previous conversation<br>
                        <span style="color:var(--text-muted);font-size:11px">${repoSession.title} · ${repoSession.message_count} messages</span>
                    </div>
                    <div class="llm-restore-btns">
                        <button class="llm-restore-btn" onclick="diagram._llmLoadSession(${repoSession.id})">Continue</button>
                        <button class="llm-restore-btn llm-restore-new" onclick="diagram._llmDismissRestore()">New chat</button>
                    </div>
                </div>`;
        } catch(e) { /* silent */ }
    }

    async _llmLoadSession(sessionId) {
        const container = document.getElementById('llmMessages');
        container.innerHTML = '';
        try {
            const res  = await fetch(`${this.api.baseUrl}/chats/${sessionId}/`, {
                headers: { 'X-CSRFToken': this.getCsrfToken() }
            });
            const data = await res.json();
            this.llm.sessionId = sessionId;
            this._llmUpdateNewChatBtn();
            const messages = data.messages || [];
            messages.forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    this.llm._appendMessage(m.role, m.content, m.role === 'assistant');
                }
            });
            this.llm._scrollBottom();
        } catch(e) {
            this.showNotification('Error', 'Could not load previous chat', 'error');
        }
    }

    _llmDismissRestore() {
        document.getElementById('llmMessages').innerHTML = '';
    }

    llmNewChat() {
        if (this.llm.sessionId) {
            if (!confirm('Start a new conversation? Your current chat is saved and can be resumed next time.')) return;
        }
        this.llm.clearSession();
        document.getElementById('llmNewChatBtn').style.display = 'none';
    }

    _llmUpdateNewChatBtn() {
        const btn = document.getElementById('llmNewChatBtn');
        if (btn) btn.style.display = this.llm.sessionId ? '' : 'none';
    }

    minimizeLLM() {
        const panel = document.getElementById('llmPanel');
        panel.classList.toggle('minimized');
    }

    _llmAutoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    _initLLMPanel(panel) {
        if (panel._llmInited) return;
        panel._llmInited = true;

        // ── Anchor panel to absolute position ────────────────────
        const anchorPanel = () => {
            if (panel.style.transform !== 'none') {
                const rect = panel.getBoundingClientRect();
                panel.style.left   = rect.left + 'px';
                panel.style.bottom = (window.innerHeight - rect.bottom) + 'px';
                panel.style.transform = 'none';
            }
        };

        // ── Drag to move ──────────────────────────────────────────
        const header = document.getElementById('llmHeaderDrag');
        let dragging = false, startX, startY, startLeft, startBottom;

        header.addEventListener('mousedown', e => {
            if (e.target.closest('button')) return;
            anchorPanel();
            dragging = true;
            startX = e.clientX; startY = e.clientY;
            startLeft = parseFloat(panel.style.left);
            startBottom = parseFloat(panel.style.bottom);
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            panel.style.left   = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  startLeft   + (e.clientX - startX))) + 'px';
            panel.style.bottom = Math.max(0, Math.min(window.innerHeight - 52,                 startBottom - (e.clientY - startY))) + 'px';
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
            document.body.style.userSelect = '';
        });

        // ── Multi-edge resize ─────────────────────────────────────
        let resizing = false, resizeDir = '';
        let rStartX, rStartY, rStartW, rStartH, rStartLeft, rStartBottom;

        const startResize = (e, dir) => {
            anchorPanel();
            resizing = true; resizeDir = dir;
            rStartX = e.clientX; rStartY = e.clientY;
            rStartW = panel.offsetWidth; rStartH = panel.offsetHeight;
            rStartLeft   = parseFloat(panel.style.left);
            rStartBottom = parseFloat(panel.style.bottom);
            document.body.style.userSelect = 'none';
            e.stopPropagation();
            e.preventDefault();
        };

        const maxH = () => window.innerHeight * 0.88;
        const minW = 400, minH = 200;

        document.getElementById('llmResizeN') .addEventListener('mousedown', e => startResize(e, 'n'));
        document.getElementById('llmResizeE') .addEventListener('mousedown', e => startResize(e, 'e'));
        document.getElementById('llmResizeW') .addEventListener('mousedown', e => startResize(e, 'w'));
        document.getElementById('llmResizeNE').addEventListener('mousedown', e => startResize(e, 'ne'));
        document.getElementById('llmResizeNW').addEventListener('mousedown', e => startResize(e, 'nw'));

        document.addEventListener('mousemove', e => {
            if (!resizing) return;
            const dx = e.clientX - rStartX;
            const dy = e.clientY - rStartY;

            if (resizeDir.includes('n')) {
                const newH = Math.max(minH, Math.min(maxH(), rStartH - dy));
                panel.style.height = newH + 'px';
            }
            if (resizeDir.includes('e')) {
                panel.style.width = Math.max(minW, Math.min(window.innerWidth * 0.9, rStartW + dx)) + 'px';
            }
            if (resizeDir.includes('w')) {
                const newW = Math.max(minW, Math.min(window.innerWidth * 0.9, rStartW - dx));
                panel.style.width = newW + 'px';
                panel.style.left  = (rStartLeft + (rStartW - newW)) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            resizing = false;
            document.body.style.userSelect = '';
        });
    }

    toggleDjangoAdmin() {
        const panel = document.getElementById('djangoPanel');
        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            panel.classList.remove('open');
            this.djangoPanelOpen = false;
        } else {
            panel.classList.add('open');
            this.djangoPanelOpen = true;
            this.updateDjangoPanel();
        }
    }

    toggleCodeEditor() {
        const panel = document.getElementById('codeEditorPanel');
        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            panel.classList.remove('open');
            this.codeEditorOpen = false;
            document.getElementById('codeEditorToggleBtn').textContent = '📝';
        } else {
            panel.classList.add('open');
            this.codeEditorOpen = true;
            document.getElementById('codeEditorToggleBtn').textContent = '✕';
            this.updateCodeEditor();
        }
    }

    toggleEdgeManager() {
        const panel = document.getElementById('edgeManagerPanel');
        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            panel.classList.remove('open');
            this.edgeManagerOpen = false;
        } else {
            panel.classList.add('open');
            this.edgeManagerOpen = true;
            // Small delay to let DOM settle
            setTimeout(() => this.renderEdgeManager(), 50);
        }
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
        this.tempFeatures = [];
        this.tempTags = [];
        this.editingNode = null;
        document.getElementById('deleteBtn').style.display = 'none';
        this.openModal(type);
    }

    showEditModal(id) {
        const node = this.nodes.nodes.get(id);
        if (!node) return;

        this.editingNode = id;
        this.currentModalType = node.type;
        this.tempFeatures = node.features ? [...node.features] : [];
        this.tempTags = node.tags ? [...node.tags] : [];
        document.getElementById('deleteBtn').style.display = 'inline-flex';
        this.openModal(node.type, node);
    }

    showSettings() {
        document.getElementById('settingsRepoName').value = this.repoSettings.name;
        document.getElementById('settingsRepoLocation').value = this.repoSettings.location;
        document.getElementById('settingsRepoDescription').value = this.repoSettings.description || '';
        document.getElementById('settingsDefaultOwner').value = this.repoSettings.defaultOwner;
        
        this.updateToggleUI('toggleDescriptions', this.search.settings.descriptions);
        this.updateToggleUI('toggleTags', this.search.settings.tags);
        this.updateToggleUI('toggleUsedBy', this.search.settings.usedBy);
        this.updateToggleUI('toggleAccess', this.search.settings.access);
        
        document.getElementById('settingsModal').classList.add('active');
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
        document.getElementById('searchDropdown').classList.remove('active');
        document.getElementById('searchInput').value = '';
        
        if (type === 'feature' || type === 'app') {
            this.selectNode(id);
        } else {
            this.selectNode(id);
        }
        
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
        const node = this.nodes.nodes.get(id);
        const panel = document.getElementById('detailPanel');
        const config = this.config.colors[node.type];

        let icon = config.icon;
        if (node.type === 'datasource' && node.dbType && node.dbType.icon) icon = node.dbType.icon;

        document.getElementById('panelIcon').textContent = icon;
        document.getElementById('panelType').textContent = config.label;
        document.getElementById('panelType').style.color = config.light;
        document.getElementById('panelBadge').style.background = `${config.bg}20`;
        document.getElementById('panelTitle').textContent = node.name;

        let subtitle = '';
        if (node.type === 'featureview') subtitle = `${node.subtype} • ${node.features.length} features`;
        else if (node.type === 'service') {
            const total = node.features.length + (node.featureServices ? node.featureServices.length : 0);
            subtitle = `${total} dependencies`;
        }
        else if (node.type === 'entity') subtitle = `Join key: ${node.joinKey}`;
        else if (node.type === 'datasource') subtitle = `${node.dbType ? node.dbType.name : node.kind} • ${node.ownedBy}`;
        document.getElementById('panelSubtitle').textContent = subtitle;

        const tagsContainer = document.getElementById('panelTags');
        tagsContainer.innerHTML = (node.tags && node.tags.length > 0)
            ? node.tags.map(t => `<span class="tag">#${t}</span>`).join('') : '';

        this._setupPanelForNode(node);
        const contentEl = document.getElementById('panelContent');
        panel.classList.add('wide');
        contentEl.innerHTML = this._buildSingleColPanel(id, node, config, icon);
        this._bindFeatureExplorer(node, id);
        panel.classList.add('open');
    }

    _buildDatasourceRight(node, nodeId) {
        const cols = node.columns || node.schema || [];
        const tableTitle = cols.length > 0 ? `Schema <span class="feat-count">${cols.length}</span>` : 'Schema';
        let list = '';
        if (cols.length > 0) {
            list = cols.map((c, i) => {
                const name = typeof c === 'string' ? c : (c.name || c.column || '');
                const type = typeof c === 'string' ? '' : (c.type || c.dataType || '');
                const pk = c.primaryKey ? '<span class="feat-badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;font-size:9px">PK</span>' : '';
                return `<div class="feat-card" style="cursor:default"
                    onmouseenter="diagram._showColPopover('${nodeId}', ${i}, this)"
                    onmouseleave="diagram._hideFeatPopover()">
                    <div class="feat-card-header">
                        <div class="feat-type-dot" style="background:#64748b"></div>
                        <div class="feat-card-main"><div class="feat-card-name">${name}</div></div>
                        ${pk}
                        <div class="feat-card-type">${type}</div>
                    </div>
                </div>`;
            }).join('');
        } else {
            list = `<div class="feat-empty-state">
                <div class="feat-empty-icon">🗄️</div>
                <div class="feat-empty-msg">No schema defined</div>
            </div>`;
        }
        return `<div class="feature-explorer-header">
            <div class="feature-explorer-title">
                <span>🗄️ ${tableTitle}</span>
            </div>
        </div>
        <div class="feature-list-scroll">${list}</div>`;
    }

    _buildEntityRight(node, nodeId) {
        // Show feature views that use this entity
        const usedBy = [];
        this.nodes.nodes.forEach((n, nid) => {
            if (n.type === 'featureview' && n.entities && n.entities.includes(nodeId)) {
                usedBy.push({ id: nid, node: n });
            }
        });
        let list = usedBy.length > 0
            ? usedBy.map(({ id, node: fv }) => `
                <div class="feat-card" onclick="diagram.selectNode('${id}')">
                    <div class="feat-card-header">
                        <div class="feat-type-dot" style="background:#10b981"></div>
                        <div class="feat-card-main">
                            <div class="feat-card-name">${fv.name}</div>
                            <div class="feat-card-subdesc">${fv.subtype} • ${fv.features.length} features</div>
                        </div>
                        <div class="feat-card-arrow">›</div>
                    </div>
                </div>`).join('')
            : `<div class="feat-empty-state">
                <div class="feat-empty-icon">🔗</div>
                <div class="feat-empty-msg">Not used by any feature views</div>
              </div>`;
        return `<div class="feature-explorer-header">
            <div class="feature-explorer-title">
                <span>🔗 Used by Feature Views</span>
                ${usedBy.length > 0 ? `<span class="feat-count">${usedBy.length}</span>` : ''}
            </div>
        </div>
        <div class="feature-list-scroll">${list}</div>`;
    }

    _showColPopover(nodeId, idx, el) {
        const node = this.nodes.nodes.get(nodeId);
        if (!node) return;
        const cols = node.columns || node.schema || [];
        const c = cols[idx];
        if (!c) return;
        const name = typeof c === 'string' ? c : (c.name || c.column || '');
        const type = typeof c === 'string' ? '' : (c.type || '');
        const desc = c.description || '';

        let html = `<div class="feat-popover-name">${name}</div>
            <div class="feat-popover-type">${type || 'Column'}</div>`;
        if (desc) html += `<div class="feat-popover-desc">${desc}</div>`;

        const rows = [];
        if (c.primaryKey) rows.push(['Primary Key', '✅ Yes']);
        if (c.nullable != null) rows.push(['Nullable', c.nullable ? 'Yes' : 'No']);
        if (c.defaultValue) rows.push(['Default', c.defaultValue]);
        if (rows.length > 0) {
            html += `<div class="feat-popover-grid">${rows.map(([k,v]) =>
                `<span class="feat-popover-k">${k}</span><span class="feat-popover-v">${v}</span>`
            ).join('')}</div>`;
        }

        const popover = document.getElementById('featHoverPopover');
        document.getElementById('featPopoverInner').innerHTML = html;
        const rect = el.getBoundingClientRect();
        const panel = document.getElementById('detailPanel');
        const panelRect = panel ? panel.getBoundingClientRect() : { left: window.innerWidth };
        const popW = 240;
        let left = panelRect.left - popW - 12;
        if (left < 8) left = rect.right + 10;
        let top = rect.top - 8;
        if (top + 160 > window.innerHeight - 16) top = window.innerHeight - 176;
        if (top < 8) top = 8;
        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
        popover.style.width = popW + 'px';
        popover.classList.add('visible');
    }

    _buildNodeDetails(id, node, config, icon) {
        let html = '';

        if (node.description) {
            html += `<div class="panel-section">
                <div class="section-header"><div class="section-title">Description</div></div>
                <div class="notes-section"><div class="notes-text">${node.description}</div></div>
            </div>`;
        }

        html += `<div class="panel-section"><div class="detail-card">`;

        if (node.type === 'entity') {
            html += `
                <div class="detail-row"><span class="detail-label">Join Key</span><span class="detail-value highlight">${node.joinKey}</span></div>
                <div class="detail-row"><span class="detail-label">Used By</span><span class="detail-value">${this.getUsedByCount(id)} views</span></div>`;
        } else if (node.type === 'featureview') {
            html += `
                <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value" style="color:${this.getSubtypeColor(node.subtype)}">${node.subtype}</span></div>
                <div class="detail-row"><span class="detail-label">Entities</span><span class="detail-value">${node.entities.length}</span></div>
                <div class="detail-row"><span class="detail-label">Features</span><span class="detail-value">${node.features.length}</span></div>
                <div class="detail-row"><span class="detail-label">TTL</span><span class="detail-value">${node.details && node.details.ttl ? node.details.ttl + 's' : 'Not set'}</span></div>`;
        } else if (node.type === 'service') {
            html += `
                <div class="detail-row"><span class="detail-label">Feature Views</span><span class="detail-value">${node.features.length}</span></div>
                ${node.featureServices && node.featureServices.length > 0 ? `<div class="detail-row"><span class="detail-label">Feature Services</span><span class="detail-value">${node.featureServices.length}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Used By</span><span class="detail-value">${node.details && node.details.usedBy ? node.details.usedBy.length : 0} applications</span></div>`;
        } else if (node.type === 'datasource') {
            const dbName = node.dbType ? node.dbType.name : node.kind;
            html += `
                <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${dbName}</span></div>
                <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${node.dbType ? node.dbType.category : 'Unknown'}</span></div>
                <div class="detail-row"><span class="detail-label">Debezium</span><span class="detail-value">${node.debeziumAvailable ? '✅ Yes' : '❌ No'}</span></div>
                <div class="detail-row"><span class="detail-label">Owned By</span><span class="detail-value">${node.ownedBy}</span></div>
                ${node.details && node.details.connection ? `<div class="detail-row"><span class="detail-label">Connection</span><span class="detail-value" style="font-size:11px">${node.details.connection}</span></div>` : ''}`;

            if (node.accessProcess) {
                html += `</div></div><div class="panel-section">
                    <div class="section-header"><div class="section-title">Access Process</div></div>
                    <div class="notes-section"><div class="notes-text">${node.accessProcess}</div></div>
                    <button class="access-request-btn" onclick="diagram.requestAccess('${id}')"><span>🔐</span><span>Request Access</span></button>
                </div><div class="panel-section"><div class="detail-card">`;
            }
        }

        html += `</div></div>`;

        // Lineage
        html += `<div class="panel-section"><div class="section-header"><div class="section-title">Lineage</div></div><div class="connection-graph">`;
        node.inputs.forEach(inputId => {
            const inp = this.nodes.nodes.get(inputId);
            if (!inp || !this.isNodeVisible(inp)) return;
            const ic = this.config.colors[inp.type];
            const ii = (inp.type === 'datasource' && inp.dbType) ? inp.dbType.icon : ic.icon;
            html += `<div class="connection-node" onclick="diagram.selectNode('${inputId}')">
                <div class="connection-icon" style="background:${ic.bg}20;color:${ic.light}">${ii}</div>
                <div class="connection-info"><div class="connection-name">${inp.name}</div><div class="connection-meta">${ic.label}</div></div>
                <span class="connection-arrow">←</span></div>`;
        });
        html += `<div class="connection-node" style="border-color:${config.bg};background:${config.bg}10">
            <div class="connection-icon" style="background:${config.bg}20;color:${config.light}">${icon}</div>
            <div class="connection-info"><div class="connection-name">${node.name}</div><div class="connection-meta" style="color:${config.light}">${config.label}</div></div>
        </div>`;
        node.outputs.forEach(outputId => {
            const out = this.nodes.nodes.get(outputId);
            if (!out || !this.isNodeVisible(out)) return;
            const oc = this.config.colors[out.type];
            const oi = (out.type === 'datasource' && out.dbType) ? out.dbType.icon : oc.icon;
            html += `<div class="connection-node" onclick="diagram.selectNode('${outputId}')">
                <div class="connection-icon" style="background:${oc.bg}20;color:${oc.light}">${oi}</div>
                <div class="connection-info"><div class="connection-name">${out.name}</div><div class="connection-meta">${oc.label}</div></div>
                <span class="connection-arrow">→</span></div>`;
        });
        html += `</div></div>`;

        // Used By
        if (node.details && node.details.usedBy && node.details.usedBy.length > 0) {
            html += `<div class="panel-section"><div class="section-header"><div class="section-title">Used By</div><div class="section-badge">${node.details.usedBy.length}</div></div><div class="service-usage">`;
            node.details.usedBy.forEach((app, idx) => {
                const appData = typeof app === 'string' ? { name: app } : app;
                html += `<div class="usage-card" onclick="diagram.showUsageDetails(${idx})">
                    <div class="usage-details">ℹ️</div>
                    <div class="usage-icon" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white">🖥️</div>
                    <div class="usage-name">${appData.name}</div>
                    <div class="usage-type">${appData.environment || 'Production'}</div>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (node.details && node.details.notes) {
            html += `<div class="panel-section"><div class="section-header"><div class="section-title">Notes</div></div><div class="notes-section"><div class="notes-text">${node.details.notes}</div></div></div>`;
        }

        html += `<div class="panel-section"><div class="section-header"><div class="section-title">Python API</div></div>
            <div class="code-block"><div class="code-header"><span class="code-lang">Python</span><button class="code-copy" onclick="diagram.copyCode(this)">Copy</button></div>
            <pre class="code-content">${this.generateCodeExample(node)}</pre></div></div>`;

        return html;
    }

    _buildSingleColPanel(id, node, config, icon) {
        // Reuse original builders with original CSS — single scrollable column
        let html = this._buildNodeDetails(id, node, config, icon);

        if (node.type === 'featureview' || (node.type === 'service' && node.features && node.features.length > 0)) {
            html += this._buildFeatureExplorer(node, id);
        } else if (node.type === 'datasource') {
            html += this._buildDatasourceRight(node, id);
        } else if (node.type === 'entity') {
            html += this._buildEntityRight(node, id);
        }

        return html;
    }

    _buildFeatureExplorer(node, nodeId) {

        // Service nodes store FV IDs in features — render as FV name cards
        if (node.type === 'service') {
            const fvIds = node.features || [];
            let listHtml;
            if (fvIds.length === 0) {
                listHtml = `<div class="feat-empty-state">
                    <div class="feat-empty-icon">⚙️</div>
                    <div class="feat-empty-msg">No feature views linked</div>
                </div>`;
            } else {
                listHtml = fvIds.map(fvId => {
                    const fv = this.nodes.nodes.get(fvId);
                    if (!fv) return '';
                    const subtypeColor = this.getSubtypeColor(fv.subtype);
                    return `<div class="feat-card" onclick="diagram.selectNode('${fvId}')">
                        <div class="feat-card-header">
                            <div class="feat-type-dot" style="background:#10b981"></div>
                            <div class="feat-card-main">
                                <div class="feat-card-name">${fv.name}</div>
                                <div class="feat-card-subdesc">${fv.features ? fv.features.length : 0} features</div>
                            </div>
                            <span class="feat-card-type" style="color:${subtypeColor}">${fv.subtype || ''}</span>
                            <div class="feat-card-arrow">›</div>
                        </div>
                    </div>`;
                }).join('');
            }
            return `<div class="feature-explorer-header">
                <div class="feature-explorer-title">
                    <span>⚙️ Feature Views</span>
                    <span class="feat-count">${fvIds.length}</span>
                </div>
            </div>
            <div class="feature-list-scroll" id="featListScroll">${listHtml}</div>`;
        }

        const features = node.features || [];
        const types = [...new Set(features.map(f => f.type).filter(Boolean))].sort();
        const typePills = types.map(t => `<span class="feat-type-pill" data-type="${t}">${t}</span>`).join('');

        let listHtml;
        if (features.length === 0) {
            listHtml = `<div class="feat-empty-state">
                <div class="feat-empty-icon">⚡</div>
                <div class="feat-empty-msg">No features defined</div>
                <button class="btn btn-primary" style="margin-top:12px;font-size:13px"
                    onclick="diagram.showEditModal('${nodeId}')">+ Add Features</button>
            </div>`;
        } else {
            listHtml = features.map((f, i) => this._buildFeatureCard(f, i, nodeId)).join('');
        }

        return `<div class="feature-explorer-header">
            <div class="feature-explorer-title">
                <span>⚡ Features</span>
                <span class="feat-count">${features.length}</span>
                ${node.type === 'featureview' ? `<button class="feat-add-btn" onclick="diagram.showEditModal('${nodeId}')" title="Edit features">✏️ Edit</button>` : ''}
            </div>
            <div class="feature-search-bar">
                <input class="feature-search-input" id="featSearchInput"
                    placeholder="Search name, type, tag…"
                    oninput="diagram._filterFeatures(this.value)">
            </div>
            ${types.length > 0 ? `<div class="feature-type-filters" id="featTypeFilters">
                <span class="feat-type-pill active" data-type="all">All</span>${typePills}
            </div>` : '<div id="featTypeFilters"></div>'}
        </div>
        <div class="feature-list-scroll" id="featListScroll">${listHtml}</div>`;
    }

    _buildFeatureCard(f, idx, nodeId) {
        const name = (typeof f === 'string') ? f : (f.name || '');
        const type = (typeof f === 'string') ? '' : (f.type || 'Unknown');
        const desc = f.description || '';
        const tags = f.tags || [];
        const hasPii = f.security && f.security.pii;
        const onlineServing = f.serving && f.serving.online;
        const offlineServing = f.serving && f.serving.offline;

        const typeColors = {
            'Int64':'#60a5fa','Int32':'#60a5fa','Int16':'#60a5fa','Int8':'#60a5fa',
            'Float32':'#f59e0b','Float64':'#f59e0b',
            'String':'#a78bfa','Bool':'#34d399','Bytes':'#fb923c','UnixTimestamp':'#f472b6'
        };
        const dotColor = typeColors[type] || '#64748b';

        let badges = '';
        if (hasPii) badges += `<span class="feat-badge feat-badge-pii">PII</span>`;
        if (onlineServing) badges += `<span class="feat-badge feat-badge-online">⚡</span>`;
        if (offlineServing) badges += `<span class="feat-badge feat-badge-offline">💾</span>`;

        const completeness = f.quality && f.quality.completeness;
        const qualBar = completeness != null
            ? `<div class="feat-quality-bar" title="Completeness: ${completeness}%"><div class="feat-quality-fill" style="width:${completeness}%"></div></div>` : '';

        return `<div class="feat-card"
                     data-idx="${idx}" data-nodeid="${nodeId}"
                     data-type="${type}" data-name="${name.toLowerCase()}"
                     data-tags="${tags.join(',').toLowerCase()}"
                     onmouseenter="diagram._showFeatPopover('${nodeId}', ${idx}, this)"
                     onmouseleave="diagram._hideFeatPopover()">
            <div class="feat-card-header">
                <div class="feat-type-dot feat-type-dot-clickable" style="background:${dotColor}" onclick="diagram._highlightFeatureUsage('${nodeId}', ${idx}, this)" title="Highlight where this feature is used"></div>
                <div class="feat-card-main" onclick="diagram._openFeatureModal('${nodeId}', ${idx})" style="cursor:pointer">
                    <div class="feat-card-name">${name}</div>
                    ${desc ? `<div class="feat-card-subdesc">${desc}</div>` : ''}
                </div>
                <div class="feat-card-badges">${badges}</div>
                <div class="feat-card-type">${type}</div>
                <button class="feat-edit-icon" onclick="event.stopPropagation();diagram._openFeatureModal('${nodeId}', ${idx})" title="Edit feature">✏️</button>
            </div>
            ${qualBar}
            ${tags.length > 0 ? `<div class="feat-card-tags">${tags.slice(0,4).map(t=>`<span class="feat-tag-chip">#${t}</span>`).join('')}${tags.length>4?`<span class="feat-tag-chip">+${tags.length-4}</span>`:''}</div>` : ''}
        </div>`;
    }

    _toggleFeatureCard(el) {
        el.classList.toggle('expanded');
    }

    _filterFeatures(query) {
        const q = query.toLowerCase();
        const activeType = document.querySelector('.feat-type-pill.active')?.dataset.type || 'all';
        document.querySelectorAll('#featListScroll .feat-card').forEach(card => {
            const nameMatch = card.dataset.name.includes(q);
            const tagMatch = card.dataset.tags.includes(q);
            const typeMatch = activeType === 'all' || card.dataset.type === activeType;
            card.style.display = (nameMatch || tagMatch) && typeMatch ? '' : 'none';
        });
    }

    _bindFeatureExplorer(node, nodeId) {
        const filters = document.getElementById('featTypeFilters');
        if (!filters) return;
        filters.addEventListener('click', e => {
            const pill = e.target.closest('.feat-type-pill');
            if (!pill) return;
            filters.querySelectorAll('.feat-type-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            this._filterFeatures(document.getElementById('featSearchInput')?.value || '');
        });
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
            const dbOptions = Object.entries(this.nodes.databaseTypes).map(([key, db]) => 
                `<option value="${key}" ${existingNode?.kind === key ? 'selected' : ''}>${db.icon} ${db.name}</option>`
            ).join('');
            
            html += `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Source Type</label>
                        <select class="form-select" id="inputKind" onchange="diagram.updateDBTypeInfo()">
                            <option value="">Select database...</option>
                            <optgroup label="Relational">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Relational').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="NoSQL">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'NoSQL').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Cloud Warehouse">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Cloud Warehouse').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Streaming">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Streaming').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Object Storage">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Object Storage').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="In-Memory">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'In-Memory').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Graph">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Graph').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Time-Series">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => v.category === 'Time-Series').map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
                            </optgroup>
                            <optgroup label="Others">
                                ${Object.entries(this.nodes.databaseTypes).filter(([k,v]) => !['Relational', 'NoSQL', 'Cloud Warehouse', 'Streaming', 'Object Storage', 'In-Memory', 'Graph', 'Time-Series'].includes(v.category)).map(([k,v]) => `<option value="${k}" ${existingNode?.kind === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
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
            const entities = Array.from(this.nodes.nodes.values())
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
            const views = Array.from(this.nodes.nodes.values())
                .filter(n => n.type === 'featureview')
                .map(v => `<option value="${v.id}" ${existingNode?.features?.includes(v.id) ? 'selected' : ''}>${v.name}</option>`)
                .join('');
            
            const services = Array.from(this.nodes.nodes.values())
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
            const node = this.nodes.nodes.get(this.editingNode);
            node.name = name;
            node.description = description;
            node.tags = [...this.tempTags];
            node.details.notes = notes;
            
            if (node.type === 'datasource') {
                const kind = document.getElementById('inputKind').value;
                node.kind = kind;
                node.dbType = this.nodes.databaseTypes[kind];
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
        this.updateStats();
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
        if (this.repoSettings.id) {
            try {
                const response = await fetch(`${this.api.baseUrl}/repositories/${this.repoSettings.id}/`, {
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
        
        this.nodes.nodes.forEach((node, id) => {
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
            ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'datasource').map(n => 
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
        
        const fromNode = this.nodes.nodes.get(fromId);
        const toNode = this.nodes.nodes.get(toId);
        
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

    showTicketModal() {
        // Reset form
        ['ticketError','ticketSuccess'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.display = 'none'; el.textContent = ''; }
        });
        ['ticketType','ticketDescription','ticketEmail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('ticketModal').classList.add('active');
    }

    closeTicketModal() {
        document.getElementById('ticketModal').classList.remove('active');
    }

    async submitTicket() {
        const type = document.getElementById('ticketType')?.value;
        const desc = document.getElementById('ticketDescription')?.value?.trim();
        const email = document.getElementById('ticketEmail')?.value?.trim();
        const errEl = document.getElementById('ticketError');
        const sucEl = document.getElementById('ticketSuccess');

        const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; sucEl.style.display = 'none'; };
        errEl.style.display = 'none';
        sucEl.style.display = 'none';

        if (!type)  return showErr('Please choose a category.');
        if (!desc)  return showErr('Please enter a description.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return showErr('Please enter a valid email address.');

        const fd = new FormData();
        fd.append('ticket_type',  type);
        fd.append('description',  desc);
        fd.append('email',        email);
        fd.append('csrfmiddlewaretoken', this.getCsrfToken());

        try {
            const res  = await fetch('/create_ticket/', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.reference || res.ok) {
                sucEl.textContent = `Request submitted${data.reference ? ' — Ref: ' + data.reference : ''}. We'll get back to you shortly.`;
                sucEl.style.display = 'block';
                setTimeout(() => this.closeTicketModal(), 3000);
            } else {
                showErr(data.error || data.detail || 'Could not submit request. Please try again.');
            }
        } catch (e) {
            showErr('Network error. Please try again.');
        }
    }

    toggleSearchSetting(setting) {
        this.search.settings[setting] = !this.search.settings[setting];
        this.updateToggleUI(`toggle${setting.charAt(0).toUpperCase() + setting.slice(1)}`, this.search.settings[setting]);
    }

    saveUsageDetails() {
        if (this.editingUsage === null) return;
        
        const node = this.nodes.nodes.get(this.selectedNode);
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
        const node = this.nodes.nodes.get(this.selectedNode);
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
        if (!this.repoSettings.id) {
            this.showNotification('Error', 'No repository ID to refresh');
            return;
        }
        
        this.showNotification('Refresh', 'Fetching latest repository state...');
        
        try {
            const response = await fetch(`${this.api.baseUrl}/repositories/${this.repoSettings.id}/check_status/`);
            
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

    // ── LLM diagram context ──────────────────────────────────────────────────
    _getLLMDiagramContext() {
        return {
            selectedNodeId: this.selectedNode || null,
            repoId:         this.repoSettings.id,
        };
    }

        async askLLM(promptType) {
        await this.llm.askPrompt(promptType, () => this._getLLMDiagramContext());
    }

    
    sendLLMMessage() {
        const input = document.getElementById('llmInput');
        const msg   = input?.value?.trim();
        if (!msg) return;
        this.llm.sendMessage(msg, () => this._getLLMDiagramContext());
    }

    
    applyLLMSuggestion() {
        this.showNotification('Info', 'Use the action buttons on individual messages', 'info');
    }

    copyLLMResponse(btn) {
        const msg  = btn.closest('.llm-message');
        const text = msg ? (msg.innerText || '') : '';
        navigator.clipboard.writeText(text);
        this.showNotification('Copied', 'Response copied to clipboard');
    }

    dismissLLM(btn) {
        btn.closest('.llm-message')?.remove();
    }

    // Called from ACTION blocks rendered by LLMHelper
    _llmHighlightNodes(nodeIds) {
        if (!Array.isArray(nodeIds)) return;
        const ids = new Set(nodeIds);
        this._featureHighlightIds = ids;
        // Also select first node if it exists
        if (nodeIds.length === 1 && this.nodes.nodes.has(nodeIds[0])) {
            this.selectNode(nodeIds[0]);
        }
        this.showNotification('Highlighted', `Highlighted ${ids.size} node${ids.size !== 1 ? 's' : ''} on canvas`);
    }

    _llmSelectNode(nodeId) {
        if (!nodeId || !this.nodes.nodes.has(nodeId)) {
            this.showNotification('Not found', `Node "${nodeId}" not found`, 'warning');
            return;
        }
        this.selectNode(nodeId);
        this.centerOnNode(nodeId);
    }

    async _llmApplyEdit(edit, btn) {
        if (!edit?.node_id || !edit?.field) return;
        const node = this.nodes.nodes.get(edit.node_id);
        if (!node) {
            this.showNotification('Not found', `Node "${edit.node_id}" not found`, 'error');
            return;
        }
        // Apply the change
        if (edit.field.includes('.')) {
            const [parent, child] = edit.field.split('.');
            if (!node[parent]) node[parent] = {};
            node[parent][child] = edit.value;
        } else {
            node[edit.field] = edit.value;
        }
        // Refresh panel if this node is selected
        if (this.selectedNode === edit.node_id) this.showPanel(edit.node_id);
        btn.closest('.llm-action-bar').innerHTML =
            '<span style="color:var(--feast-green);font-size:12px">✓ Applied</span>';
        this.showNotification('Applied', `Updated ${edit.field} on "${node.name}"`);
    }

    addLLMActionButtons(messageDiv) {
        // Legacy — no-op, action bars now injected by LLMHelper
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
        
        this.nodes.nodes.forEach((node, id) => {
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
            
            if (this.search.settings.descriptions && node.description && 
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
            
            if (this.search.settings.tags && node.tags) {
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
            
            if (this.search.settings.usedBy && node.details.usedBy) {
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
            
            if (this.search.settings.access && node.accessProcess && 
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
        const id = `source_${++this.nodes.counters.datasource}`;
        const dbType = this.nodes.databaseTypes[config.kind] || { 
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
        this.nodes.nodes.set(id, node);
        this.updateStats();
        return id;
    }

    addEntity(config) {
        const id = `entity_${++this.nodes.counters.entity}`;
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
        this.nodes.nodes.set(id, node);
        this.updateStats();
        return id;
    }

    addFeatureView(config) {
        const id = `fv_${++this.nodes.counters.featureview}`;
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
        this.nodes.nodes.set(id, node);
        
        if (config.entities) {
            config.entities.forEach(entityId => {
                if (this.nodes.nodes.has(entityId)) {
                    this.addConnection(entityId, id);
                }
            });
        }
        
        this.updateStats();
        return id;
    }

    addService(config) {
        const id = `service_${++this.nodes.counters.service}`;
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
        this.nodes.nodes.set(id, node);
        
        if (config.features) {
            config.features.forEach(fvId => {
                if (this.nodes.nodes.has(fvId)) {
                    this.addConnection(fvId, id);
                }
            });
        }
        if (config.featureServices) {
            config.featureServices.forEach(fsId => {
                if (this.nodes.nodes.has(fsId)) {
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

    _dedent(str) {
        // Strip common leading whitespace from multi-line template literals
        const lines = str.split('\n');
        const nonEmpty = lines.filter(l => l.trim().length > 0);
        if (!nonEmpty.length) return str;
        const indent = nonEmpty.reduce((min, l) => {
            const m = l.match(/^(\s*)/);
            return Math.min(min, m ? m[1].length : 0);
        }, Infinity);
        return lines.map(l => l.slice(indent)).join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    }

        generateCodeExample(node) {
        if (node.type === 'featureview') {
            const entityKey = this.nodes.nodes.get(node.entities?.[0])?.joinKey || 'id';
            const featLines = node.features.slice(0, 2)
                .map(f => `    <span class="code-string">"${node.name}:${f.name}"</span>`)
                .join(',\n');
            const more = node.features.length > 2 ? ',' : '';
            return [
                `<span class="code-comment"># Retrieve features from ${node.name}</span>`,
                `<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureStore`,
                ``,
                `store = FeatureStore(repo_path=<span class="code-string">"${this.repoSettings.location}"</span>)`,
                ``,
                `features = store.get_online_features(`,
                `    features=[`,
                featLines + more,
                `    ],`,
                `    entity_rows=[{<span class="code-string">"${entityKey}"</span>: <span class="code-string">"123"</span>}]`,
                `).to_df()`,
            ].join('\n');
        } else if (node.type === 'service') {
            return [
                `<span class="code-comment"># Use feature service: ${node.name}</span>`,
                `<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureStore`,
                ``,
                `store = FeatureStore(repo_path=<span class="code-string">"${this.repoSettings.location}"</span>)`,
                ``,
                `features = store.get_online_features(`,
                `    feature_service=<span class="code-string">"${node.name}"</span>,`,
                `    entity_rows=[{<span class="code-string">"user_id"</span>: <span class="code-string">"123"</span>}]`,
                `).to_df()`,
            ].join('\n');
        } else if (node.type === 'entity') {
            const varName = node.name.toLowerCase().replace(/\s+/g, '_');
            return [
                `<span class="code-comment"># Define entity: ${node.name}</span>`,
                `<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> Entity, ValueType`,
                ``,
                `${varName} = Entity(`,
                `    name=<span class="code-string">"${node.name}"</span>,`,
                `    join_keys=[<span class="code-string">"${node.joinKey}"</span>],`,
                `    value_type=ValueType.STRING`,
                `)`,
            ].join('\n');
        } else if (node.type === 'datasource') {
            const varName = node.name.toLowerCase().replace(/\s+/g, '_');
            const dbName = node.dbType ? node.dbType.name : (node.kind || 'Unknown');
            return [
                `<span class="code-comment"># Data source: ${node.name}</span>`,
                `<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FileSource`,
                ``,
                `${varName} = FileSource(`,
                `    name=<span class="code-string">"${node.name}"</span>,`,
                `    <span class="code-comment"># ${dbName} — configure connection below</span>`,
                `    path=<span class="code-string">"${node.details?.connection || 'path/to/data'}"</span>,`,
                `    timestamp_field=<span class="code-string">"event_timestamp"</span>,`,
                `)`,
            ].join('\n');
        }
        return `<span class="code-comment"># Select a node to see its Python API code</span>`;
    }

    applyUserContext() {
        const user = document.getElementById('userSelect')?.value || 'john';
        this.switchUser.call({ ...this, currentUser: user });
        document.getElementById('userSelectorModal').classList.remove('active');
        this.showNotification('Context Updated', `Switched to ${user} context`);
    }



    // --- animateNodePosition ---
    animateNodePosition(node, targetX, targetY) {
        const startX = node.x;
        const startY = node.y;
        const duration = 600;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            node.x = startX + (targetX - startX) * eased;
            node.y = startY + (targetY - startY) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    // --- calculatePermission ---
    calculatePermission(datasource) {
        if (datasource.ownedBy === this.currentUser.team || 
            datasource.ownedBy === this.currentUser.name) {
            return 'owned';
        }
        // Simulate permission logic
        const hash = datasource.name.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
        const perms = ['granted', 'granted', 'pending', 'denied'];
        return perms[hash % perms.length];
    }

    // --- drawPort ---
    drawPort(node, type) {
        const pos = this.getPortPosition(node, type);
        
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.config.portRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // --- escapeRegex ---
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- exportToJSON ---
    exportToJSON() {
        return {
            nodes: Array.from(this.nodes.nodes.entries()),
            edges: this.nodes.edges,
            exportDate: new Date().toISOString(),
            version: '3.0'
        };
    }

    // --- generateDataSourcesFile ---
    generateDataSourcesFile() {
        const sources = Array.from(this.nodes.nodes.values()).filter(n => n.type === 'datasource');
        
        let code = `<span class="code-comment">"""
data_sources.py
===============

Data source configurations for ${this.repoSettings.name}.

This module defines connections to all data sources used by feature views.
Includes ownership information and access control documentation.

Generated by Feast Architect v3.0
Repository: ${this.repoSettings.location}
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> datetime <span class="code-keyword">import</span> timedelta
<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FileSource, KafkaSource, PushSource
<span class="code-keyword">from</span> feast.types <span class="code-keyword">import</span> Float32, Int64, String, Bool

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># DATA SOURCE CONFIGURATIONS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Available Data Sources:
${sources.map(s => {
    const dbName = s.dbType ? s.dbType.name : s.kind;
    return `- ${s.name} (${dbName}) [Owner: ${s.ownedBy}]`;
}).join('\n')}

Total: ${sources.length} data sources
"""</span>

`;
        
        if (sources.length === 0) {
            code += `<span class="code-comment"># No data sources defined yet. Add data sources using the Feast Architect UI.</span>`;
        } else {
            sources.forEach(node => {
                const varName = node.name.toLowerCase().replace(/\s+/g, '_') + '_source';
                const isSupported = node.debeziumAvailable;
                const dbName = node.dbType ? node.dbType.name : node.kind;
                
                code += `<span class="code-comment">"""
${node.name} Data Source
${'-'.repeat(node.name.length + 12)}

Type: ${dbName}
Category: ${node.dbType ? node.dbType.category : 'Unknown'}
Debezium Support: ${node.debeziumAvailable ? 'Yes' : 'No'}
Owner: ${node.ownedBy}
${node.description ? `Description: ${node.description}` : ''}

Access Process:
${node.accessProcess ? node.accessProcess.split('\n').map(l => `    ${l}`).join('\n') : '    Contact data platform team'}

Spark Pattern: ${node.sparkPattern || 'Custom connector'}
Connection: ${node.details.connection || 'N/A'}
"""</span>
`;
                
                if (!isSupported) {
                    code += `<span class="code-comment"># NOTE: ${dbName} does not support Debezium CDC.</span>
<span class="code-comment"># Using PushSource pattern - requires custom ingestion pipeline.</span>
<span class="code-keyword">${varName}</span> = PushSource(
    name=<span class="code-string">"${node.name}_push"</span>,
    schema={
    "entity_id": String,
    "event_timestamp": String,
    "value": Float32
    }
)

<span class="code-comment"># TODO: Implement ${node.sparkPattern}</span>
<span class="code-comment"># Original connection: ${node.details.connection || 'N/A'}</span>

`;
                } else if (node.kind.toLowerCase() === 'kafka') {
                    code += `<span class="code-keyword">${varName}</span> = KafkaSource(
    name=<span class="code-string">"${node.name}"</span>,
    kafka_bootstrap_servers=<span class="code-string">"${node.details.connection || 'localhost:9092'}"</span>,
    topic=<span class="code-string">"${node.details.topic || 'events'}"</span>,
    timestamp_field=<span class="code-string">"event_timestamp"</span>,
    message_format=<span class="code-string">"json"</span>
)

`;
                } else {
                    code += `<span class="code-comment"># Debezium CDC enabled source</span>
<span class="code-keyword">${varName}</span> = KafkaSource(
    name=<span class="code-string">"${node.name}_cdc"</span>,
    kafka_bootstrap_servers=<span class="code-string">"kafka:9092"</span>,
    topic=<span class="code-string">"dbz.${node.name.toLowerCase().replace(/\s+/g, '_')}"</span>,
    timestamp_field=<span class="code-string">"event_timestamp"</span>,
    message_format=<span class="code-string">"json"</span>
)

`;
                }
            });
        }
        
        return code;
    }

    // --- generateDebeziumConfigs ---
    generateDebeziumConfigs() {
        const sources = Array.from(this.nodes.nodes.values()).filter(n => 
            n.type === 'datasource' && n.debeziumAvailable
        );
        
        let code = `<span class="code-comment">"""
debezium_configs.py
===================

Debezium Connector configurations for CDC (Change Data Capture).

This module contains Python dictionaries representing Debezium connector
configurations for each supported database source.

Generated by Feast Architect v3.0
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># DEBEZIUM CONNECTOR CONFIGURATIONS</span>
<span class="code-comment"># ==========================================</span>

`;
        
        if (sources.length === 0) {
            code += `<span class="code-comment"># No Debezium-compatible sources configured.</span>`;
        } else {
            sources.forEach(node => {
                const connectorName = node.name.toLowerCase().replace(/\s+/g, '_');
                code += `<span class="code-comment"># ${node.name} CDC Connector</span>
<span class="code-keyword">${connectorName}_connector</span> = {
    "name": <span class="code-string">"${connectorName}-connector"</span>,
    "config": {
    "connector.class": <span class="code-string">"io.debezium.connector.${node.kind === 'postgres' ? 'postgresql' : node.kind}.DebeziumConnector"</span>,
    "database.hostname": <span class="code-string">"${node.details.connection?.split(':')[0] || 'localhost'}"</span>,
    "database.port": <span class="code-string">"${node.details.connection?.split(':')[1]?.split('/')[0] || '5432'}"</span>,
    "database.user": <span class="code-string">"debezium"</span>,
    "database.password": <span class="code-string">"dbz"</span>,
    "database.dbname": <span class="code-string">"${node.details.connection?.split('/').pop() || 'database'}"</span>,
    "database.server.name": <span class="code-string">"${connectorName}"</span>,
    "table.include.list": <span class="code-string">"public.*"</span>,
    "plugin.name": <span class="code-string">"pgoutput"</span>,
    "kafka.bootstrap.servers": <span class="code-string">"kafka:9092"</span>,
    "topic.prefix": <span class="code-string">"dbz"</span>,
    "tombstones.on.delete": <span class="code-string">"true"</span>,
    "decimal.handling.mode": <span class="code-string">"string"</span>
    }
}

`;
            });
        }
        
        return code;
    }

    // --- generateDjangoModels ---
    generateDjangoModels() {
        return `<span class="code-comment">"""
django_models.py
================

Django models for access control and audit logging.

Generated by Feast Architect v3.0
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> django.db <span class="code-keyword">import</span> models
<span class="code-keyword">from</span> django.contrib.auth.models <span class="code-keyword">import</span> User

<span class="code-keyword">class</span> <span class="code-class">DataSourceAccess</span>(models.Model):
    <span class="code-comment">"""
    Tracks user access permissions to data sources
    """</span>
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    data_source_name = models.CharField(max_length=255)
    permission_level = models.CharField(
    choices=[
    (<span class="code-string">'owned'</span>, <span class="code-string">'Owned'</span>),
    (<span class="code-string">'granted'</span>, <span class="code-string">'Granted'</span>),
    (<span class="code-string">'pending'</span>, <span class="code-string">'Pending'</span>),
    (<span class="code-string">'denied'</span>, <span class="code-string">'Denied'</span>),
    ],
    max_length=20
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    granted_at = models.DateTimeField(null=True, blank=True)
    granted_by = models.ForeignKey(
    User, 
    on_delete=models.SET_NULL, 
    null=True, 
    blank=True,
    related_name=<span class="code-string">'granted_access'</span>
    )
    
    <span class="code-keyword">class</span> <span class="code-class">Meta</span>:
    unique_together = [<span class="code-string">'user'</span>, <span class="code-string">'data_source_name'</span>]

<span class="code-keyword">class</span> <span class="code-class">AuditLog</span>(models.Model):
    <span class="code-comment">"""
    Audit trail for all data access events
    """</span>
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=50)
    resource_name = models.CharField(max_length=255)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField()
    
    <span class="code-keyword">class</span> <span class="code-class">Meta</span>:
    ordering = [<span class="code-string">'-timestamp'</span>]

<span class="code-keyword">class</span> <span class="code-class">ColumnSecurity</span>(models.Model):
    <span class="code-comment">"""
    Column-level security policies
    """</span>
    data_source = models.CharField(max_length=255)
    column_name = models.CharField(max_length=255)
    security_level = models.CharField(
    choices=[
    (<span class="code-string">'accessible'</span>, <span class="code-string">'Accessible'</span>),
    (<span class="code-string">'masked'</span>, <span class="code-string">'Masked'</span>),
    (<span class="code-string">'denied'</span>, <span class="code-string">'Denied'</span>),
    ],
    max_length=20
    )
    pii_classification = models.CharField(
    choices=[
    (<span class="code-string">'none'</span>, <span class="code-string">'None'</span>),
    (<span class="code-string">'low'</span>, <span class="code-string">'Low'</span>),
    (<span class="code-string">'medium'</span>, <span class="code-string">'Medium'</span>),
    (<span class="code-string">'high'</span>, <span class="code-string">'High'</span>),
    ],
    max_length=20
    )`;
    }

    // --- generateEntitiesFile ---
    generateEntitiesFile() {
        const entities = Array.from(this.nodes.nodes.values()).filter(n => n.type === 'entity');
        
        let code = `<span class="code-comment">"""
entities.py
===========

Entity definitions for ${this.repoSettings.name}.

This module defines all entities used across the feature store. Entities are the 
primary keys used to join features together during retrieval.

Generated by Feast Architect v3.0
Repository: ${this.repoSettings.location}
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> Entity, ValueType

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># ENTITY DEFINITIONS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Available Entities:
${entities.map(e => `- ${e.name} (join_key: ${e.joinKey})`).join('\n')}

Total: ${entities.length} entities
"""</span>

`;
        
        if (entities.length === 0) {
            code += `<span class="code-comment"># No entities defined yet. Add entities using the Feast Architect UI.</span>`;
        } else {
            entities.forEach((node, idx) => {
                const varName = node.name.toLowerCase().replace(/\s+/g, '_');
                code += `<span class="code-comment">"""
${node.name} Entity
${'-'.repeat(node.name.length + 7)}

${node.description || 'No description provided.'}

Attributes:
    - join_key: "${node.joinKey}"
    - value_type: ValueType.STRING
${node.tags.length > 0 ? `    - tags: [${node.tags.map(t => `"${t}"`).join(', ')}]` : ''}

Usage:
    Used by ${this.getUsedByCount(node.id)} feature view(s)
"""</span>
<span class="code-keyword">${varName}</span> = Entity(
    name=<span class="code-string">"${node.name}"</span>,
    join_keys=[<span class="code-string">"${node.joinKey}"</span>],
    value_type=ValueType.STRING,
    description=<span class="code-string">"${node.description || ''}"</span>${node.tags.length > 0 ? `,
    tags={${node.tags.map(t => `"${t}": ""`).join(', ')}}` : ''}
)

`;
            });
        }
        
        return code;
    }

    // --- generateFeatureViewCode ---
    generateFeatureViewCode(node) {
        const varName     = node.name.toLowerCase().replace(/\s+/g, '_');
        const entityNames = node.entities.map(e => {
            const entity = this.nodes.nodes.get(e);
            return entity ? entity.name.toLowerCase().replace(/\s+/g, '_') : 'entity';
        }).join(', ');
        const sourceName  = node.inputs.length > 0
            ? (this.nodes.nodes.get(node.inputs[0])?.name?.toLowerCase().replace(/\s+/g, '_') + '_source')
            : 'None';
        const ttl         = node.details?.ttl || '86400';
        const schemaLines = node.features.map(f =>
            `        Field(name=<span class="code-string">"${f.name}"</span>, dtype=${f.type})`
        ).join(',\n');
        const tagStr      = node.tags.length > 0
            ? `\n    tags={${node.tags.map(t => `<span class="code-string">"${t}"</span>: <span class="code-string">""</span>`).join(', ')}},`
            : '';

        const lines = [
            `<span class="code-comment">"""`,
            `${node.name}`,
            `${'─'.repeat(node.name.length)}`,
            `Type    : ${node.subtype}`,
            `Entities: [${entityNames}]`,
            `Features: ${node.features.length}`,
            `TTL     : ${ttl}s`,
            ``,
            `${(node.description || 'No description.').replace(/\n/g, '\n')}`,
            `"""</span>`,
            `${varName} = FeatureView(`,
            `    name=<span class="code-string">"${node.name}"</span>,`,
            `    entities=[${entityNames}],`,
            `    ttl=timedelta(seconds=${ttl}),`,
            `    schema=[`,
            schemaLines,
            `    ],`,
            `    online=<span class="code-keyword">True</span>,`,
            `    source=${sourceName},${tagStr}`,
            `)`,
            ``,
        ];
        return lines.join('\n');
    }

    // --- generateFeatureViewsFile ---
    generateFeatureViewsFile() {
        const views = Array.from(this.nodes.nodes.values()).filter(n => n.type === 'featureview');
        const batchViews = views.filter(v => v.subtype === 'batch');
        const streamViews = views.filter(v => v.subtype === 'stream');
        const onDemandViews = views.filter(v => v.subtype === 'on_demand');
        
        let code = `<span class="code-comment">"""
feature_views.py
================

Feature view definitions for ${this.repoSettings.name}.

This module contains all feature views organized by type:
- Batch Feature Views: Historical data processed in batches
- Stream Feature Views: Real-time data from streaming sources  
- On-Demand Feature Views: Computed at request time

Generated by Feast Architect v3.0
Repository: ${this.repoSettings.location}
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> datetime <span class="code-keyword">import</span> timedelta
<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> Feature, FeatureView
<span class="code-keyword">from</span> feast.types <span class="code-keyword">import</span> Float32, Int64, String, Bool

<span class="code-comment"># Import entities and data sources</span>
<span class="code-keyword">from</span> .entities <span class="code-keyword">import</span> *
<span class="code-keyword">from</span> .data_sources <span class="code-keyword">import</span> *

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># FEATURE VIEW STATISTICS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Total Feature Views: ${views.length}
- Batch: ${batchViews.length}
- Stream: ${streamViews.length}  
- On-Demand: ${onDemandViews.length}

Total Features: ${views.reduce((acc, v) => acc + v.features.length, 0)}
"""</span>

`;
        
        if (views.length === 0) {
            code += `<span class="code-comment"># No feature views defined yet. Add feature views using the Feast Architect UI.</span>`;
            return code;
        }
        
        if (batchViews.length > 0) {
            code += `<span class="code-comment"># ==========================================</span>
<span class="code-comment"># BATCH FEATURE VIEWS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Batch feature views are computed on historical data and stored in the 
offline store. They are ideal for features that don't require real-time updates.
"""</span>

`;
            batchViews.forEach(node => {
                code += this.generateFeatureViewCode(node);
            });
        }
        
        if (streamViews.length > 0) {
            code += `<span class="code-comment"># ==========================================</span>
<span class="code-comment"># STREAM FEATURE VIEWS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Stream feature views process real-time data from Kafka or other streaming sources.
They provide low-latency features for online serving.
"""</span>

`;
            streamViews.forEach(node => {
                code += this.generateFeatureViewCode(node);
            });
        }
        
        if (onDemandViews.length > 0) {
            code += `<span class="code-comment"># ==========================================</span>
<span class="code-comment"># ON-DEMAND FEATURE VIEWS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
On-demand feature views are computed at request time using transformation logic.
They are useful for features that depend on request context or cannot be pre-computed.
"""</span>

`;
            onDemandViews.forEach(node => {
                code += this.generateFeatureViewCode(node);
            });
        }
        
        return code;
    }

    // --- generateJSONExport ---
    generateJSONExport() {
        const data = {
            repository: this.repoSettings,
            exportDate: new Date().toISOString(),
            version: '3.0',
            nodes: Array.from(this.nodes.nodes.entries()),
            edges: this.nodes.edges,
            stats: {
                totalNodes: this.nodes.nodes.size,
                totalEdges: this.nodes.edges.length,
                totalFeatures: Array.from(this.nodes.nodes.values()).reduce((acc, n) => acc + (n.features?.length || 0), 0)
            }
        };
        return `<span class="code-keyword">${JSON.stringify(data, null, 2).replace(/"([^"]+)":/g, '<span class="code-string">"$1"</span>:').replace(/: "([^"]+)"/g, ': <span class="code-string">"$1"</span>')}</span>`;
    }

    // --- generateLLMCodeResponse ---
    generateLLMCodeResponse(context) {
        if (!context) {
            return `<p>Here's a complete Feast repository structure for your architecture:</p>
<pre>feature_repo/
├── entities.py          # ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'entity').length} entities
├── data_sources.py      # ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'datasource').length} sources
├── feature_views.py     # ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'featureview').length} views
├── services.py          # ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'service').length} services
└── feature_store.yaml   # Configuration</pre>
<p>All files include proper docstrings and follow Feast best practices.</p>`;
        }
        
        return `<p>Generated code for <strong>${context.name}</strong>:</p>
<pre># ${context.name} configuration
${context.type === 'featureview' ? `
feature_view = FeatureView(
    name="${context.name}",
    entities=[${context.entities.map(e => '"' + (this.nodes.nodes.get(e)?.name || 'entity') + '"').join(', ')}],
    features=[
${context.features.map(f => `        Feature(name="${f.name}", dtype=${f.type}),`).join('\n')}
    ],
    source=${context.inputs[0] ? this.nodes.nodes.get(context.inputs[0])?.name + '_source' : 'None'}
)` : context.type === 'entity' ? `
entity = Entity(
    name="${context.name}",
    join_keys=["${context.joinKey}"],
    value_type=ValueType.STRING
)` : ''}
</pre>`;
    }

    // --- generateLLMLineageResponse ---
    generateLLMLineageResponse(context) {
        if (!context) {
            return `<p>Full Data Lineage Overview:</p>
<p>Your architecture flows from ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'datasource').length} sources through ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'featureview').length} feature views to ${Array.from(this.nodes.nodes.values()).filter(n => n.type === 'service').length} services.</p>
<p>Key lineage paths:</p>
<ul style="margin-left: 20px; margin-top: 8px;">
    <li>User Database → User Demographics → Recommendation API</li>
    <li>Kafka Stream → User Behavior → Fraud Detection</li>
</ul>`;
        }
        
        const inputs = context.inputs.map(id => this.nodes.nodes.get(id)?.name).filter(Boolean);
        const outputs = context.outputs.map(id => this.nodes.nodes.get(id)?.name).filter(Boolean);
        
        return `<p>Data Lineage for <strong>${context.name}</strong>:</p>
<p><strong>Inputs:</strong> ${inputs.length > 0 ? inputs.join(', ') : 'None'}</p>
<p><strong>Outputs:</strong> ${outputs.length > 0 ? outputs.join(', ') : 'None'}</p>
<p>This component is ${context.inputs.length === 0 ? 'a root source' : context.outputs.length === 0 ? 'a terminal sink' : 'a middle transformation'} in your data flow.</p>`;
    }

    // --- generateLLMOptimizeResponse ---
    generateLLMOptimizeResponse(context) {
        if (!context) {
            return `<p>Architecture Optimization Suggestions:</p>
<ul style="margin-left: 20px; margin-top: 8px;">
    <li><strong>Streaming Efficiency:</strong> Consider increasing Kafka partitions for high-throughput sources</li>
    <li><strong>Feature TTL:</strong> Review TTL settings - some features may expire too quickly</li>
    <li><strong>Entity Cardinality:</strong> High cardinality entities may benefit from caching</li>
    <li><strong>Data Source Consolidation:</strong> 3 sources have similar schemas - consider merging</li>
</ul>`;
        }
        
        return `<p>Optimization recommendations for <strong>${context.name}</strong>:</p>
<ul style="margin-left: 20px; margin-top: 8px;">
    <li>Reduce feature granularity to improve serving latency</li>
    <li>Add feature validation to catch data quality issues</li>
    <li>Consider materialization for frequently accessed features</li>
</ul>`;
    }

    // --- generateLLMValidateResponse ---
    generateLLMValidateResponse() {
        const issues = [];
        const warnings = [];
        
        this.nodes.nodes.forEach(node => {
            if (node.type === 'featureview') {
                if (node.entities.length === 0) {
                    issues.push(`${node.name} has no entities defined`);
                }
                if (node.features.length === 0) {
                    issues.push(`${node.name} has no features defined`);
                }
            }
            if (node.type === 'service' && node.features.length === 0) {
                warnings.push(`${node.name} has no feature views attached`);
            }
        });
        
        if (issues.length === 0 && warnings.length === 0) {
            return `<p>✅ <strong>Validation Passed!</strong></p>
<p>All entity relationships are properly configured. Your architecture is ready for deployment.</p>`;
        }
        
        return `<p>${issues.length > 0 ? '❌ <strong>Issues Found:</strong>' : '⚠️ <strong>Warnings:</strong>'}</p>
${issues.length > 0 ? `<ul style="margin-left: 20px; color: var(--feast-red);">${issues.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
${warnings.length > 0 ? `<ul style="margin-left: 20px; color: var(--feast-yellow);">${warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}`;
    }

    // --- generatePostgresRLS ---
    generatePostgresRLS() {
        return `<span class="code-comment">-- postgres_rls.sql
-- Row Level Security policies for Postgres offline store
-- Generated by Feast Architect v3.0

-- Enable RLS on feature tables
ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;

-- Create policy for team-based access
CREATE POLICY team_isolation_policy ON feature_store
    USING (
    team_id = current_setting('app.current_team')::INTEGER
    OR 
    current_setting('app.user_role') = 'admin'
    );

-- Create policy for PII masking
CREATE POLICY pii_masking_policy ON feature_store
    USING (true)
    WITH CHECK (
    current_setting('app.pii_access') = 'true'
    OR
    NOT EXISTS (
    SELECT 1 FROM pii_columns 
    WHERE table_name = 'feature_store'
    )
    );

-- Function to set security context
CREATE OR REPLACE FUNCTION set_security_context(
    user_id INTEGER,
    team_id INTEGER,
    user_role VARCHAR,
    pii_access BOOLEAN
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user', user_id::TEXT, false);
    PERFORM set_config('app.current_team', team_id::TEXT, false);
    PERFORM set_config('app.user_role', user_role, false);
    PERFORM set_config('app.pii_access', pii_access::TEXT, false);
END;
$$ LANGUAGE plpgsql;</span>`;
    }

    // --- generateServicesFile ---
    generateServicesFile() {
        const services = Array.from(this.nodes.nodes.values()).filter(n => n.type === 'service');
        
        let code = `<span class="code-comment">"""
services.py
===========

Feature service definitions for ${this.repoSettings.name}.

Feature services group related features together for serving to applications.
They provide a stable API for feature retrieval while allowing the underlying
feature views to evolve.

Generated by Feast Architect v3.0
Repository: ${this.repoSettings.location}
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureService

<span class="code-comment"># Import feature views</span>
<span class="code-keyword">from</span> .feature_views <span class="code-keyword">import</span> *

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># FEATURE SERVICE DEFINITIONS</span>
<span class="code-comment"># ==========================================</span>

<span class="code-comment">"""
Available Feature Services:
${services.map(s => {
    const deps = s.features.length + (s.featureServices ? s.featureServices.length : 0);
    const consumers = s.details.usedBy ? s.details.usedBy.length : 0;
    return `- ${s.name} (${deps} dependencies, ${consumers} consumers)`;
}).join('\n')}

Total: ${services.length} feature services
"""</span>

`;
        
        if (services.length === 0) {
            code += `<span class="code-comment"># No feature services defined yet. Add feature services using the Feast Architect UI.</span>`;
        } else {
            services.forEach(node => {
                const varName = node.name.toLowerCase().replace(/\s+/g, '_') + '_service';
                const viewNames = node.features.map(f => {
                    const view = this.nodes.nodes.get(f);
                    return view ? view.name.toLowerCase().replace(/\s+/g, '_') : 'view';
                }).join(', ');
                
                const usedBy = node.details.usedBy || [];
                
                code += `<span class="code-comment">"""
${node.name} Feature Service
${'-'.repeat(node.name.length + 16)}

${node.description || 'No description provided.'}

Dependencies:
${node.features.map(f => {
    const view = this.nodes.nodes.get(f);
    return view ? `    - ${view.name} (Feature View)` : '';
}).filter(Boolean).join('\n')}

Consumers:
${usedBy.length > 0 ? usedBy.map(u => {
    const app = typeof u === 'string' ? u : u.name;
    const env = typeof u === 'string' ? 'Production' : u.environment;
    return `    - ${app} (${env})`;
}).join('\n') : '    None defined'}

Usage:
    store.get_online_features(
    feature_service="${node.name}",
    entity_rows=[{"entity_id": "value"}]
    )
"""</span>
<span class="code-keyword">${varName}</span> = FeatureService(
    name=<span class="code-string">"${node.name}"</span>,
    features=[${viewNames}]${node.tags.length > 0 ? `,
    tags={${node.tags.map(t => `"${t}": ""`).join(', ')}}` : ''}${node.description ? `,
    description=<span class="code-string">"${node.description}"</span>` : ''}
)

`;
            });
        }
        
        return code;
    }

    // --- generateSparkJobs ---
    generateSparkJobs() {
        const streamViews = Array.from(this.nodes.nodes.values()).filter(n => 
            n.type === 'featureview' && n.subtype === 'stream'
        );
        
        let code = `<span class="code-comment">"""
spark_jobs.py
=============

Spark Structured Streaming jobs for real-time feature computation.

This module contains PySpark code for processing CDC events from Kafka
and writing to the Postgres offline store.

Generated by Feast Architect v3.0
Date: ${new Date().toISOString().split('T')[0]}
"""</span>

<span class="code-keyword">from</span> pyspark.sql <span class="code-keyword">import</span> SparkSession
<span class="code-keyword">from</span> pyspark.sql.functions <span class="code-keyword">import</span> *
<span class="code-keyword">from</span> pyspark.sql.types <span class="code-keyword">import</span> *

<span class="code-comment"># Initialize Spark session with security context</span>
spark = SparkSession.builder \\
    .appName(<span class="code-string">"FeastStreaming"</span>) \\
    .config(<span class="code-string">"spark.sql.streaming.checkpointLocation"</span>, <span class="code-string">"/tmp/checkpoints"</span>) \\
    .config(<span class="code-string">"spark.hadoop.security.authentication"</span>, <span class="code-string">"kerberos"</span>) \\
    .getOrCreate()

<span class="code-comment"># ==========================================</span>
<span class="code-comment"># STREAMING JOBS</span>
<span class="code-comment"># ==========================================</span>

`;
        
        if (streamViews.length === 0) {
            code += `<span class="code-comment"># No streaming feature views configured.</span>`;
        } else {
            streamViews.forEach(view => {
                const jobName = view.name.toLowerCase().replace(/\s+/g, '_');
                code += `<span class="code-keyword">def</span> <span class="code-function">${jobName}_job</span>():
    <span class="code-comment">"""
    Streaming job for ${view.name}
    Reads from Kafka, processes aggregations, writes to Postgres
    """</span>
    
    <span class="code-comment"># Read from Kafka</span>
    df = spark \\
    .readStream \\
    .format(<span class="code-string">"kafka"</span>) \\
    .option(<span class="code-string">"kafka.bootstrap.servers"</span>, <span class="code-string">"kafka:9092"</span>) \\
    .option(<span class="code-string">"subscribe"</span>, <span class="code-string">"dbz.${view.inputs[0] ? this.nodes.nodes.get(view.inputs[0])?.name?.toLowerCase().replace(/\s+/g, '_') : 'source'}"</span>) \\
    .option(<span class="code-string">"startingOffsets"</span>, <span class="code-string">"latest"</span>) \\
    .load()
    
    <span class="code-comment"># Parse JSON payload</span>
    parsed = df.select(
    from_json(col(<span class="code-string">"value"</span>).cast(<span class="code-string">"string"</span>), schema).alias(<span class="code-string">"data"</span>)
    ).select(<span class="code-string">"data.*"</span>)
    
    <span class="code-comment"># Apply transformations</span>
    transformed = parsed \\
    .withWatermark(<span class="code-string">"event_timestamp"</span>, <span class="code-string">"10 minutes"</span>) \\
    .groupBy(
    window(<span class="code-string">"event_timestamp"</span>, <span class="code-string">"5 minutes"</span>),
    <span class="code-string">"entity_id"</span>
    ) \\
    .agg(
    ${view.features.map(f => `sum(<span class="code-string">"${f.name}"</span>).alias(<span class="code-string">"${f.name}"</span>)`).join(',\n            ')}
    )
    
    <span class="code-comment"># Write to Postgres with RLS context</span>
    query = transformed.writeStream \\
    .foreachBatch(<span class="code-keyword">lambda</span> batch_df, batch_id: 
    batch_df.write \\
        .mode(<span class="code-string">"append"</span>) \\
        .jdbc(<span class="code-string">"jdbc:postgresql://postgres:5432/feast"</span>, 
              <span class="code-string">"${jobName}"</span>,
              properties={<span class="code-string">"user"</span>: <span class="code-string">"feast"</span>, <span class="code-string">"password"</span>: <span class="code-string">"feast"</span>})
    ) \\
    .start()
    
    <span class="code-keyword">return</span> query

`;
            });
        }
        
        return code;
    }

    // --- generateYAMLConfig ---
    generateYAMLConfig() {
        return `<span class="code-comment">"""
feature_store.yaml
==================

Feature store configuration for ${this.repoSettings.name}.

This file configures the Feast feature store infrastructure including
the registry, online store, and offline store settings.
"""</span>

<span class="code-keyword">project:</span> <span class="code-string">${this.repoSettings.name}</span>
<span class="code-keyword">registry:</span> <span class="code-string">data/registry.db</span>
<span class="code-keyword">provider:</span> <span class="code-string">local</span>

<span class="code-comment"># Online store configuration for low-latency serving</span>
<span class="code-keyword">online_store:</span>
  <span class="code-keyword">type:</span> <span class="code-string">redis</span>
  <span class="code-keyword">connection_string:</span> <span class="code-string">localhost:6379</span>

<span class="code-comment"># Offline store configuration for batch processing</span>
<span class="code-keyword">offline_store:</span>
  <span class="code-keyword">type:</span> <span class="code-string">postgres</span>
  <span class="code-keyword">host:</span> <span class="code-string">postgres</span>
  <span class="code-keyword">port:</span> <span class="code-string">5432</span>
  <span class="code-keyword">database:</span> <span class="code-string">feast</span>
  <span class="code-keyword">schema:</span> <span class="code-string">offline</span>

<span class="code-comment"># Entity key serialization version</span>
<span class="code-keyword">entity_key_serialization_version:</span> <span class="code-string">2</span>

<span class="code-comment"># Feature server configuration</span>
<span class="code-keyword">feature_server:</span>
  <span class="code-keyword">enabled:</span> <span class="code-string">true</span>
  <span class="code-keyword">port:</span> <span class="code-string">6566</span>`;
    }

    // --- getBounds ---
    getBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + this.config.nodeWidth);
            maxY = Math.max(maxY, node.y + this.config.nodeHeight);
        });
        
        if (minX === Infinity) {
            return { minX: 0, minY: 0, width: 1000, height: 800 };
        }
        
        return {
            minX: minX - 100,
            minY: minY - 100,
            width: maxX - minX + 200,
            height: maxY - minY + 200
        };
    }

    // --- getCsrfToken ---
    getCsrfToken() {
        // First try from Django context
        const djangoContext = window.DJANGO_CONTEXT || {};
        if (djangoContext.csrfToken) {
            return djangoContext.csrfToken;
        }
        // Fallback to cookie parsing
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        // Final fallback to meta tag
        if (!cookieValue) {
            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) {
                cookieValue = meta.getAttribute('content');
            }
        }
        return cookieValue;
    }

    // --- getPortPosition ---
    getPortPosition(node, type) {
        const { nodeWidth, nodeHeight } = this.config;
        if (type === 'input') {
            return { x: node.x, y: node.y + nodeHeight / 2 };
        } else {
            return { x: node.x + nodeWidth, y: node.y + nodeHeight / 2 };
        }
    }

    // --- getSubtypeColor ---
    getSubtypeColor(subtype) {
        const colors = {
            batch: '#10b981',
            stream: '#f59e0b',
            on_demand: '#ec4899'
        };
        return colors[subtype] || '#64748b';
    }

    // --- getUsedByCount ---
    getUsedByCount(entityId) {
        let count = 0;
        this.nodes.nodes.forEach(node => {
            if (node.type === 'featureview' && node.entities.includes(entityId)) {
                count++;
            }
        });
        return count;
    }

    // --- highlightText ---
    highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    // --- importFromJSON ---
    importFromJSON(arch) {
        if (!arch) return;
        
        // Clear existing
        this.nodes.nodes.clear();
        this.nodes.edges = [];
        
        // Import nodes
        if (arch.nodes) {
            // Handle both Map-like object and array formats
            const nodeEntries = Array.isArray(arch.nodes) ? arch.nodes : Object.entries(arch.nodes);
            nodeEntries.forEach(([id, node]) => {
                this.nodes.nodes.set(id, node);
                // Update counters to avoid ID collisions
                const type = node.type;
                if (this.nodes.counters[type] !== undefined) {
                    const num = parseInt(id.split('_').pop()) || 0;
                    if (num > this.nodes.counters[type]) {
                        this.nodes.counters[type] = num;
                    }
                }
            });
        }
        
        // Import edges
        if (arch.edges) {
            this.nodes.edges = arch.edges.filter(edge => {
                return this.nodes.nodes.has(edge.from) && this.nodes.nodes.has(edge.to);
            });
            
            // Rebuild inputs/outputs
            this.nodes.nodes.forEach(node => {
                node.inputs = [];
                node.outputs = [];
            });
            this.nodes.edges.forEach(edge => {
                const fromNode = this.nodes.nodes.get(edge.from);
                const toNode = this.nodes.nodes.get(edge.to);
                if (fromNode && toNode) {
                    fromNode.outputs.push(edge.to);
                    toNode.inputs.push(edge.from);
                }
            });
        }
        
        this.updateStats();
    }

    // --- loadComplexExample ---
    loadComplexExample() {
        // Create a comprehensive multi-source architecture
        
        // 1. PostgreSQL with Debezium CDC
        const userDb = this.addDatasource({
            name: 'User Database',
            kind: 'postgres',
            description: 'Primary transactional database with user profiles and authentication data',
            ownedBy: 'Platform Team',
            accessProcess: '1. Submit request in ServiceNow\n2. Get approval from Platform Team lead\n3. Credentials delivered via Vault',
            tags: ['critical', 'pii', 'platform'],
            details: { 
                connection: 'postgresql://prod.db.internal:5432/users',
                notes: 'Owner: Platform Team\nSLA: 99.99%\nBackup: Daily snapshots\nEncryption: AES-256 at rest'
            }
        });
        
        // 2. MongoDB (NoSQL with Debezium)
        const mongoEvents = this.addDatasource({
            name: 'Event Store',
            kind: 'mongodb',
            description: 'NoSQL event store for user activity streams',
            ownedBy: 'Analytics Team',
            accessProcess: 'Contact analytics-oncall@company.com for read replicas',
            tags: ['analytics', 'stream'],
            details: {
                connection: 'mongodb://analytics.mongo.internal:27017/events',
                notes: 'Debezium CDC enabled\nRequires Spark streaming job\nRetention: 30 days'
            }
        });
        
        // 3. Kafka (Streaming)
        const kafkaStream = this.addDatasource({
            name: 'Kafka Stream',
            kind: 'kafka',
            description: 'Real-time event streaming platform',
            ownedBy: 'Streaming Team',
            accessProcess: 'Self-service via Kafka Manager UI',
            tags: ['streaming', 'real-time'],
            details: {
                connection: 'kafka.prod.internal:9092',
                topic: 'user-events',
                notes: 'Topic: user-events\nRetention: 7 days\nPartitions: 24'
            }
        });
        
        // 4. Snowflake (Cloud Warehouse)
        const dataWarehouse = this.addDatasource({
            name: 'Snowflake Warehouse',
            kind: 'snowflake',
            description: 'Enterprise data warehouse for analytics',
            ownedBy: 'Data Engineering',
            accessProcess: 'Request access via internal Data Portal',
            tags: ['warehouse', 'analytics', 'batch'],
            details: {
                connection: 'snowflake://prod.warehouse/ANALYTICS',
                notes: 'Role-based access control\nTime travel: 90 days\nCredit usage monitored'
            }
        });
        
        // 5. DynamoDB (NoSQL without Debezium)
        const dynamoCache = this.addDatasource({
            name: 'DynamoDB Cache',
            kind: 'dynamodb',
            description: 'Low-latency cache for session data',
            ownedBy: 'Backend Team',
            accessProcess: 'IAM role escalation required',
            tags: ['cache', 'low-latency'],
            details: {
                connection: 'dynamodb://us-east-1/session-cache',
                notes: 'PushSource via Lambda streams\nTTL: 24 hours\nRCU/WCU: auto-scaling'
            }
        });
        
        // 6. Redis (In-Memory)
        const redisCache = this.addDatasource({
            name: 'Redis Cache',
            kind: 'redis',
            description: 'In-memory store for real-time features',
            ownedBy: 'Platform Team',
            accessProcess: 'Redis ACL set via config',
            tags: ['cache', 'in-memory', 'fast'],
            details: {
                connection: 'redis://redis.internal:6379',
                notes: 'Cluster mode enabled\nEviction: allkeys-lru\nMaxmemory: 64GB'
            }
        });
        
        // 7. S3 (Object Storage)
        const s3Store = this.addDatasource({
            name: 'S3 Data Lake',
            kind: 's3',
            description: 'Parquet files for historical batch processing',
            ownedBy: 'Data Platform',
            accessProcess: 'S3 bucket policy update via IAM',
            tags: ['datalake', 'parquet', 'batch'],
            details: {
                connection: 's3://data-lake-prod/features/',
                notes: 'Partitioned by date\nFormat: Parquet\nCompression: Snappy'
            }
        });
        
        // 8. Neo4j (Graph)
        const graphDb = this.addDatasource({
            name: 'Graph Database',
            kind: 'neo4j',
            description: 'Graph relationships for fraud detection',
            ownedBy: 'Security Team',
            accessProcess: 'Security review required',
            tags: ['graph', 'fraud', 'relationships'],
            details: {
                connection: 'bolt://neo4j.internal:7687',
                notes: 'Debezium CDC via plugin\nGraph algorithms: GDS\nEncryption: SSL'
            }
        });
        
        // 9. Elasticsearch (Search)
        const searchIndex = this.addDatasource({
            name: 'Search Index',
            kind: 'elasticsearch',
            description: 'Full-text search and log analytics',
            ownedBy: 'Search Team',
            accessProcess: 'Kibana role assignment',
            tags: ['search', 'logs', 'analytics'],
            details: {
                connection: 'https://elasticsearch.internal:9200',
                notes: 'Debezium CDC enabled\nIndices: daily rollover\nShards: 5 primary'
            }
        });
        
        // 10. InfluxDB (Time-Series)
        const timeSeriesDb = this.addDatasource({
            name: 'Metrics Store',
            kind: 'influxdb',
            description: 'Time-series metrics and monitoring data',
            ownedBy: 'Observability Team',
            accessProcess: 'InfluxDB token generation',
            tags: ['metrics', 'time-series', 'monitoring'],
            details: {
                connection: 'http://influxdb.internal:8086',
                notes: 'Retention: 90 days\nDownsampling: continuous queries\nPrecision: nanosecond'
            }
        });
        
        // Entities
        const user = this.addEntity({
            name: 'User',
            joinKey: 'user_id',
            description: 'Registered application users across all platforms',
            tags: ['core', 'pii'],
            details: {
                notes: '100M+ users globally\nGDPR compliant\nPII masking required\nJoins: user_id (string)'
            }
        });
        
        const session = this.addEntity({
            name: 'Session',
            joinKey: 'session_id',
            description: 'Ephemeral user sessions for real-time features',
            tags: ['ephemeral', 'real-time'],
            details: {
                notes: 'TTL: 4 hours\nHigh cardinality\nUsed for real-time personalization'
            }
        });
        
        const product = this.addEntity({
            name: 'Product',
            joinKey: 'product_id',
            description: 'Product catalog with variants and categories',
            tags: ['catalog', 'reference'],
            details: {
                notes: '2.5M active products\nUpdated: hourly\nCategories: hierarchical'
            }
        });
        
        const merchant = this.addEntity({
            name: 'Merchant',
            joinKey: 'merchant_id',
            description: 'Seller accounts with risk profiles',
            tags: ['seller', 'risk'],
            details: {
                notes: '50K active merchants\nKYC verified\nRisk scoring enabled'
            }
        });
        
        const device = this.addEntity({
            name: 'Device',
            joinKey: 'device_fingerprint',
            description: 'Device fingerprinting for fraud detection',
            tags: ['fraud', 'security'],
            details: {
                notes: 'Fingerprinting via JS SDK\nBot detection enabled\nPrivacy compliant'
            }
        });
        
        // Feature Views - Batch
        const userDemographics = this.addFeatureView({
            name: 'User Demographics',
            subtype: 'batch',
            description: 'Static user attributes from registration and profile updates',
            entities: [user],
            tags: ['profile', 'batch', 'pii'],
            features: [
                { name: 'age', type: 'Int64' },
                { name: 'country_code', type: 'String' },
                { name: 'gender', type: 'String' },
                { name: 'signup_date', type: 'String' },
                { name: 'account_tier', type: 'String' },
                { name: 'language_preference', type: 'String' },
                { name: 'timezone', type: 'String' }
            ],
            details: {
                ttl: '86400',
                notes: 'Updated daily via Airflow\nBackfill: 5 years\nQuality: 99.5% complete\nPII: hashed in online store'
            }
        });
        
        const userTransactions = this.addFeatureView({
            name: 'Transaction History',
            subtype: 'batch',
            description: 'Aggregated purchase history and spending patterns',
            entities: [user],
            tags: ['financial', 'sensitive', 'batch'],
            features: [
                { name: 'total_lifetime_spend', type: 'Float32' },
                { name: 'order_count_30d', type: 'Int64' },
                { name: 'avg_order_value', type: 'Float32' },
                { name: 'favorite_category', type: 'String' },
                { name: 'days_since_last_order', type: 'Int64' },
                { name: 'refund_rate', type: 'Float32' },
                { name: 'payment_methods_used', type: 'Int64' }
            ],
            details: {
                ttl: '86400',
                notes: 'Updated hourly\nSensitive: financial data\nAudit: required\nEncryption: column-level'
            }
        });
        
        const productCatalog = this.addFeatureView({
            name: 'Product Catalog Features',
            subtype: 'batch',
            description: 'Product embeddings and catalog metadata',
            entities: [product],
            tags: ['catalog', 'embeddings', 'ml'],
            features: [
                { name: 'category_embedding', type: 'Float32' },
                { name: 'price_percentile', type: 'Float32' },
                { name: 'stock_availability', type: 'String' },
                { name: 'seller_rating', type: 'Float32' },
                { name: 'return_rate', type: 'Float32' },
                { name: 'view_to_purchase_ratio', type: 'Float32' }
            ],
            details: {
                ttl: '14400',
                notes: 'Embeddings: 128-dim\nUpdated: every 4 hours\nSource: Snowflake\nModel: BERT-based'
            }
        });
        
        const merchantRiskProfile = this.addFeatureView({
            name: 'Merchant Risk Profile',
            subtype: 'batch',
            description: 'Risk indicators and trust scores for merchants',
            entities: [merchant],
            tags: ['risk', 'compliance', 'fraud'],
            features: [
                { name: 'chargeback_rate_30d', type: 'Float32' },
                { name: 'account_age_days', type: 'Int64' },
                { name: 'risk_score', type: 'Float32' },
                { name: 'kyc_verified', type: 'Bool' },
                { name: 'suspicious_activity_flag', type: 'Bool' },
                { name: 'avg_settlement_time', type: 'Int64' }
            ],
            details: {
                ttl: '86400',
                notes: 'Sensitive: compliance data\nOwner: Risk Team\nAccess: restricted\nModel: XGBoost classifier'
            }
        });
        
        // Feature Views - Stream
        const userBehaviorStream = this.addFeatureView({
            name: 'User Behavior Stream',
            subtype: 'stream',
            description: 'Real-time behavioral features from clickstream',
            entities: [user, session],
            tags: ['real-time', 'behavior', 'ml'],
            features: [
                { name: 'page_views_5m', type: 'Int64' },
                { name: 'clicks_5m', type: 'Int64' },
                { name: 'scroll_depth_avg', type: 'Float32' },
                { name: 'time_on_site_5m', type: 'Int64' },
                { name: 'bounce_rate_1h', type: 'Float32' },
                { name: 'session_duration', type: 'Int64' },
                { name: 'referrer_category', type: 'String' }
            ],
            details: {
                ttl: '3600',
                notes: 'Window: 5 minutes\nLatency: <100ms p99\nSource: Kafka\nAggregation: tumbling window'
            }
        });
        
        const deviceFingerprint = this.addFeatureView({
            name: 'Device Intelligence',
            subtype: 'stream',
            description: 'Device-level fraud signals and reputation',
            entities: [device],
            tags: ['fraud', 'security', 'real-time'],
            features: [
                { name: 'device_reputation_score', type: 'Float32' },
                { name: 'bot_probability', type: 'Float32' },
                { name: 'vpn_proxy_detected', type: 'Bool' },
                { name: 'device_age_hours', type: 'Int64' },
                { name: 'associated_accounts_count', type: 'Int64' }
            ],
            details: {
                ttl: '7200',
                notes: 'Source: DynamoDB streams\nLatency: <50ms\nIntegration: MaxMind\nML: real-time inference'
            }
        });
        
        // Feature Views - On-Demand
        const sessionContext = this.addFeatureView({
            name: 'Session Context',
            subtype: 'on_demand',
            description: 'Computed session features for real-time personalization',
            entities: [session],
            tags: ['on-demand', 'real-time', 'context'],
            features: [
                { name: 'contextual_discount_eligible', type: 'Bool' },
                { name: 'ab_test_variant', type: 'String' },
                { name: 'device_type', type: 'String' },
                { name: 'geo_region', type: 'String' }
            ],
            details: {
                notes: 'On-demand transformation\nNo TTL (computed live)\nSource: request context\nPerformance: <10ms compute'
            }
        });
        
        // Cross-source feature view (joining multiple sources)
        const unifiedUserProfile = this.addFeatureView({
            name: 'Unified User Profile',
            subtype: 'batch',
            description: 'Comprehensive user profile combining Postgres, MongoDB, and S3 data',
            entities: [user],
            tags: ['unified', 'cross-source', 'batch'],
            features: [
                { name: 'engagement_score', type: 'Float32' },
                { name: 'lifetime_value_predicted', type: 'Float32' },
                { name: 'churn_risk_score', type: 'Float32' },
                { name: 'preferred_channel', type: 'String' },
                { name: 'segment', type: 'String' }
            ],
            details: {
                ttl: '86400',
                notes: 'Joins: User DB + Event Store + S3 historical\nSpark job: hourly\nModel: Ensemble classifier'
            }
        });
        
        // Services
        const recommendationService = this.addService({
            name: 'Recommendation API',
            description: 'Personalized product recommendations for homepage and product pages',
            features: [userDemographics, userBehaviorStream, userTransactions, productCatalog, unifiedUserProfile],
            tags: ['recommendations', 'personalization', 'core'],
            details: {
                usedBy: [
                    { name: 'web-frontend', environment: 'Production', sla: '99.9%', contact: 'web-team@company.com', description: 'Main e-commerce website' },
                    { name: 'mobile-app', environment: 'Production', sla: '99.9%', contact: 'mobile-team@company.com', description: 'iOS and Android apps' },
                    { name: 'email-service', environment: 'Production', sla: '99.5%', contact: 'marketing-tech@company.com', description: 'Personalized email campaigns' }
                ],
                notes: 'QPS: 15K peak\nLatency p99: 45ms\nDeploy: k8s-feast\nModel: Two-tower neural network\nCache: Redis 1 hour TTL'
            }
        });
        
        const fraudDetectionService = this.addService({
            name: 'Fraud Detection',
            description: 'Real-time transaction fraud scoring and risk assessment',
            features: [userDemographics, userTransactions, merchantRiskProfile, deviceFingerprint, unifiedUserProfile],
            tags: ['fraud', 'security', 'critical'],
            details: {
                usedBy: [
                    { name: 'payment-gateway', environment: 'Production', sla: '99.99%', contact: 'payments@company.com', description: 'Payment processing pipeline' },
                    { name: 'risk-dashboard', environment: 'Production', sla: '99.5%', contact: 'risk-ops@company.com', description: 'Analyst investigation UI' },
                    { name: 'merchant-onboarding', environment: 'Production', sla: '99.9%', contact: 'merchant-team@company.com', description: 'New seller verification' }
                ],
                notes: 'QPS: 8K\nLatency p99: 30ms\nCritical: blocking path\nModel: Ensemble XGBoost + DL\nAlerting: PagerDuty integration'
            }
        });
        
        const searchRankingService = this.addService({
            name: 'Search Ranking',
            description: 'Learned ranking features for search and category pages',
            features: [productCatalog, userBehaviorStream, userDemographics, unifiedUserProfile],
            tags: ['search', 'ranking', 'ml'],
            details: {
                usedBy: [
                    { name: 'search-service', environment: 'Production', sla: '99.9%', contact: 'search-team@company.com', description: 'Elasticsearch integration' },
                    { name: 'category-pages', environment: 'Production', sla: '99.5%', contact: 'web-team@company.com', description: 'Browse navigation' }
                ],
                notes: 'QPS: 12K\nLatency p99: 35ms\nModel: LambdaMART\nA/B test: 5% holdout\nFeature importance logged'
            }
        });
        
        const analyticsWarehouseService = this.addService({
            name: 'Analytics Features',
            description: 'Batch features for BI, reporting, and data science',
            features: [userTransactions, productCatalog, merchantRiskProfile, userDemographics, unifiedUserProfile],
            tags: ['analytics', 'batch', 'warehouse'],
            details: {
                usedBy: [
                    { name: 'bi-dashboard', environment: 'Production', sla: '95%', contact: 'analytics@company.com', description: 'Tableau dashboards' },
                    { name: 'data-science', environment: 'Development', sla: 'Best effort', contact: 'ds-platform@company.com', description: 'Jupyter notebooks' },
                    { name: 'executive-reports', environment: 'Production', sla: '99%', contact: 'bi-team@company.com', description: 'Weekly business reports' }
                ],
                notes: 'Batch only\nSchedule: hourly\nOutput: Snowflake\nNo online serving\nCost: $2K/month compute'
            }
        });
        
        const realTimePersonalization = this.addService({
            name: 'Real-Time Personalization',
            description: 'Session-based personalization using on-demand features',
            features: [sessionContext, userBehaviorStream],
            featureServices: [recommendationService],
            tags: ['real-time', 'personalization', 'composite'],
            details: {
                usedBy: [
                    { name: 'promo-engine', environment: 'Production', sla: '99.9%', contact: 'growth@company.com', description: 'Dynamic pricing and offers' },
                    { name: 'cart-abandonment', environment: 'Production', sla: '99.5%', contact: 'crm@company.com', description: 'Recovery campaigns' }
                ],
                notes: 'Composite service\nOn-demand + precomputed\nLatency: <20ms\nUses Recommendation API as base'
            }
        });

        
        
        // Add some manual connections for cross-source views
        this.addConnection(s3Store, unifiedUserProfile);
        this.addConnection(graphDb, fraudDetectionService);
        this.addConnection(searchIndex, searchRankingService);
        this.addConnection(timeSeriesDb, analyticsWarehouseService);
        
        this.autoLayout();
    }

    // --- removeNode ---
    removeNode(id) {
        const nodeToRemove = this.nodes.nodes.get(id);
        if (!nodeToRemove) return;
        this.nodes.edges = this.nodes.edges.filter(e => e.from !== id && e.to !== id);
        
        this.nodes.nodes.forEach(node => {
            node.inputs = node.inputs.filter(i => i !== id);
            node.outputs = node.outputs.filter(o => o !== id);
        });
        
        this.nodes.nodes.forEach(node => {
            if (node.type === 'featureview') {
                node.entities = node.entities.filter(e => e !== id);
            }
            if (node.type === 'service') {
                node.features = node.features.filter(f => f !== id);
                node.featureServices = node.featureServices.filter(f => f !== id);
            }
        });
        
        this.nodes.nodes.delete(id);
        if (this.selectedNode === id) {
            this.selectedNode = null;
            this.closePanel();
        }
        this.updateStats();
        this.updateCodeEditor();
    }

    // --- resize ---
    resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    // --- roundRect ---
    roundRect(x, y, w, h, r) {
        if (typeof r === 'object') {
            const { tl, tr, br, bl } = r;
            this.ctx.beginPath();
            this.ctx.moveTo(x + tl, y);
            this.ctx.lineTo(x + w - tr, y);
            this.ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
            this.ctx.lineTo(x + w, y + h - br);
            this.ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
            this.ctx.lineTo(x + bl, y + h);
            this.ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
            this.ctx.lineTo(x, y + tl);
            this.ctx.quadraticCurveTo(x, y, x + tl, y);
            this.ctx.closePath();
        } else {
            const radius = Math.min(r, w/2, h/2);
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + w - radius, y);
            this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            this.ctx.lineTo(x + w, y + h - radius);
            this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            this.ctx.lineTo(x + radius, y + h);
            this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
        }
    }

    // --- screenToWorld ---
    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            y: (y - this.offsetY) / this.scale
        };
    }

    // --- setupMiniMap ---
    setupMiniMap() {
        this.miniMapCanvas = document.getElementById('miniMapCanvas');
        this.miniMapCtx = this.miniMapCanvas.getContext('2d');
        this.miniMapContainer = document.getElementById('miniMap');
        
        this.miniMapCanvas.width = 200;
        this.miniMapCanvas.height = 150;
        
        this.miniMapCanvas.addEventListener('click', (e) => {
            const rect = this.miniMapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const bounds = this.getBounds();
            const scaleX = 200 / (bounds.width + 400);
            const scaleY = 150 / (bounds.height + 400);
            const scale = Math.min(scaleX, scaleY);
            
            const worldX = (x / scale) - 200 + bounds.minX;
            const worldY = (y / scale) - 150 + bounds.minY;
            
            this.offsetX = (this.width / 2) - (worldX * this.scale);
            this.offsetY = (this.height / 2) - (worldY * this.scale);
        });
    }

    // --- truncateText ---
    truncateText(text, maxLen) {
        if (!text) return '';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    }

    // --- updateToggleUI ---
    updateToggleUI(id, active) {
        const el = document.getElementById(id);
        if (active) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }


    // ===================================================
    // FEATURE DETAIL MODAL
    // ===================================================

    _openFeatureModal(nodeId, idx) {
        const node = this.nodes.nodes.get(nodeId);
        if (!node) return;
        const features = node.features || [];
        const f = features[idx];
        if (!f) return;

        // Store context for save
        this._fdmContext = { nodeId, idx };

        const name = typeof f === 'string' ? f : (f.name || '');
        const type = typeof f === 'string' ? '' : (f.type || '');
        const typeColors = {
            'Int64':'#60a5fa','Int32':'#60a5fa','Int16':'#60a5fa','Int8':'#60a5fa',
            'Float32':'#f59e0b','Float64':'#f59e0b','String':'#a78bfa',
            'Bool':'#34d399','Bytes':'#fb923c','UnixTimestamp':'#f472b6'
        };

        document.getElementById('fdmTypeDot').style.background = typeColors[type] || '#64748b';
        document.getElementById('fdmName').textContent = name;
        document.getElementById('fdmSubtitle').textContent = `${node.name} • ${type}`;

        // Badges
        let badges = '';
        if (f.security && f.security.pii) badges += `<span class="feat-badge feat-badge-pii">PII</span>`;
        if (f.serving && f.serving.online) badges += `<span class="feat-badge feat-badge-online">⚡ online</span>`;
        if (f.serving && f.serving.offline) badges += `<span class="feat-badge feat-badge-offline">💾 offline</span>`;
        document.getElementById('fdmBadges').innerHTML = badges;

        // Show overview tab by default
        document.querySelectorAll('.fdm-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.fdm-tab').classList.add('active');
        this._renderFdmTab('overview', f, node);

        document.getElementById('fdmEditMode').style.display = 'none';
        document.getElementById('fdmViewMode').style.display = '';
        document.getElementById('fdmEditBtnIcon').textContent = '✏️';
        document.getElementById('fdmEditBtnLabel').textContent = 'Edit';
        document.getElementById('fdmEditBtn').classList.remove('active');

        document.getElementById('featureDetailModal').classList.add('active');
    }

    _closeFeatureModal() {
        document.getElementById('featureDetailModal').classList.remove('active');
        this._fdmContext = null;
    }

    _switchFdmTab(btn, tab) {
        document.querySelectorAll('.fdm-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        if (!this._fdmContext) return;
        const node = this.nodes.nodes.get(this._fdmContext.nodeId);
        const f = node.features[this._fdmContext.idx];
        this._renderFdmTab(tab, f, node);
    }

    _renderFdmTab(tab, f, node) {
        const el = document.getElementById('fdmTabContent');
        if (!el) return;

        const row = (k, v, cls='') => (v != null && v !== '' && v !== undefined)
            ? `<div class="fdm-row"><span class="fdm-k">${k}</span><span class="fdm-v ${cls}">${v}</span></div>` : '';

        const sec = (title, rows, fullWidth=false) => rows
            ? `<div class="fdm-section${fullWidth?' full':''}"><div class="fdm-section-title">${title}</div>${rows}</div>` : '';

        const progressBar = (label, val) => val != null ? `
            <div class="fdm-progress">
                <div class="fdm-progress-label"><span>${label}</span><span>${val}%</span></div>
                <div class="fdm-progress-track">
                    <div class="fdm-progress-fill" style="width:${val}%;background:${val>=95?'var(--feast-green)':val>=80?'#f59e0b':'#f87171'}"></div>
                </div>
            </div>` : '';

        if (tab === 'overview') {
            const tags = f.tags || [];
            el.innerHTML = `<div class="fdm-grid">
                ${sec('Core',
                    row('Name', f.name, 'green') +
                    row('Type', f.type) +
                    row('Owner', f.owner) +
                    row('Source Column', f.sourceColumn) +
                    row('Default Value', f.defaultValue)
                )}
                <div class="fdm-section">
                    <div class="fdm-section-title">Transformation</div>
                    ${f.transformation
                        ? `<div class="fdm-code">${f.transformation}</div>`
                        : `<div class="fdm-no-data">No transformation defined</div>`}
                </div>
                ${f.description ? `<div class="fdm-section full">
                    <div class="fdm-section-title">Description</div>
                    <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">${f.description}</div>
                </div>` : ''}
                ${tags.length > 0 ? `<div class="fdm-section full">
                    <div class="fdm-section-title">Tags</div>
                    <div class="fdm-tags">${tags.map(t=>`<span class="fdm-tag">#${t}</span>`).join('')}</div>
                </div>` : ''}
            </div>`;

        } else if (tab === 'serving') {
            const s = f.serving || {};
            const v = f.validation || {};
            const hasServing = s.online != null || s.offline != null || s.ttl != null;
            const hasVal = v.min != null || v.max != null || v.nullable != null;
            el.innerHTML = `<div class="fdm-grid">
                <div class="fdm-section">
                    <div class="fdm-section-title">Serving</div>
                    ${hasServing
                        ? row('Online', s.online != null ? (s.online ? '✅ Enabled' : '❌ Disabled') : null) +
                          row('Offline', s.offline != null ? (s.offline ? '✅ Enabled' : '❌ Disabled') : null) +
                          row('TTL', s.ttl ? s.ttl + 's' : null)
                        : '<div class="fdm-no-data">No serving config</div>'}
                </div>
                <div class="fdm-section">
                    <div class="fdm-section-title">Validation</div>
                    ${hasVal
                        ? row('Min', v.min) + row('Max', v.max) +
                          row('Nullable', v.nullable != null ? (v.nullable ? 'Yes' : 'No') : null)
                        : '<div class="fdm-no-data">No validation rules</div>'}
                </div>
            </div>`;

        } else if (tab === 'quality') {
            const q = f.quality || {};
            const hasQ = q.freshness || q.completeness != null || q.accuracy != null;
            el.innerHTML = `<div class="fdm-grid">
                <div class="fdm-section full">
                    <div class="fdm-section-title">Quality Metrics</div>
                    ${hasQ ? row('Freshness', q.freshness) +
                        progressBar('Completeness', q.completeness) +
                        progressBar('Accuracy', q.accuracy)
                        : '<div class="fdm-no-data">No quality metrics recorded</div>'}
                </div>
            </div>`;

        } else if (tab === 'security') {
            const sec = f.security || {};
            const hasSec = sec.pii != null || sec.sensitive != null || sec.classification;
            el.innerHTML = `<div class="fdm-grid">
                <div class="fdm-section full">
                    <div class="fdm-section-title">Security &amp; Compliance</div>
                    ${hasSec
                        ? row('PII', sec.pii != null ? (sec.pii ? '<span style="color:#f87171">🔴 Yes — handle with care</span>' : '✅ No') : null) +
                          row('Sensitive', sec.sensitive != null ? (sec.sensitive ? '⚠️ Yes' : 'No') : null) +
                          row('Classification', sec.classification)
                        : '<div class="fdm-no-data">No security config</div>'}
                </div>
            </div>`;

        } else if (tab === 'stats') {
            const st = f.statistics || {};
            const hasDist = st.mean != null || st.stdDev != null || st.min != null || st.max != null;
            const hasCov = st.nullCount != null || st.distinctCount != null || st.totalCount != null;
            el.innerHTML = `<div class="fdm-grid">
                <div class="fdm-section">
                    <div class="fdm-section-title">Distribution</div>
                    ${hasDist
                        ? row('Mean', st.mean) + row('Std Dev', st.stdDev) +
                          row('Min', st.min) + row('Max', st.max)
                        : '<div class="fdm-no-data">No distribution data</div>'}
                </div>
                <div class="fdm-section">
                    <div class="fdm-section-title">Coverage</div>
                    ${hasCov
                        ? row('Null Count', st.nullCount != null ? st.nullCount.toLocaleString() : null, st.nullCount > 0 ? 'amber' : '') +
                          row('Distinct', st.distinctCount != null ? st.distinctCount.toLocaleString() : null) +
                          row('Total Rows', st.totalCount != null ? st.totalCount.toLocaleString() : null)
                        : '<div class="fdm-no-data">No coverage data</div>'}
                </div>
            </div>`;
        }
    }

    _toggleFeatureEdit() {
        const viewMode = document.getElementById('fdmViewMode');
        const editMode = document.getElementById('fdmEditMode');
        const btn = document.getElementById('fdmEditBtn');
        const btnIcon = document.getElementById('fdmEditBtnIcon');
        const btnLabel = document.getElementById('fdmEditBtnLabel');
        if (!viewMode || !editMode || !btn) return;
        const isEditing = editMode.style.display !== 'none';

        if (isEditing) {
            editMode.style.display = 'none';
            viewMode.style.display = '';
            btn.classList.remove('active');
            if (btnIcon) btnIcon.textContent = '✏️';
            if (btnLabel) btnLabel.textContent = 'Edit';
        } else {
            if (!this._fdmContext) return;
            const node = this.nodes.nodes.get(this._fdmContext.nodeId);
            if (!node) return;
            const f = node.features[this._fdmContext.idx];
            this._renderFdmEditForm(f);
            viewMode.style.display = 'none';
            editMode.style.display = 'flex';
            editMode.style.flexDirection = 'column';
            btn.classList.add('active');
            if (btnIcon) btnIcon.textContent = '👁';
            if (btnLabel) btnLabel.textContent = 'View';
        }
    }

    _renderFdmEditForm(f) {
        const grid = document.getElementById('fdmEditGrid');

        const field = (id, label, val, mono=false, textarea=false) => {
            const cls = mono ? ' mono' : '';
            const v = (val != null) ? String(val) : '';
            if (textarea) return `<div class="fdm-field">
                <div class="fdm-label">${label}</div>
                <textarea class="fdm-textarea${cls}" id="fdmF_${id}">${v}</textarea>
            </div>`;
            return `<div class="fdm-field">
                <div class="fdm-label">${label}</div>
                <input class="fdm-input${cls}" id="fdmF_${id}" value="${v.replace(/"/g,'&quot;')}">
            </div>`;
        };

        const toggle = (id, label, val) => `<div class="fdm-toggle-row">
            <span class="fdm-toggle-label">${label}</span>
            <div class="fdm-switch${val ? ' on' : ''}" id="fdmT_${id}" onclick="this.classList.toggle('on')"></div>
        </div>`;

        grid.innerHTML = `
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Core</div>
            ${field('name', 'Name', f.name, true)}
            ${field('type', 'Type', f.type, true)}
            ${field('owner', 'Owner', f.owner)}
            ${field('sourceColumn', 'Source Column', f.sourceColumn, true)}
            ${field('defaultValue', 'Default Value', f.defaultValue, true)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Description &amp; Tags</div>
            ${field('description', 'Description', f.description, false, true)}
            ${field('tags', 'Tags (comma-separated)', (f.tags||[]).join(', '))}
        </div>
        <div class="fdm-edit-section full">
            <div class="fdm-section-title">Transformation SQL / Expression</div>
            ${field('transformation', 'Expression', f.transformation, true, true)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Serving</div>
            ${toggle('serveOnline', 'Online Serving', f.serving && f.serving.online)}
            ${toggle('serveOffline', 'Offline Serving', f.serving && f.serving.offline)}
            ${field('serveTtl', 'TTL (seconds)', f.serving && f.serving.ttl, true)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Validation</div>
            ${field('valMin', 'Min Value', f.validation && f.validation.min, true)}
            ${field('valMax', 'Max Value', f.validation && f.validation.max, true)}
            ${toggle('valNullable', 'Nullable', f.validation && f.validation.nullable)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Security</div>
            ${toggle('secPii', 'PII Data', f.security && f.security.pii)}
            ${toggle('secSensitive', 'Sensitive', f.security && f.security.sensitive)}
            ${field('secClass', 'Classification', f.security && f.security.classification)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Quality</div>
            ${field('qualFreshness', 'Freshness', f.quality && f.quality.freshness)}
            ${field('qualCompleteness', 'Completeness %', f.quality && f.quality.completeness, true)}
            ${field('qualAccuracy', 'Accuracy %', f.quality && f.quality.accuracy, true)}
        </div>
        <div class="fdm-edit-section">
            <div class="fdm-section-title">Statistics</div>
            ${field('statMean', 'Mean', f.statistics && f.statistics.mean, true)}
            ${field('statStdDev', 'Std Dev', f.statistics && f.statistics.stdDev, true)}
            ${field('statNullCount', 'Null Count', f.statistics && f.statistics.nullCount, true)}
            ${field('statDistinct', 'Distinct Count', f.statistics && f.statistics.distinctCount, true)}
        </div>`;
    }

    _saveFeatureEdit() {
        if (!this._fdmContext) return;
        const { nodeId, idx } = this._fdmContext;
        const node = this.nodes.nodes.get(nodeId);
        if (!node) return;
        const f = node.features[idx];
        const g = id => document.getElementById(`fdmF_${id}`)?.value ?? '';
        const tog = id => document.getElementById(`fdmT_${id}`)?.classList.contains('on') ?? false;
        const num = id => { const v = parseFloat(g(id)); return isNaN(v) ? undefined : v; };
        const str = id => g(id).trim() || undefined;

        node.features[idx] = {
            ...f,
            name: g('name').trim() || f.name,
            type: g('type').trim() || f.type,
            owner: str('owner'),
            sourceColumn: str('sourceColumn'),
            defaultValue: g('defaultValue') !== '' ? g('defaultValue') : undefined,
            description: str('description'),
            tags: g('tags') ? g('tags').split(',').map(s => s.trim()).filter(Boolean) : (f.tags || []),
            transformation: str('transformation'),
            serving: { online: tog('serveOnline'), offline: tog('serveOffline'), ttl: num('serveTtl') },
            validation: { min: num('valMin'), max: num('valMax'), nullable: tog('valNullable') },
            security: { pii: tog('secPii'), sensitive: tog('secSensitive'), classification: str('secClass') },
            quality: { freshness: str('qualFreshness'), completeness: num('qualCompleteness'), accuracy: num('qualAccuracy') },
            statistics: { ...(f.statistics||{}), mean: num('statMean'), stdDev: num('statStdDev'), nullCount: num('statNullCount'), distinctCount: num('statDistinct') }
        };

        const savedCtx = { nodeId, idx };
        this.showNotification('Saved', `Feature "${node.features[idx].name}" updated`);
        this.updateStats();

        // Refresh the panel behind the modal, then re-open modal
        this.showPanel(savedCtx.nodeId);
        this._fdmContext = savedCtx;
        setTimeout(() => {
            this._fdmContext = savedCtx;
            this._openFeatureModal(savedCtx.nodeId, savedCtx.idx);
        }, 60);
    }

    // ===================================================
    // FEATURE HOVER POPOVER
    // ===================================================

    _showFeatPopover(nodeId, idx, el) {
        const node = this.nodes.nodes.get(nodeId);
        if (!node) return;
        const f = (node.features || [])[idx];
        if (!f) return;

        const name = typeof f === 'string' ? f : (f.name || '');
        const type = typeof f === 'string' ? '' : (f.type || '');
        const typeColors = {
            'Int64':'#60a5fa','Int32':'#60a5fa','Float32':'#f59e0b','Float64':'#f59e0b',
            'String':'#a78bfa','Bool':'#34d399','Bytes':'#fb923c','UnixTimestamp':'#f472b6'
        };
        const dotColor = typeColors[type] || '#64748b';

        let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>
            <div class="feat-popover-name">${name}</div>
        </div>
        <div class="feat-popover-type">${type}</div>`;

        if (f.description) html += `<div class="feat-popover-desc">${f.description}</div>`;

        const rows = [];
        if (f.owner) rows.push(['Owner', f.owner]);
        if (f.sourceColumn) rows.push(['Source col', f.sourceColumn]);
        if (f.serving && f.serving.ttl != null) rows.push(['TTL', f.serving.ttl + 's']);
        if (f.quality && f.quality.completeness != null) rows.push(['Completeness', f.quality.completeness + '%']);
        if (f.quality && f.quality.freshness) rows.push(['Freshness', f.quality.freshness]);
        if (f.statistics && f.statistics.mean != null) rows.push(['Mean', f.statistics.mean]);
        if (f.statistics && f.statistics.distinctCount != null) rows.push(['Distinct', f.statistics.distinctCount.toLocaleString()]);

        if (rows.length > 0) {
            html += `<div class="feat-popover-grid">${rows.map(([k,v]) =>
                `<span class="feat-popover-k">${k}</span><span class="feat-popover-v">${v}</span>`
            ).join('')}</div>`;
        }

        let badges = '';
        if (f.security && f.security.pii) badges += `<span class="feat-badge feat-badge-pii">PII</span>`;
        if (f.security && f.security.classification) badges += `<span class="feat-badge" style="background:var(--bg-tertiary);color:var(--text-muted)">${f.security.classification}</span>`;
        if (f.serving && f.serving.online) badges += `<span class="feat-badge feat-badge-online">⚡ online</span>`;
        if (f.serving && f.serving.offline) badges += `<span class="feat-badge feat-badge-offline">💾 offline</span>`;
        if (badges) html += `<div class="feat-popover-badges">${badges}</div>`;

        if (f.transformation) {
            html += `<div style="margin-top:8px;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Transform</div>
                <div style="margin-top:3px;background:var(--bg-tertiary);padding:5px 8px;border-radius:5px;font-family:monospace;font-size:10px;color:var(--text-secondary);word-break:break-all">${f.transformation.length > 80 ? f.transformation.slice(0,80)+'…' : f.transformation}</div>`;
        }

        html += `<div style="margin-top:10px;font-size:10px;color:var(--text-muted);text-align:center">Click to view full details</div>`;

        const popover = document.getElementById('featHoverPopover');
        document.getElementById('featPopoverInner').innerHTML = html;

        // Smart positioning: to the LEFT of the panel
        const rect = el.getBoundingClientRect();
        const panel = document.getElementById('detailPanel');
        const panelRect = panel ? panel.getBoundingClientRect() : { left: window.innerWidth };

        const popW = 260;
        let left = panelRect.left - popW - 12;
        if (left < 8) left = rect.right + 10; // fallback right of card

        let top = rect.top - 8;
        const estimatedHeight = 280;
        if (top + estimatedHeight > window.innerHeight - 16) {
            top = window.innerHeight - estimatedHeight - 16;
        }
        if (top < 8) top = 8;

        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
        popover.style.width = popW + 'px';
        popover.classList.add('visible');
    }

    _highlightFeatureUsage(nodeId, idx, dotEl) {
        const node = this.nodes.nodes.get(nodeId);
        if (!node) return;
        const f = (node.features || [])[idx];
        if (!f) return;
        const featName = typeof f === 'string' ? f : f.name;

        // Toggle: if already highlighted, clear
        if (this._highlightedFeature === `${nodeId}:${idx}`) {
            this._clearFeatureHighlight();
            return;
        }
        this._clearFeatureHighlight();
        this._highlightedFeature = `${nodeId}:${idx}`;

        // Find all nodes that reference this feature by name
        const highlightIds = new Set();
        this.nodes.nodes.forEach((n, nid) => {
            if (n.type === 'featureview' && Array.isArray(n.features)) {
                const has = n.features.some(ff => (typeof ff === 'string' ? ff : ff.name) === featName);
                if (has) highlightIds.add(nid);
            }
            if (n.type === 'service' && Array.isArray(n.features)) {
                // service features are FV ids — highlight service if any of its FVs have this feature
                const linked = n.features.some(fvId => highlightIds.has(fvId));
                if (linked) highlightIds.add(nid);
            }
        });
        this._featureHighlightIds = highlightIds;

        // Visual: dim everything else, pulse dot
        document.querySelectorAll('.feat-card').forEach(card => {
            const isThis = card.dataset.nodeid === nodeId && parseInt(card.dataset.idx) === idx;
            card.classList.toggle('feat-card-highlighted', isThis);
            card.classList.toggle('feat-card-dimmed', !isThis);
        });
        dotEl.classList.add('feat-dot-active');
        this._highlightDotEl = dotEl;

        this.showNotification('Highlight', `Showing nodes using "${featName}"`);
    }

    _clearFeatureHighlight() {
        this._highlightedFeature = null;
        this._featureHighlightIds = null;
        if (this._highlightDotEl) {
            this._highlightDotEl.classList.remove('feat-dot-active');
            this._highlightDotEl = null;
        }
        document.querySelectorAll('.feat-card-highlighted, .feat-card-dimmed').forEach(el => {
            el.classList.remove('feat-card-highlighted', 'feat-card-dimmed');
        });
    }

        _hideFeatPopover() {
        document.getElementById('featHoverPopover')?.classList.remove('visible');
    }

    // ===================================================
    // NODE TYPE BROWSER (stats bar clicks)
    // ===================================================

    showNodesByType(type) {
        const panel = document.getElementById('detailPanel');
        const contentEl = document.getElementById('panelContent');

        const typeConfig = {
            datasource:  { label: 'Data Sources',   icon: '🗄️',  color: '#60a5fa', bg: 'rgba(59,130,246,0.15)'  },
            entity:      { label: 'Entities',        icon: '🔑',  color: '#a78bfa', bg: 'rgba(139,92,246,0.15)'  },
            featureview: { label: 'Feature Views',   icon: '📊',  color: '#34d399', bg: 'rgba(16,185,129,0.15)'  },
            service:     { label: 'Feature Services',icon: '⚙️',  color: '#fb923c', bg: 'rgba(249,115,22,0.15)'  },
        };
        const cfg = typeConfig[type] || { label: type, icon: '📦', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };

        const nodes = [];
        this.nodes.nodes.forEach((node, nodeId) => {
            if (node.type === type) nodes.push({ node, nodeId });
        });

        // Switch to fb-mode header
        const fbHeader = document.getElementById('panelFbHeader');
        fbHeader.style.display = '';
        fbHeader.querySelector('.panel-type-badge').style.background = cfg.bg;
        fbHeader.querySelector('.panel-type-badge span:first-child').textContent = cfg.icon;
        fbHeader.querySelector('.panel-type-badge span:last-child').style.color = cfg.color;
        fbHeader.querySelector('.panel-type-badge span:last-child').textContent = cfg.label;
        document.getElementById('panelFbCount').textContent = `${nodes.length} ${cfg.label}`;
        fbHeader.querySelector('.panel-subtitle').textContent = `Click any item to inspect it in detail`;
        document.getElementById('panelNodeHeader').style.display = 'none';

        panel.classList.remove('wide');
        panel.classList.add('fb-mode', 'open');

        const cardsHtml = nodes.length > 0 ? nodes.map(({ node, nodeId }) => {
            const subtitleParts = [];
            if (node.subtype) subtitleParts.push(node.subtype);
            if (node.features) subtitleParts.push(`${node.features.length} features`);
            if (node.joinKey) subtitleParts.push(`join: ${node.joinKey}`);
            if (node.kind) subtitleParts.push(node.kind);
            const subtitle = subtitleParts.join(' · ');

            const tags = (node.tags || []).map(t =>
                `<span class="nb-tag">${t}</span>`
            ).join('');

            const desc = node.description
                ? `<div class="nb-desc">${node.description}</div>` : '';

            return `<div class="nb-card" onclick="diagram.selectNode('${nodeId}'); diagram.closePanel();">
                <div class="nb-card-header">
                    <div class="nb-icon" style="background:${cfg.bg};color:${cfg.color}">${cfg.icon}</div>
                    <div class="nb-card-info">
                        <div class="nb-name">${node.name || nodeId}</div>
                        ${subtitle ? `<div class="nb-subtitle">${subtitle}</div>` : ''}
                    </div>
                    <div class="nb-arrow">→</div>
                </div>
                ${desc}
                ${tags ? `<div class="nb-tags">${tags}</div>` : ''}
            </div>`;
        }).join('')
        : `<div class="fb-empty"><div class="fb-empty-icon">${cfg.icon}</div><div class="fb-empty-msg">No ${cfg.label} in this diagram yet.</div></div>`;

        contentEl.innerHTML = `<div class="nb-layout">
            <div class="fb-search-bar">
                <div class="fb-search-wrap">
                    <span class="fb-search-icon">⌕</span>
                    <input class="fb-search-input" id="nbSearchInput"
                        placeholder="Search ${cfg.label}…"
                        oninput="diagram._nbFilter()">
                </div>
                <div class="fb-stats" id="nbStats">${nodes.length} ${cfg.label.toLowerCase()}</div>
            </div>
            <div class="nb-list" id="nbList">${cardsHtml}</div>
        </div>`;

        // Store for filter
        this._nbType = type;
        this._nbNodes = nodes;
        this._nbCfg = cfg;
    }

    _nbFilter() {
        const q = (document.getElementById('nbSearchInput')?.value || '').toLowerCase();
        const cards = document.querySelectorAll('#nbList .nb-card');
        let visible = 0;
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const show = !q || text.includes(q);
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        const stats = document.getElementById('nbStats');
        if (stats) stats.textContent = `${visible} ${(this._nbCfg?.label || '').toLowerCase()}`;
    }

    // ===================================================
    // GLOBAL FEATURE BROWSER
    // ===================================================

    showFeatureBrowser() {
        const panel = document.getElementById('detailPanel');
        const contentEl = document.getElementById('panelContent');

        // Switch headers
        document.getElementById('panelFbHeader').style.display = '';
        document.getElementById('panelNodeHeader').style.display = 'none';

        // Gather ALL features from ALL feature views
        const allFeatures = [];
        this.nodes.nodes.forEach((node, nodeId) => {
            if (node.type === 'featureview' && node.features) {
                node.features.forEach((f, idx) => {
                    allFeatures.push({ f, idx, nodeId, nodeName: node.name, nodeSubtype: node.subtype });
                });
            }
        });

        // Update count
        document.getElementById('panelFbCount').textContent = `${allFeatures.length} Features`;

        // Gather filter options
        const types = [...new Set(allFeatures.map(e => (typeof e.f === 'object' ? e.f.type : '')).filter(Boolean))].sort();
        const owners = [...new Set(allFeatures.map(e => e.f && e.f.owner).filter(Boolean))].sort();
        const hasPii = allFeatures.some(e => e.f && e.f.security && e.f.security.pii);

        const typePills = types.map(t =>
            `<span class="fb-pill" data-filter="type" data-val="${t}">${t}</span>`
        ).join('');

        const ownerPills = owners.slice(0, 5).map(o =>
            `<span class="fb-pill" data-filter="owner" data-val="${o}">${o}</span>`
        ).join('');

        const piiPill = hasPii ? `<span class="fb-pill fb-pill-pii" data-filter="pii" data-val="true">🔒 PII</span>` : '';
        const onlinePill = `<span class="fb-pill" data-filter="serving" data-val="online">⚡ Online</span>`;
        const offlinePill = `<span class="fb-pill" data-filter="serving" data-val="offline">💾 Offline</span>`;

        // Full-width browser mode (no left/right split)
        panel.classList.remove('wide');
        panel.classList.add('fb-mode', 'open');

        const listHtml = allFeatures.length > 0
            ? allFeatures.map(e => this._buildRichFeatureCard(e.f, e.idx, e.nodeId, e.nodeName, e.nodeSubtype)).join('')
            : `<div class="fb-empty"><div class="fb-empty-icon">⚡</div><div class="fb-empty-msg">No features defined yet. Add features to Feature Views to see them here.</div></div>`;

        contentEl.innerHTML = `<div class="fb-layout">
            <div class="fb-search-bar">
                <div class="fb-search-wrap">
                    <span class="fb-search-icon">⌕</span>
                    <input class="fb-search-input" id="fbSearchInput"
                        placeholder="Search by name, type, tag, owner, transformation…"
                        oninput="diagram._fbFilter()">
                </div>
                <div class="fb-stats" id="fbStats">${allFeatures.length} features</div>
            </div>
            <div class="fb-filter-row" id="fbFilters">
                <span class="fb-pill fb-pill-all active" data-filter="all">All</span>
                ${typePills}
                ${ownerPills}
                ${piiPill}
                ${onlinePill}
                ${offlinePill}
            </div>
            <div class="fb-list" id="fbList">${listHtml}</div>
        </div>`;

        this._fbBindFilters();
    }

    _buildRichFeatureCard(f, idx, nodeId, nodeName, nodeSubtype) {
        const isString = typeof f === 'string';
        const name = isString ? f : (f.name || '');
        const type = isString ? '' : (f.type || '');
        const desc = f.description || '';
        const tags = f.tags || [];
        const owner = f.owner || '';
        const pii = f.security && f.security.pii;
        const classification = f.security && f.security.classification;
        const onlineServing = f.serving && f.serving.online;
        const offlineServing = f.serving && f.serving.offline;
        const ttl = f.serving && f.serving.ttl;
        const completeness = f.quality && f.quality.completeness;
        const freshness = f.quality && f.quality.freshness;
        const mean = f.statistics && f.statistics.mean;
        const nullCount = f.statistics && f.statistics.nullCount;
        const distinctCount = f.statistics && f.statistics.distinctCount;
        const transformation = f.transformation || '';
        const sourceColumn = f.sourceColumn || '';
        const defaultValue = f.defaultValue;

        const typeColors = {
            'Int64':'#60a5fa','Int32':'#60a5fa','Int16':'#60a5fa','Int8':'#60a5fa',
            'Float32':'#f59e0b','Float64':'#f59e0b',
            'String':'#a78bfa','Bool':'#34d399','Bytes':'#fb923c','UnixTimestamp':'#f472b6'
        };
        const typeColor = typeColors[type] || '#64748b';

        // Quality color
        const qColor = completeness == null ? '#64748b'
            : completeness >= 95 ? '#10b981'
            : completeness >= 80 ? '#f59e0b' : '#f87171';

        // Build inline metadata chips
        let chips = `<span class="rfc-type-chip" style="color:${typeColor};border-color:${typeColor}40;background:${typeColor}12">${type}</span>`;
        if (pii) chips += `<span class="rfc-chip rfc-chip-pii">🔒 PII</span>`;
        if (onlineServing) chips += `<span class="rfc-chip rfc-chip-online">⚡ online</span>`;
        if (offlineServing) chips += `<span class="rfc-chip rfc-chip-offline">💾 offline</span>`;
        if (classification) chips += `<span class="rfc-chip rfc-chip-class">${classification}</span>`;

        // Data quality indicator
        const qualityIndicator = completeness != null
            ? `<div class="rfc-quality" title="Completeness: ${completeness}%">
                <div class="rfc-quality-label">${completeness}%</div>
                <div class="rfc-quality-bar">
                    <div class="rfc-quality-fill" style="width:${completeness}%;background:${qColor}"></div>
                </div>
               </div>` : '';

        // Stats pills
        let statChips = '';
        if (mean != null) statChips += `<span class="rfc-stat">μ ${mean}</span>`;
        if (distinctCount != null) statChips += `<span class="rfc-stat">${distinctCount.toLocaleString()} distinct</span>`;
        if (nullCount != null && nullCount > 0) statChips += `<span class="rfc-stat rfc-stat-warn">${nullCount.toLocaleString()} nulls</span>`;

        // Metadata rows (visible without hover)
        let metaRows = '';
        if (sourceColumn) metaRows += `<div class="rfc-meta-row"><span class="rfc-meta-k">Source</span><span class="rfc-meta-v">${sourceColumn}</span></div>`;
        if (owner) metaRows += `<div class="rfc-meta-row"><span class="rfc-meta-k">Owner</span><span class="rfc-meta-v">${owner}</span></div>`;
        if (ttl != null) metaRows += `<div class="rfc-meta-row"><span class="rfc-meta-k">TTL</span><span class="rfc-meta-v">${ttl}s</span></div>`;
        if (freshness) metaRows += `<div class="rfc-meta-row"><span class="rfc-meta-k">Freshness</span><span class="rfc-meta-v">${freshness}</span></div>`;
        if (defaultValue !== undefined) metaRows += `<div class="rfc-meta-row"><span class="rfc-meta-k">Default</span><span class="rfc-meta-v">${defaultValue}</span></div>`;

        return `<div class="rfc"
                    data-nodeid="${nodeId}" data-idx="${idx}"
                    data-name="${name.toLowerCase()}" data-type="${type}"
                    data-owner="${owner.toLowerCase()}" data-pii="${pii ? 'true' : ''}"
                    data-online="${onlineServing ? 'true' : ''}"
                    data-tags="${tags.join(',').toLowerCase()}"
                    onmouseenter="diagram._showFbPopover('${nodeId}', ${idx}, this);diagram._highlightCanvasNodes('${nodeId}', '${name}')"
                    onmouseleave="diagram._hideFeatPopover();diagram._clearCanvasHighlight()"
                    onclick="diagram._openFeatureModal('${nodeId}', ${idx})">
            <div class="rfc-main">
                <div class="rfc-header">
                    <div class="rfc-dot" style="background:${typeColor}"></div>
                    <div class="rfc-name">${name}</div>
                    <div class="rfc-chips">${chips}</div>
                    <div class="rfc-source-tag">${nodeName}</div>
                    <div class="rfc-edit-hint">Click to edit →</div>
                </div>
                ${desc ? `<div class="rfc-desc">${desc}</div>` : ''}
                ${transformation ? `<div class="rfc-transform">${transformation.length > 90 ? transformation.slice(0,90)+'…' : transformation}</div>` : ''}
                ${metaRows ? `<div class="rfc-meta">${metaRows}</div>` : ''}
                ${statChips ? `<div class="rfc-stats">${statChips}</div>` : ''}
                ${tags.length > 0 ? `<div class="rfc-tags">${tags.map(t=>`<span class="rfc-tag">#${t}</span>`).join('')}</div>` : ''}
            </div>
            ${qualityIndicator}
        </div>`;
    }

    _fbBindFilters() {
        const filters = document.getElementById('fbFilters');
        if (!filters) return;
        filters.addEventListener('click', e => {
            const pill = e.target.closest('.fb-pill');
            if (!pill) return;
            // Toggle active
            if (pill.dataset.filter === 'all') {
                filters.querySelectorAll('.fb-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            } else {
                filters.querySelector('.fb-pill-all')?.classList.remove('active');
                pill.classList.toggle('active');
            }
            this._fbFilter();
        });
    }

    _fbFilter() {
        const q = (document.getElementById('fbSearchInput')?.value || '').toLowerCase();
        const activeFilters = [...document.querySelectorAll('#fbFilters .fb-pill.active')]
            .filter(p => p.dataset.filter !== 'all')
            .map(p => ({ filter: p.dataset.filter, val: p.dataset.val }));
        const allActive = document.querySelector('#fbFilters .fb-pill-all.active') != null || activeFilters.length === 0;

        let visible = 0;
        document.querySelectorAll('#fbList .rfc').forEach(card => {
            // Text search
            const textMatch = !q || card.dataset.name.includes(q) ||
                card.dataset.type.toLowerCase().includes(q) ||
                card.dataset.owner.includes(q) ||
                card.dataset.tags.includes(q);

            // Filter match
            let filterMatch = allActive;
            if (!filterMatch) {
                filterMatch = activeFilters.every(({ filter, val }) => {
                    if (filter === 'type') return card.dataset.type === val;
                    if (filter === 'owner') return card.dataset.owner === val.toLowerCase();
                    if (filter === 'pii') return card.dataset.pii === 'true';
                    if (filter === 'serving') return card.dataset.online === 'true';
                    return true;
                });
            }

            const show = textMatch && filterMatch;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        const stats = document.getElementById('fbStats');
        if (stats) stats.textContent = `${visible} features`;
    }

    _highlightCanvasNodes(sourceNodeId, featName) {
        // Find the FV that owns this feature, plus any service that references that FV
        const highlightIds = new Set();
        highlightIds.add(sourceNodeId);
        this.nodes.nodes.forEach((n, nid) => {
            if (n.type === 'service' && Array.isArray(n.features)) {
                if (n.features.includes(sourceNodeId)) highlightIds.add(nid);
            }
        });
        this._featureHighlightIds = highlightIds;
    }

    _clearCanvasHighlight() {
        this._featureHighlightIds = null;
    }

        _showFbPopover(nodeId, idx, el) {
        // Same as _showFeatPopover but always appears to LEFT of panel
        this._showFeatPopover(nodeId, idx, el);
    }

    // Override showPanel to always show the ⚡ catalog button in node view
    _setupPanelForNode(node) {
        document.getElementById('panelFbHeader').style.display = 'none';
        document.getElementById('panelNodeHeader').style.display = '';
        // Show feature catalog button for any node
        const btn = document.getElementById('panelFeatCatalogBtn');
        if (btn) btn.style.display = '';
    }

// Make globally available for HTML onclick handlers

}
window.FeastDiagram = FeastDiagram;
