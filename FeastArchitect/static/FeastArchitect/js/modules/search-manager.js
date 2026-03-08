/**
 * Search Manager Module
 * 
 * Handles all search functionality including indexing, querying,
 * result grouping, and highlighting.
 * 
 * File: search-manager.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/search-manager.js
 * 
 * @module SearchManager
 */

/**
 * Manages search functionality across diagram nodes
 * @class
 */
class SearchManager {
    /**
     * Create search manager instance
     * @param {Object} config - Search configuration
     */
    constructor(config = {}) {
        /**
         * Search settings
         * @type {Object}
         */
        this.settings = {
            descriptions: true,
            tags: true,
            usedBy: true,
            access: true,
            ...config
        };
        
        /**
         * Last search results
         * @type {Array}
         */
        this.lastResults = [];
        
        /**
         * Current search query
         * @type {string}
         */
        this.currentQuery = '';
    }

    /**
     * Update search setting
     * @param {string} setting - Setting name
     * @param {boolean} value - New value
     */
    setSetting(setting, value) {
        if (this.settings.hasOwnProperty(setting)) {
            this.settings[setting] = value;
        }
    }

    /**
     * Toggle search setting
     * @param {string} setting - Setting name
     * @returns {boolean} New value
     */
    toggleSetting(setting) {
        if (this.settings.hasOwnProperty(setting)) {
            this.settings[setting] = !this.settings[setting];
            return this.settings[setting];
        }
        return false;
    }

    /**
     * Perform search across all nodes
     * @param {string} query - Search query
     * @param {Map} nodes - All diagram nodes
     * @returns {Object} Grouped search results
     */
    search(query, nodes) {
        this.currentQuery = query.toLowerCase().trim();
        
        if (!this.currentQuery) {
            this.lastResults = [];
            return this.groupResults([]);
        }

        const results = [];
        
        nodes.forEach((node, id) => {
            // Search node name
            if (node.name.toLowerCase().includes(this.currentQuery)) {
                results.push({
                    type: 'node',
                    nodeType: node.type,
                    id: id,
                    name: node.name,
                    matchType: 'name',
                    matchText: node.name
                });
            }
            
            // Search descriptions
            if (this.settings.descriptions && node.description && 
                node.description.toLowerCase().includes(this.currentQuery)) {
                results.push({
                    type: 'node',
                    nodeType: node.type,
                    id: id,
                    name: node.name,
                    matchType: 'description',
                    matchText: node.description
                });
            }
            
            // Search tags
            if (this.settings.tags && node.tags) {
                node.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(this.currentQuery)) {
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
            
            // Search features (for feature views)
            if (node.type === 'featureview' && node.features) {
                node.features.forEach(feature => {
                    const featureName = typeof feature === 'string' ? feature : feature.name;
                    if (featureName.toLowerCase().includes(this.currentQuery)) {
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
            
            // Search usedBy applications
            if (this.settings.usedBy && node.details?.usedBy) {
                node.details.usedBy.forEach(app => {
                    const appName = typeof app === 'string' ? app : app.name;
                    if (appName.toLowerCase().includes(this.currentQuery)) {
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
            
            // Search access process
            if (this.settings.access && node.accessProcess && 
                node.accessProcess.toLowerCase().includes(this.currentQuery)) {
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
        
        this.lastResults = results;
        return this.groupResults(results);
    }

    /**
     * Group search results by category
     * @param {Array} results - Raw search results
     * @returns {Object} Grouped results
     */
    groupResults(results) {
        const grouped = {
            featureview: [],
            feature: [],
            entity: [],
            service: [],
            datasource: []
        };
        
        results.forEach(result => {
            // Limit to 5 per category
            if (result.nodeType === 'featureview' && grouped.featureview.length < 5) {
                grouped.featureview.push(result);
            } else if (result.nodeType === 'feature' && grouped.feature.length < 5) {
                grouped.feature.push(result);
            } else if (result.nodeType === 'entity' && grouped.entity.length < 5) {
                grouped.entity.push(result);
            } else if (result.nodeType === 'service' && grouped.service.length < 5) {
                grouped.service.push(result);
            } else if (result.nodeType === 'datasource' && grouped.datasource.length < 5) {
                grouped.datasource.push(result);
            }
        });
        
        return grouped;
    }

    /**
     * Render search results as HTML
     * @param {Object} groupedResults - Grouped results from groupResults()
     * @param {string} query - Original search query
     * @param {Object} colors - Node color configuration
     * @returns {string} HTML string
     */
    renderResults(groupedResults, query, colors) {
        const categories = [
            { key: 'featureview', label: 'Feature Views', icon: '📊', color: '#10b981' },
            { key: 'feature', label: 'Features', icon: '⚡', color: '#06b6d4' },
            { key: 'entity', label: 'Entities', icon: '👤', color: '#8b5cf6' },
            { key: 'service', label: 'Services', icon: '🚀', color: '#f97316' },
            { key: 'datasource', label: 'Data Sources', icon: '🗄️', color: '#3b82f6' }
        ];
        
        let html = '';
        
        categories.forEach(cat => {
            const items = groupedResults[cat.key];
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
                    const metaText = this.getResultMeta(item);
                    
                    html += `
                        <div class="search-result-item" data-node-id="${item.id}" data-result-type="${item.type}">
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
        
        if (html === '') {
            html = '<div class="search-no-results">No results found</div>';
        }
        
        return html;
    }

    /**
     * Get metadata text for search result
     * @param {Object} item - Search result item
     * @returns {string} Metadata description
     */
    getResultMeta(item) {
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
        return 'Node';
    }

    /**
     * Highlight matching text in search results
     * @param {string} text - Original text
     * @param {string} query - Query to highlight
     * @returns {string} HTML with highlighted matches
     */
    highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Clear current search
     */
    clear() {
        this.currentQuery = '';
        this.lastResults = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}
