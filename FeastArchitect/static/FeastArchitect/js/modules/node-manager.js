/**
 * Node Manager Module
 * 
 * Handles all node lifecycle operations including creation, updates,
 * deletion, and relationship management (edges/connections).
 * 
 * File: node-manager.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/node-manager.js
 * 
 * @module NodeManager
 */

/**
 * Manages node creation, updates, and deletion
 * @class
 */
class NodeManager {
    /**
     * Create node manager instance
     * @param {Object} config - Application configuration
     * @param {Object} databaseTypes - Database type definitions
     */
    constructor(config, databaseTypes) {
        this.config = config;
        this.databaseTypes = databaseTypes;
        
        /**
         * Map of all nodes by ID
         * @type {Map<string, Object>}
         */
        this.nodes = new Map();
        
        /**
         * Array of all edges/connections
         * @type {Array<Object>}
         */
        this.edges = [];
        
        /**
         * ID counters for each node type
         * @type {Object}
         */
        this.counters = {
            datasource: 0,
            entity: 0,
            featureview: 0,
            service: 0
        };
    }

    /**
     * Generate unique node ID
     * @param {string} type - Node type
     * @returns {string} Unique ID
     */
    generateId(type) {
        this.counters[type]++;
        return `${type}_${this.counters[type]}`;
    }

    /**
     * Add a new data source node
     * @param {Object} config - Node configuration
     * @returns {string} New node ID
     */
    addDataSource(config) {
        const id = this.generateId('datasource');
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
            ownedBy: config.ownedBy || 'Data Platform Team',
            accessProcess: config.accessProcess || dbType.defaultProcess,
            details: config.details || {},
            x: config.x || 100,
            y: config.y || 100,
            inputs: [],
            outputs: [],
            createdAt: new Date().toISOString(),
            debeziumAvailable: dbType.debezium,
            sparkPattern: dbType.sparkPattern,
            columnSecurity: config.columnSecurity || generateDefaultColumnSecurity()
        };

