/**
 * Utility Functions Module
 * 
 * Provides common utility functions used throughout the application
 * including text truncation, regex escaping, and coordinate transformations.
 * 
 * File: utils.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/utils.js
 * 
 * @module Utils
 */

/**
 * Truncate text to specified maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLen - Maximum allowed length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} Escaped string safe for regex use
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight matching text with HTML span tags
 * @param {string} text - Original text
 * @param {string} query - Query string to highlight
 * @returns {string} HTML with highlighted matches
 */
function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * Get color for feature view subtype
 * @param {string} subtype - Feature view subtype (batch, stream, on_demand)
 * @returns {string} Hex color code
 */
function getSubtypeColor(subtype) {
    const colors = {
        batch: '#10b981',
        stream: '#f59e0b',
        on_demand: '#ec4899'
    };
    return colors[subtype] || '#64748b';
}

/**
 * Calculate permission level for a datasource based on ownership
 * @param {Object} datasource - Datasource node object
 * @param {Object} currentUser - Current user object
 * @returns {string} Permission level: 'owned', 'granted', 'pending', or 'denied'
 */
function calculatePermission(datasource, currentUser) {
    if (datasource.ownedBy === currentUser.team || 
        datasource.ownedBy === currentUser.name) {
        return 'owned';
    }
    // Simulate permission logic based on name hash
    const hash = datasource.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const perms = ['granted', 'granted', 'pending', 'denied'];
    return perms[hash % perms.length];
}

/**
 * Generate default column security configuration
 * @returns {Object} Column security object with PII, masked, and restricted columns
 */
function generateDefaultColumnSecurity() {
    return {
        piiColumns: ['email', 'phone', 'ssn', 'address', 'name'],
        maskedColumns: ['email', 'phone'],
        restrictedColumns: ['ssn', 'salary']
    };
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between executions
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to locale string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generate a unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID string
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse connection string to extract components
 * @param {string} connection - Connection string (e.g., "host:port/db")
 * @returns {Object} Parsed components {host, port, database}
 */
function parseConnectionString(connection) {
    if (!connection) return { host: '', port: '', database: '' };
    
    const parts = connection.split('://');
    const uri = parts.length > 1 ? parts[1] : connection;
    const [hostPort, db] = uri.split('/');
    const [host, port] = hostPort.split(':');
    
    return {
        host: host || '',
        port: port || '',
        database: db || ''
    };
}

/**
 * Export utility functions
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        truncateText,
        escapeRegex,
        highlightText,
        getSubtypeColor,
        calculatePermission,
        generateDefaultColumnSecurity,
        deepClone,
        debounce,
        throttle,
        formatDate,
        formatNumber,
        generateId,
        parseConnectionString
    };
}
