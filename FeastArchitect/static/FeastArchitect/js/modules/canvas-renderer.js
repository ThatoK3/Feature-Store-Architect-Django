/**
 * Canvas Renderer Module
 * 
 * Handles all HTML5 Canvas rendering operations including nodes, edges,
 * ports, tooltips, and the minimap visualization.
 * 
 * File: canvas-renderer.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/canvas-renderer.js
 * 
 * @module CanvasRenderer
 */

/**
 * Canvas rendering manager for the diagram
 * @class
 */
class CanvasRenderer {
    /**
     * Create renderer instance
     * @param {HTMLCanvasElement} canvas - Main canvas element
     * @param {Object} config - Configuration object with colors and dimensions
     */
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        
        // Viewport state
        this.scale = 1;
        this.offsetX = 50;
        this.offsetY = 50;
        
        // Animation state
        this.isAnimating = false;
        this.animationFrameId = null;
    }

    /**
     * Resize canvas to match container dimensions
     * @param {HTMLElement} container - Container element
     */
    resize(container) {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Clear canvas with background color
     * @param {string} bgColor - CSS color value
     */
    clear(bgColor) {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Apply current transform (translation and scale)
     */
    applyTransform() {
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
    }

    /**
     * Restore transform
     */
    restoreTransform() {
        this.ctx.restore();
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            y: (y - this.offsetY) / this.scale
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    worldToScreen(x, y) {
        return {
            x: x * this.scale + this.offsetX,
            y: y * this.scale + this.offsetY
        };
    }

    /**
     * Draw a rounded rectangle path
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number|Object} r - Corner radius or object with tl, tr, br, bl
     */
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

    /**
     * Draw a bezier curve edge between two points
     * @param {Object} start - Start point {x, y}
     * @param {Object} end - End point {x, y}
     * @param {boolean} isHighlighted - Whether edge is highlighted
     * @param {string} color - Edge color
     * @param {string} highlightColor - Highlight color
     */
    drawEdge(start, end, isHighlighted = false, color = 'rgba(148, 163, 184, 0.3)', highlightColor = '#f97316') {
        const dist = Math.abs(end.x - start.x);
        const cp1x = start.x + dist * 0.5;
        const cp1y = start.y;
        const cp2x = end.x - dist * 0.5;
        const cp2y = end.y;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);

        if (isHighlighted) {
            this.ctx.strokeStyle = highlightColor;
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = highlightColor;
            this.ctx.shadowBlur = 10;
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 0;
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Draw arrowhead
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
        this.ctx.strokeStyle = isHighlighted ? highlightColor : 'rgba(148, 163, 184, 0.4)';
        this.ctx.stroke();
    }

    /**
     * Draw a node on the canvas
     * @param {Object} node - Node data object
     * @param {boolean} isSelected - Whether node is selected
     * @param {boolean} isHovered - Whether node is hovered
     * @param {Object} colors - Color configuration for node type
     */
    drawNode(node, isSelected, isHovered, colors) {
        const width = this.config.nodeWidth;
        const height = this.config.nodeHeight;

        // Selection glow
        if (isSelected) {
            this.ctx.shadowColor = colors.bg;
            this.ctx.shadowBlur = 30;
        } else if (isHovered) {
            this.ctx.shadowColor = colors.bg;
            this.ctx.shadowBlur = 15;
        }

        // Node body with gradient
        const gradient = this.ctx.createLinearGradient(node.x, node.y, node.x, node.y + height);
        const bgPrimary = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim();
        gradient.addColorStop(0, bgPrimary);
        gradient.addColorStop(1, getComputedStyle(document.body).getPropertyValue('--bg-primary').trim());

        this.ctx.fillStyle = gradient;
        this.roundRect(node.x, node.y, width, height, 12);
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = isSelected ? colors.bg : getComputedStyle(document.body).getPropertyValue('--border-color').trim();
        this.ctx.lineWidth = isSelected ? 3 : 1;
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Header bar
        this.ctx.fillStyle = colors.bg;
        this.roundRect(node.x, node.y, width, 32, { tl: 12, tr: 12, bl: 0, br: 0 });
        this.ctx.fill();

        // Icon and title
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(colors.icon, node.x + 12, node.y + 24);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Inter, sans-serif';
        const title = truncateText(node.name, 22);
        this.ctx.fillText(title, node.x + 36, node.y + 22);
    }

    /**
     * Draw connection port (input or output)
     * @param {Object} pos - Port position {x, y}
     * @param {string} bgColor - Background color for port
     */
    drawPort(pos, bgColor) {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.config.portRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = bgColor;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    /**
     * Draw selection indicator around node
     * @param {Object} node - Node to highlight
     * @param {string} color - Selection color
     */
    drawSelectionIndicator(node, color) {
        const width = this.config.nodeWidth;
        const height = this.config.nodeHeight;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.roundRect(node.x - 8, node.y - 8, width + 16, height + 16, 16);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Render minimap visualization
     * @param {HTMLCanvasElement} miniMapCanvas - Minimap canvas element
     * @param {Map} nodes - Map of all nodes
     * @param {Array} edges - Array of all edges
     * @param {Object} bounds - Diagram bounds {minX, minY, width, height}
     * @param {string} theme - Current theme ('dark' or 'light')
     */
    renderMiniMap(miniMapCanvas, nodes, edges, bounds, theme) {
        const ctx = miniMapCanvas.getContext('2d');
        const mapWidth = 200;
        const mapHeight = 150;

        const scaleX = mapWidth / bounds.width;
        const scaleY = mapHeight / bounds.height;
        const scale = Math.min(scaleX, scaleY) * 0.9;

        ctx.clearRect(0, 0, mapWidth, mapHeight);

        // Background
        ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, mapWidth, mapHeight);

        ctx.save();
        ctx.translate(
            (mapWidth - bounds.width * scale) / 2 - bounds.minX * scale,
            (mapHeight - bounds.height * scale) / 2 - bounds.minY * scale
        );
        ctx.scale(scale, scale);

        // Draw edges
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 2 / scale;
        edges.forEach(edge => {
            const from = nodes.get(edge.from);
            const to = nodes.get(edge.to);
            if (!from || !to) return;

            ctx.beginPath();
            ctx.moveTo(from.x + this.config.nodeWidth / 2, from.y + this.config.nodeHeight / 2);
            ctx.lineTo(to.x + this.config.nodeWidth / 2, to.y + this.config.nodeHeight / 2);
            ctx.stroke();
        });

        // Draw nodes
        nodes.forEach(node => {
            const config = this.config.colors[node.type];
            ctx.fillStyle = config.bg;
            ctx.fillRect(node.x, node.y, this.config.nodeWidth, this.config.nodeHeight);
        });

        ctx.restore();

        // Viewport indicator
        const vpX = (-this.offsetX / this.scale - bounds.minX) * scale + (mapWidth - bounds.width * scale) / 2;
        const vpY = (-this.offsetY / this.scale - bounds.minY) * scale + (mapHeight - bounds.height * scale) / 2;
        const vpW = (this.width / this.scale) * scale;
        const vpH = (this.height / this.scale) * scale;

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
    }





    /**
     * Setup minimap canvas and interactions
     * @param {Function} getBounds - Callback to get diagram bounds
     */
    setupMiniMap(getBounds) {
        this.miniMapCanvas = document.getElementById('miniMapCanvas');
        this.miniMapCtx = this.miniMapCanvas.getContext('2d');
        this.miniMapContainer = document.getElementById('miniMap');
        
        if (!this.miniMapCanvas) {
            console.warn('Minimap canvas not found');
            return;
        }
        
        this.miniMapCanvas.width = 200;
        this.miniMapCanvas.height = 150;
        
        // Store bounds getter for click handler
        this._getBounds = getBounds;
        
        this.miniMapCanvas.addEventListener('click', (e) => {
            const rect = this.miniMapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const bounds = this._getBounds ? this._getBounds() : {
                minX: 0, minY: 0, width: 1000, height: 800
            };
            
            const scaleX = 200 / (bounds.width + 400);
            const scaleY = 150 / (bounds.height + 400);
            const scale = Math.min(scaleX, scaleY);
            
            const worldX = (x / scale) - 200 + bounds.minX;
            const worldY = (y / scale) - 150 + bounds.minY;
            
            this.offsetX = (this.width / 2) - (worldX * this.scale);
            this.offsetY = (this.height / 2) - (worldY * this.scale);
        });
    }    





    /**
     * Animate viewport to target position and scale
     * @param {number} targetScale - Target zoom level
     * @param {number} targetOffsetX - Target X offset
     * @param {number} targetOffsetY - Target Y offset
     * @param {number} duration - Animation duration in ms
     */
    animateTo(targetScale, targetOffsetX, targetOffsetY, duration = 500) {
        const startScale = this.scale;
        const startOffsetX = this.offsetX;
        const startOffsetY = this.offsetY;
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}