        this.nodes.set(id, node);
        return id;
    }

    /**
     * Add a new entity node
     * @param {Object} config - Node configuration
     * @returns {string} New node ID
     */
    addEntity(config) {
        const id = this.generateId('entity');
        
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
        return id;
    }

    /**
     * Add a new feature view node
     * @param {Object} config - Node configuration
     * @returns {string} New node ID
     */
    addFeatureView(config) {
        const id = this.generateId('featureview');
        
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

        // Auto-connect to entities
        if (config.entities) {
            config.entities.forEach(entityId => {
                if (this.nodes.has(entityId)) {
                    this.addConnection(entityId, id);
                }
            });
        }

        return id;
    }

    /**
     * Add a new feature service node
     * @param {Object} config - Node configuration
     * @returns {string} New node ID
     */
    addService(config) {
        const id = this.generateId('service');
        
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

        // Auto-connect to feature views and services
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

        return id;
    }

    /**
     * Create a connection/edge between two nodes
     * @param {string} fromId - Source node ID
     * @param {string} toId - Target node ID
     * @returns {boolean} Whether connection was created
     */
    addConnection(fromId, toId) {
        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return false;
        
        // Check for duplicates
        const exists = this.edges.some(e => e.from === fromId && e.to === toId);
        if (exists) return false;

        const edge = {
            from: fromId,
            to: toId,
            id: `${fromId}->${toId}`,
            animated: false
        };

        this.edges.push(edge);

        // Update node input/output references
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);
        
        if (fromNode) fromNode.outputs.push(toId);
        if (toNode) toNode.inputs.push(fromId);

        return true;
    }

    /**
     * Remove a node and all its connections
     * @param {string} id - Node ID to remove
     */
    removeNode(id) {
        const nodeToRemove = this.nodes.get(id);
        if (!nodeToRemove) return;

        // Remove all edges connected to this node
        this.edges = this.edges.filter(e => e.from !== id && e.to !== id);

        // Remove references from other nodes
        this.nodes.forEach(node => {
            node.inputs = node.inputs.filter(i => i !== id);
            node.outputs = node.outputs.filter(o => o !== id);
        });

        // Remove from entity/feature references
        this.nodes.forEach(node => {
            if (node.type === 'featureview') {
                node.entities = node.entities.filter(e => e !== id);
            }
            if (node.type === 'service') {
                node.features = node.features.filter(f => f !== id);
                node.featureServices = node.featureServices.filter(f => f !== id);
            }
        });

        this.nodes.delete(id);
    }

    /**
     * Remove a specific edge/connection
     * @param {string} edgeId - Edge ID to remove
     */
    removeEdge(edgeId) {
        const edgeIndex = this.edges.findIndex(e => e.id === edgeId);
        if (edgeIndex === -1) return;

        const edge = this.edges[edgeIndex];
        this.edges.splice(edgeIndex, 1);

        // Update node references
        const fromNode = this.nodes.get(edge.from);
        const toNode = this.nodes.get(edge.to);

        if (fromNode) {
            fromNode.outputs = fromNode.outputs.filter(o => o !== edge.to);
        }
        if (toNode) {
            toNode.inputs = toNode.inputs.filter(i => i !== edge.from);
        }

        // Update entity/feature references
        if (toNode && toNode.type === 'featureview') {
            toNode.entities = toNode.entities.filter(e => e !== edge.from);
        }
        if (toNode && toNode.type === 'service') {
            toNode.features = toNode.features.filter(f => f !== edge.from);
            if (toNode.featureServices) {
                toNode.featureServices = toNode.featureServices.filter(f => f !== edge.from);
            }
        }
    }

    /**
     * Update an existing node's properties
     * @param {string} id - Node ID
     * @param {Object} updates - Properties to update
     * @returns {boolean} Whether update was successful
     */
    updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (!node) return false;

        Object.assign(node, updates);
        return true;
    }

    /**
     * Get all nodes of a specific type
     * @param {string} type - Node type filter
     * @returns {Array<Object>} Array of matching nodes
     */
    getNodesByType(type) {
        return Array.from(this.nodes.values()).filter(n => n.type === type);
    }

    /**
     * Calculate diagram bounds
     * @returns {Object} Bounds {minX, minY, width, height}
     */
    getBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
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

    /**
     * Count how many feature views use a specific entity
     * @param {string} entityId - Entity node ID
     * @returns {number} Count of feature views using this entity
     */
    getUsedByCount(entityId) {
        let count = 0;
        this.nodes.forEach(node => {
            if (node.type === 'featureview' && node.entities.includes(entityId)) {
                count++;
            }
        });
        return count;
    }

    /**
     * Get port position for a node (input or output)
     * @param {Object} node - Node object
     * @param {string} type - 'input' or 'output'
     * @returns {Object} Port position {x, y}
     */
    getPortPosition(node, type) {
        const { nodeWidth, nodeHeight } = this.config;
        if (type === 'input') {
            return { x: node.x, y: node.y + nodeHeight / 2 };
        } else {
            return { x: node.x + nodeWidth, y: node.y + nodeHeight / 2 };
        }
    }

    /**
     * Clear all nodes and edges
     */
    clear() {
        this.nodes.clear();
        this.edges = [];
        this.counters = { datasource: 0, entity: 0, featureview: 0, service: 0 };
    }

    /**
     * Import nodes and edges from JSON data
     * @param {Object} data - Import data with nodes and edges
     */
    importFromJSON(data) {
        if (!data) return;

        this.clear();

        // Import nodes
        if (data.nodes) {
            const nodeEntries = Array.isArray(data.nodes) ? data.nodes : Object.entries(data.nodes);
            nodeEntries.forEach(([id, node]) => {
                this.nodes.set(id, node);
                
                // Update counters
                const type = node.type;
                if (this.counters[type] !== undefined) {
                    const num = parseInt(id.split('_').pop()) || 0;
                    if (num > this.counters[type]) {
                        this.counters[type] = num;
                    }
                }
            });
        }

        // Import edges
        if (data.edges) {
            this.edges = data.edges.filter(edge => {
                return this.nodes.has(edge.from) && this.nodes.has(edge.to);
            });

            // Rebuild inputs/outputs
            this.nodes.forEach(node => {
                node.inputs = [];
                node.outputs = [];
            });

            this.edges.forEach(edge => {
                const fromNode = this.nodes.get(edge.from);
                const toNode = this.nodes.get(edge.to);
                if (fromNode && toNode) {
                    fromNode.outputs.push(edge.to);
                    toNode.inputs.push(edge.from);
                }
            });
        }
    }

    /**
     * Export nodes and edges to JSON format
     * @returns {Object} Export data
     */
    exportToJSON() {
        return {
            nodes: Array.from(this.nodes.entries()),
            edges: this.edges,
            exportDate: new Date().toISOString(),
            version: '3.0'
        };
    }

    // Map proxy methods - allow FeastDiagram to use this.nodes like a Map
    get(id) { return this.nodes.get(id); }
    has(id) { return this.nodes.has(id); }
    set(id, node) { return this.nodes.set(id, node); }
    forEach(fn) { return this.nodes.forEach(fn); }
    values() { return this.nodes.values(); }
    keys() { return this.nodes.keys(); }
    entries() { return this.nodes.entries(); }
    get size() { return this.nodes.size; }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeManager;
}
