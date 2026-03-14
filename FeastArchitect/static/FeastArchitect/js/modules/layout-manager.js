/**
 * Layout Manager Module
 * 
 * Handles automatic node positioning, layout algorithms,
 * and viewport management.
 * 
 * File: layout-manager.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/layout-manager.js
 * 
 * @module LayoutManager
 */

/**
 * Manages diagram layout and node positioning
 * @class
 */
class LayoutManager {
    /**
     * Create layout manager instance
     * @param {Object} config - Layout configuration
     */
    constructor(config = {}) {
        this.config = {
            colWidth: 340,
            rowHeight: 140,
            startX: 120,
            startY: 120,
            padding: 100,
            ...config
        };
    }

    /**
     * Perform auto-layout of all nodes
     * @param {Map} nodes - All diagram nodes
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    autoLayout(nodes, canvasWidth, canvasHeight) {
        // Group nodes by type into columns
        const columns = {
            datasource: [],
            entity: [],
            featureview: [],
            service: []
        };
        
        nodes.forEach((node, id) => {
            if (columns[node.type]) {
                columns[node.type].push({ id, ...node });
            }
        });
        
        // Sort each column by connection count (most connected first)
        const sortByConnections = (items) => {
            return items.sort((a, b) => {
                return (b.inputs.length + b.outputs.length) - 
                       (a.inputs.length + a.outputs.length);
            });
        };
        
        let colIndex = 0;
        const positions = new Map();
        
        // Position nodes in columns
        ['datasource', 'entity', 'featureview', 'service'].forEach(type => {
            let items = columns[type];
            if (items.length === 0) return;
            
            items = sortByConnections(items);
            
            const colX = this.config.startX + colIndex * this.config.colWidth;
            const totalHeight = items.length * this.config.rowHeight;
            const startColY = Math.max(this.config.startY, (canvasHeight - totalHeight) / 2);
            
            items.forEach((item, idx) => {
                positions.set(item.id, {
                    x: colX,
                    y: startColY + idx * this.config.rowHeight
                });
            });
            
            colIndex++;
        });
        
        return positions;
    }

    /**
     * Animate nodes to target positions
     * @param {Map} nodes - All nodes to animate
     * @param {Map} targetPositions - Map of node IDs to target {x, y}
     * @param {number} duration - Animation duration in ms
     */
    animateNodes(nodes, targetPositions, duration = 600) {
        const animations = [];
        
        targetPositions.forEach((pos, id) => {
            const node = nodes.get(id);
            if (!node) return;
            
            animations.push(this.animateNode(node, pos.x, pos.y, duration));
        });
        
        return Promise.all(animations);
    }

    /**
     * Animate single node to position
     * @param {Object} node - Node to animate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} duration - Animation duration
     * @returns {Promise} Resolves when animation completes
     */
    animateNode(node, targetX, targetY, duration) {
        const startX = node.x;
        const startY = node.y;
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                
                node.x = startX + (targetX - startX) * eased;
                node.y = startY + (targetY - startY) * eased;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * Calculate diagram bounds
     * @param {Map} nodes - All nodes
     * @param {Object} nodeDimensions - {nodeWidth, nodeHeight}
     * @returns {Object} Bounds {minX, minY, maxX, maxY, width, height}
     */
    calculateBounds(nodes, nodeDimensions) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + nodeDimensions.nodeWidth);
            maxY = Math.max(maxY, node.y + nodeDimensions.nodeHeight);
        });
        
        if (minX === Infinity) {
            return { minX: 0, minY: 0, maxX: 1000, maxY: 800, width: 1000, height: 800 };
        }
        
        return {
            minX: minX - this.config.padding,
            minY: minY - this.config.padding,
            maxX: maxX + this.config.padding,
            maxY: maxY + this.config.padding,
            width: maxX - minX + (this.config.padding * 2),
            height: maxY - minY + (this.config.padding * 2)
        };
    }

    /**
     * Calculate fit viewport transform
     * @param {Object} bounds - Diagram bounds
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {Object} Transform {scale, offsetX, offsetY}
     */
    calculateFitTransform(bounds, canvasWidth, canvasHeight) {
        const padding = this.config.padding;
        
        const scaleX = (canvasWidth - padding * 2) / bounds.width;
        const scaleY = (canvasHeight - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, 1.5);
        
        const offsetX = (canvasWidth - bounds.width * scale) / 2 - bounds.minX * scale;
        const offsetY = (canvasHeight - bounds.height * scale) / 2 - bounds.minY * scale;
        
        return { scale, offsetX, offsetY };
    }

    /**
     * Calculate center-on-node transform
     * @param {Object} node - Node to center on
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {Object} nodeDimensions - Node dimensions
     * @param {number} [targetScale=1.5] - Target zoom level
     * @returns {Object} Transform {scale, offsetX, offsetY}
     */
    calculateCenterTransform(node, canvasWidth, canvasHeight, nodeDimensions, targetScale = 1.5) {
        const offsetX = (canvasWidth / 2) - (node.x + nodeDimensions.nodeWidth / 2) * targetScale;
        const offsetY = (canvasHeight / 2) - (node.y + nodeDimensions.nodeHeight / 2) * targetScale;
        
        return { scale: targetScale, offsetX, offsetY };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutManager;
}
