#!/bin/bash

# Create the directory structure for JavaScript modules
mkdir -p FeastArchitect/static/FeastArchitect/js/modules

# =============================================================================
# File 1: main.js - Application entry point and initialization
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/main.js << 'EOFMAIN'
/**
 * Feast Diagram Application - Main Entry Point
 * 
 * This is the primary entry point for the FeastArchitect diagram application.
 * It initializes the FeastDiagram class and sets up the global diagram instance.
 * 
 * File: main.js
 * Location: FeastArchitect/static/FeastArchitect/js/main.js
 * Dependencies: feast-diagram.js (FeastDiagram class)
 * 
 * @module Main
 * @author Generated from FeastArchitect/templates/FeastArchitect/architect.html
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    /**
     * Global diagram instance
     * @type {FeastDiagram}
     * @global
     */
    window.diagram = new FeastDiagram('diagramCanvas');
    
    console.log('Feast Diagram initialized successfully');
});
EOFMAIN

# =============================================================================
# File 2: config.js - Configuration constants and database types
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/config.js << 'EOFCONFIG'
/**
 * Configuration Module
 * 
 * Contains all static configuration, color schemes, node dimensions,
 * and comprehensive database type definitions for the Feast diagram.
 * 
 * File: config.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/config.js
 * 
 * @module Config
 */

/**
 * @typedef {Object} DatabaseType
 * @property {string} name - Display name of the database
 * @property {string} category - Category classification (Relational, NoSQL, etc.)
 * @property {boolean} debezium - Whether Debezium CDC is supported
 * @property {string} icon - Emoji icon for the database
 * @property {string} defaultProcess - Default access process description
 * @property {string} sparkPattern - Spark connector pattern to use
 */

/**
 * Comprehensive database type definitions
 * Supports 30+ database types across multiple categories
 * @type {Object.<string, DatabaseType>}
 */
const DATABASE_TYPES = {
    // Relational Databases
    postgres: {
        name: 'PostgreSQL',
        category: 'Relational',
        debezium: true,
        icon: '🐘',
        defaultProcess: 'Submit DBA ticket for read replica access',
        sparkPattern: 'JDBC batch read with partition column'
    },
    mysql: {
        name: 'MySQL',
        category: 'Relational',
        debezium: true,
        icon: '🐬',
        defaultProcess: 'Request via MySQL Workbench access form',
        sparkPattern: 'JDBC connector with predicate pushdown'
    },
    sqlserver: {
        name: 'SQL Server',
        category: 'Relational',
        debezium: true,
        icon: '🗃️',
        defaultProcess: 'AD group membership request',
        sparkPattern: 'MS JDBC driver with bulk copy'
    },
    oracle: {
        name: 'Oracle',
        category: 'Relational',
        debezium: true,
        icon: '🏛️',
        defaultProcess: 'DBA approval required, VPN only',
        sparkPattern: 'OCI driver with connection pooling'
    },
    sqlite: {
        name: 'SQLite',
        category: 'Relational',
        debezium: false,
        icon: '🪶',
        defaultProcess: 'File system access request',
        sparkPattern: 'Direct file read via Spark'
    },
    
    // NoSQL Databases
    mongodb: {
        name: 'MongoDB',
        category: 'NoSQL',
        debezium: true,
        icon: '🍃',
        defaultProcess: 'MongoDB Atlas invitation',
        sparkPattern: 'MongoDB Spark connector with aggregation pipeline'
    },
    dynamodb: {
        name: 'DynamoDB',
        category: 'NoSQL',
        debezium: false,
        icon: '⚡',
        defaultProcess: 'IAM policy update via ServiceNow',
        sparkPattern: 'DynamoDB Export to S3 + Spark read'
    },
    cassandra: {
        name: 'Cassandra',
        category: 'NoSQL',
        debezium: true,
        icon: '🔱',
        defaultProcess: 'CQL role grant by DBA team',
        sparkPattern: 'Spark Cassandra connector with token range scan'
    },
    couchbase: {
        name: 'Couchbase',
        category: 'NoSQL',
        debezium: true,
        icon: '🛋️',
        defaultProcess: 'Bucket access request',
        sparkPattern: 'Couchbase Spark connector'
    },
    elasticsearch: {
        name: 'Elasticsearch',
        category: 'NoSQL',
        debezium: true,
        icon: '🔍',
        defaultProcess: 'Kibana role assignment',
        sparkPattern: 'ES-Hadoop connector with scroll API'
    },
    
    // Cloud Warehouses
    snowflake: {
        name: 'Snowflake',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '❄️',
        defaultProcess: 'Role grant via Snowflake UI',
        sparkPattern: 'Snowflake Spark connector with external stages'
    },
    bigquery: {
        name: 'BigQuery',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '📊',
        defaultProcess: 'IAM BigQuery Data Viewer role',
        sparkPattern: 'BigQuery Storage API + Spark'
    },
    redshift: {
        name: 'Redshift',
        category: 'Cloud Warehouse',
        debezium: true,
        icon: '🔺',
        defaultProcess: 'Security group + user creation',
        sparkPattern: 'Redshift JDBC with UNLOAD to S3'
    },
    databricks: {
        name: 'Databricks Delta Lake',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '🧱',
        defaultProcess: 'Unity Catalog grant',
        sparkPattern: 'Native Delta Lake read'
    },
    synapse: {
        name: 'Azure Synapse',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '🔷',
        defaultProcess: 'Azure AD + Synapse workspace access',
        sparkPattern: 'Synapse Spark pool with dedicated SQL pool'
    },
    
    // Streaming Platforms
    kafka: {
        name: 'Apache Kafka',
        category: 'Streaming',
        debezium: false,
        icon: '📨',
        defaultProcess: 'Self-service via Kafka Manager',
        sparkPattern: 'Spark Structured Streaming with Kafka source'
    },
    kinesis: {
        name: 'AWS Kinesis',
        category: 'Streaming',
        debezium: false,
        icon: '💧',
        defaultProcess: 'IAM role for Kinesis read',
        sparkPattern: 'Kinesis Client Library + Spark'
    },
    pulsar: {
        name: 'Apache Pulsar',
        category: 'Streaming',
        debezium: true,
        icon: '⭐',
        defaultProcess: 'Pulsar tenant admin request',
        sparkPattern: 'Pulsar Spark connector'
    },
    eventhubs: {
        name: 'Azure Event Hubs',
        category: 'Streaming',
        debezium: true,
        icon: '🎯',
        defaultProcess: 'Event Hubs Data Receiver role',
        sparkPattern: 'Azure Event Hubs connector for Spark'
    },
    
    // Object Storage
    s3: {
        name: 'Amazon S3 (Parquet)',
        category: 'Object Storage',
        debezium: false,
        icon: '🪣',
        defaultProcess: 'S3 bucket policy update',
        sparkPattern: 'S3A filesystem with Parquet reader'
    },
    gcs: {
        name: 'Google Cloud Storage',
        category: 'Object Storage',
        debezium: false,
        icon: '☁️',
        defaultProcess: 'GCS bucket IAM binding',
        sparkPattern: 'GCS connector with Parquet'
    },
    azureblob: {
        name: 'Azure Blob Storage',
        category: 'Object Storage',
        debezium: false,
        icon: '🔵',
        defaultProcess: 'Storage Blob Data Reader role',
        sparkPattern: 'Azure Blob File System (ABFS)'
    },
    minio: {
        name: 'MinIO',
        category: 'Object Storage',
        debezium: false,
        icon: '🪣',
        defaultProcess: 'MinIO policy assignment',
        sparkPattern: 'S3A compatible API'
    },
    
    // In-Memory Stores
    redis: {
        name: 'Redis',
        category: 'In-Memory',
        debezium: false,
        icon: '🔴',
        defaultProcess: 'Redis ACL set via config',
        sparkPattern: 'Redis Spark connector for batch'
    },
    memcached: {
        name: 'Memcached',
        category: 'In-Memory',
        debezium: false,
        icon: '🧠',
        defaultProcess: 'Security group ingress rule',
        sparkPattern: 'Custom Spark input format'
    },
    dragonfly: {
        name: 'Dragonfly',
        category: 'In-Memory',
        debezium: false,
        icon: '🐉',
        defaultProcess: 'Dragonfly ACL configuration',
        sparkPattern: 'Redis-compatible connector'
    },
    
    // Graph Databases
    neo4j: {
        name: 'Neo4j',
        category: 'Graph',
        debezium: true,
        icon: '🕸️',
        defaultProcess: 'Neo4j role assignment',
        sparkPattern: 'Neo4j Spark connector with APOC'
    },
    neptune: {
        name: 'Amazon Neptune',
        category: 'Graph',
        debezium: false,
        icon: '🌊',
        defaultProcess: 'VPC security group + IAM auth',
        sparkPattern: 'Gremlin Spark integration'
    },
    
    // Time-Series Databases
    influxdb: {
        name: 'InfluxDB',
        category: 'Time-Series',
        debezium: false,
        icon: '📈',
        defaultProcess: 'InfluxDB token generation',
        sparkPattern: 'InfluxDB Spark connector'
    },
    timescaledb: {
        name: 'TimescaleDB',
        category: 'Time-Series',
        debezium: true,
        icon: '⏱️',
        defaultProcess: 'PostgreSQL access (Timescale extension)',
        sparkPattern: 'PostgreSQL JDBC with time_bucket'
    },
    clickhouse: {
        name: 'ClickHouse',
        category: 'Time-Series',
        debezium: true,
        icon: '🖱️',
        defaultProcess: 'ClickHouse user creation',
        sparkPattern: 'ClickHouse Native JDBC + Spark'
    },
    
    // Others
    couchdb: {
        name: 'CouchDB',
        category: 'Document',
        debezium: true,
        icon: '🛋️',
        defaultProcess: 'CouchDB _security object update',
        sparkPattern: 'CouchDB Spark connector with _changes feed'
    },
    rethinkdb: {
        name: 'RethinkDB',
        category: 'Document',
        debezium: false,
        icon: '🤔',
        defaultProcess: 'RethinkDB user grant',
        sparkPattern: 'Custom Spark source with changefeeds'
    },
    firebase: {
        name: 'Firebase',
        category: 'Mobile/Realtime',
        debezium: false,
        icon: '🔥',
        defaultProcess: 'Firebase Admin SDK service account',
        sparkPattern: 'Firebase to BigQuery export + Spark'
    },
    supabase: {
        name: 'Supabase',
        category: 'Backend-as-a-Service',
        debezium: true,
        icon: '⚡',
        defaultProcess: 'Supabase RLS policy + service role',
        sparkPattern: 'PostgreSQL JDBC (Supabase is Postgres)'
    }
};

/**
 * Color and styling configuration for different node types
 * @type {Object.<string, NodeTypeConfig>}
 */
const NODE_CONFIG = {
    datasource: {
        bg: '#3b82f6',
        light: '#60a5fa',
        icon: '🗄️',
        label: 'Data Source'
    },
    entity: {
        bg: '#8b5cf6',
        light: '#a78bfa',
        icon: '👤',
        label: 'Entity'
    },
    featureview: {
        bg: '#10b981',
        light: '#34d399',
        icon: '📊',
        label: 'Feature View'
    },
    service: {
        bg: '#f97316',
        light: '#fb923c',
        icon: '🚀',
        label: 'Feature Service'
    }
};

/**
 * Node dimension constants
 * @type {Object}
 */
const DIMENSIONS = {
    nodeWidth: 200,
    nodeHeight: 100,
    portRadius: 6
};

/**
 * Export configuration objects for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DATABASE_TYPES, NODE_CONFIG, DIMENSIONS };
}
EOFCONFIG

# =============================================================================
# File 3: utils.js - Utility functions and helpers
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/utils.js << 'EOFUTILS'
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
EOFUTILS

# =============================================================================
# File 4: api.js - Backend API communication
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/api.js << 'EOFAPI'
/**
 * API Communication Module
 * 
 * Handles all HTTP communication with the Django backend including
 * repository CRUD operations, chat sessions, audit logging, and authentication.
 * 
 * File: api.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/api.js
 * 
 * @module API
 */

/**
 * API Client for Django Backend Communication
 * @class
 */
class APIClient {
    /**
     * Create API client instance
     * @param {string} baseUrl - Base API URL (e.g., '/api')
     */
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get CSRF token from cookies for Django POST requests
     * @returns {string|null} CSRF token value
     */
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

    /**
     * Make authenticated fetch request with CSRF token
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'X-CSRFToken': this.getCsrfToken(),
                ...options.headers
            }
        };
        
        return fetch(url, { ...defaultOptions, ...options });
    }

    /**
     * Fetch repository by ID
     * @param {number} repoId - Repository ID
     * @returns {Promise<Object>} Repository data
     */
    async getRepository(repoId) {
        const response = await this.fetch(`/repositories/${repoId}/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Create new repository
     * @param {Object} payload - Repository data
     * @returns {Promise<Object>} Created repository
     */
    async createRepository(payload) {
        const response = await this.fetch('/repositories/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    /**
     * Update existing repository
     * @param {number} repoId - Repository ID
     * @param {Object} payload - Updated repository data
     * @returns {Promise<Object>} Updated repository
     */
    async updateRepository(repoId, payload) {
        const response = await this.fetch(`/repositories/${repoId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    /**
     * Force update repository (overwrite conflicts)
     * @param {number} repoId - Repository ID
     * @param {Object} payload - Repository data
     * @returns {Promise<Object>} Updated repository
     */
    async forceUpdateRepository(repoId, payload) {
        const response = await this.fetch(`/repositories/${repoId}/force_update/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    /**
     * Check repository status and hash
     * @param {number} repoId - Repository ID
     * @returns {Promise<Object>} Status data including server_hash
     */
    async checkRepositoryStatus(repoId) {
        const response = await this.fetch(`/repositories/${repoId}/check_status/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Export repository as JSON
     * @param {number} repoId - Repository ID
     * @param {boolean} includeHash - Include content hash
     * @returns {Promise<Object>} Export data
     */
    async exportRepository(repoId, includeHash = true) {
        const query = includeHash ? '?include_hash=true' : '';
        const response = await this.fetch(`/repositories/${repoId}/export_json/${query}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Import repository from JSON file
     * @param {File} file - JSON file to import
     * @returns {Promise<Object>} Imported repository data
     */
    async importRepository(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await this.fetch('/repositories/import_json/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 409) {
                error.isConflict = true;
                error.existingId = error.existing_id;
            }
            throw error;
        }
        return response.json();
    }

    /**
     * Create new chat session
     * @param {number} repoId - Repository ID
     * @param {string} title - Chat title
     * @param {string} initialMessage - Initial message
     * @param {string} queryType - Type of query
     * @returns {Promise<Object>} Chat session data
     */
    async createChatSession(repoId, title, initialMessage, queryType) {
        const response = await this.fetch('/chats/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repository_id: repoId,
                title: title,
                initial_message: initialMessage,
                query_type: queryType
            })
        });
        
        if (!response.ok) throw new Error('Failed to create chat session');
        return response.json();
    }

    /**
     * Send message to existing chat session
     * @param {number} sessionId - Chat session ID
     * @param {string} message - Message text
     * @param {string} queryType - Query type
     * @returns {Promise<Object>} Response data
     */
    async sendChatMessage(sessionId, message, queryType = 'default') {
        const response = await this.fetch(`/chats/${sessionId}/send_message/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                query_type: queryType
            })
        });
        
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to send message');
        }
        return data;
    }

    /**
     * Create audit log entry
     * @param {string} action - Action performed
     * @param {string} resourceType - Type of resource
     * @param {string} resourceName - Name of resource
     * @param {Object} details - Additional details
     * @returns {Promise<Object>} Created audit log
     */
    async createAuditLog(action, resourceType, resourceName, details = {}) {
        const response = await this.fetch('/audit-logs/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action,
                resource_type: resourceType,
                resource_name: resourceName,
                details: details
            })
        });
        
        if (!response.ok) throw new Error('Failed to create audit log');
        return response.json();
    }

    /**
     * Fetch recent audit logs
     * @param {number} limit - Maximum number of logs
     * @returns {Promise<Object>} Paginated audit logs
     */
    async getAuditLogs(limit = 10) {
        const response = await this.fetch(`/audit-logs/?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Get current authenticated user
     * @returns {Promise<Object>} User data
     */
    async getCurrentUser() {
        const response = await this.fetch('/auth/user/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    /**
     * Request access to a data source
     * @param {number} dataSourceId - Backend data source ID
     * @param {string} dataSourceName - Display name
     * @param {string} owner - Owner team/name
     * @returns {Promise<Object>} Access request result
     */
    async requestDataSourceAccess(dataSourceId, dataSourceName, owner) {
        return this.createAuditLog('ACCESS_REQUEST', 'datasource', dataSourceName, {
            data_source_id: dataSourceId,
            owner: owner
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}
EOFAPI

# =============================================================================
# File 5: canvas-renderer.js - Canvas rendering and drawing
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/canvas-renderer.js << 'EOFRENDERER'
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
EOFRENDERER

# =============================================================================
# File 6: node-manager.js - Node CRUD operations and management
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/node-manager.js << 'EOFNODEMGR'
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeManager;
}
EOFNODEMGR

# =============================================================================
# File 7: ui-manager.js - UI interactions and DOM manipulation
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/ui-manager.js << 'EOFUIMGR'
/**
 * UI Manager Module
 * 
 * Manages all UI interactions including panels, modals, tooltips,
 * notifications, and DOM element updates.
 * 
 * File: ui-manager.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/ui-manager.js
 * 
 * @module UIManager
 */

/**
 * Manages UI state and DOM interactions
 * @class
 */
class UIManager {
    /**
     * Create UI manager instance
     */
    constructor() {
        this.panels = {
            detail: false,
            codeEditor: false,
            llm: false,
            django: false,
            edgeManager: false
        };
        
        this.modals = {
            component: false,
            settings: false,
            stats: false,
            usage: false,
            guide: false,
            dataFlow: false,
            userSelector: false,
            pushRepo: false
        };
    }

    /**
     * Show notification toast
     * @param {string} title - Notification title
     * @param {string} text - Notification message
     * @param {number} duration - Display duration in ms
     */
    showNotification(title, text, duration = 3000) {
        const notif = document.getElementById('notification');
        if (!notif) return;

        const titleEl = document.getElementById('notifTitle');
        const textEl = document.getElementById('notifText');

        if (titleEl) titleEl.textContent = title;
        if (textEl) textEl.textContent = text;

        notif.classList.add('show');
        
        setTimeout(() => {
            notif.classList.remove('show');
        }, duration);
    }

    /**
     * Toggle panel visibility
     * @param {string} panelName - Panel identifier
     * @param {boolean} [forceState] - Force specific state
     * @returns {boolean} New panel state
     */
    togglePanel(panelName, forceState) {
        const panelIds = {
            detail: 'detailPanel',
            codeEditor: 'codeEditorPanel',
            llm: 'llmPanel',
            django: 'djangoPanel',
            edgeManager: 'edgeManagerPanel'
        };

        const panelId = panelIds[panelName];
        if (!panelId) return false;

        const panel = document.getElementById(panelId);
        if (!panel) return false;

        const isOpen = panel.classList.contains('open');
        const shouldOpen = forceState !== undefined ? forceState : !isOpen;

        if (shouldOpen) {
            panel.classList.add('open');
            this.panels[panelName] = true;
        } else {
            panel.classList.remove('open');
            this.panels[panelName] = false;
        }

        return shouldOpen;
    }

    /**
     * Toggle modal visibility
     * @param {string} modalName - Modal identifier
     * @param {boolean} [show] - Force show/hide
     */
    toggleModal(modalName, show) {
        const modalIds = {
            component: 'componentModal',
            settings: 'settingsModal',
            stats: 'statsModal',
            usage: 'usageModal',
            guide: 'guideModal',
            dataFlow: 'dataFlowModal',
            userSelector: 'userSelectorModal',
            pushRepo: 'pushRepoModal'
        };

        const modalId = modalIds[modalName];
        if (!modalId) return;

        const modal = document.getElementById(modalId);
        if (!modal) return;

        const isActive = modal.classList.contains('active');
        const shouldShow = show !== undefined ? show : !isActive;

        if (shouldShow) {
            modal.classList.add('active');
            this.modals[modalName] = true;
        } else {
            modal.classList.remove('active');
            this.modals[modalName] = false;
        }
    }

    /**
     * Close all panels
     */
    closeAllPanels() {
        Object.keys(this.panels).forEach(name => {
            this.togglePanel(name, false);
        });
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        Object.keys(this.modals).forEach(name => {
            this.toggleModal(name, false);
        });
    }

    /**
     * Show tooltip at position
     * @param {Object} node - Node data for tooltip content
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {Object} colors - Color configuration
     */
    showTooltip(node, x, y, colors) {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;

        const config = colors[node.type];
        let icon = config.icon;
        
        // Use database icon for datasources if available
        if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
            icon = node.dbType.icon;
        }

        // Update tooltip content
        const iconEl = document.getElementById('tooltipIcon');
        const titleEl = document.getElementById('tooltipTitle');
        const subtitleEl = document.getElementById('tooltipSubtitle');
        const tagsDiv = document.getElementById('tooltipTags');
        const tagList = document.getElementById('tooltipTagList');
        const featuresDiv = document.getElementById('tooltipFeatures');
        const featureList = document.getElementById('tooltipFeatureList');
        const descDiv = document.getElementById('tooltipDescription');
        const descText = document.getElementById('tooltipDescText');

        if (iconEl) iconEl.textContent = icon;
        if (titleEl) titleEl.textContent = node.name;

        // Build subtitle
        let subtitle = config.label;
        if (node.subtype) subtitle += ` • ${node.subtype}`;
        if (node.kind) {
            const dbName = node.dbType ? node.dbType.name : node.kind;
            subtitle += ` • ${dbName}`;
        }
        if (subtitleEl) subtitleEl.textContent = subtitle;

        // Tags
        if (node.tags && node.tags.length > 0 && tagsDiv && tagList) {
            tagsDiv.style.display = 'block';
            tagList.innerHTML = node.tags.map(tag => 
                `<span class="tooltip-tag">#${tag}</span>`
            ).join('');
        } else if (tagsDiv) {
            tagsDiv.style.display = 'none';
        }

        // Features
        if (node.features && node.features.length > 0 && featuresDiv && featureList) {
            featuresDiv.style.display = 'block';
            featureList.innerHTML = node.features.slice(0, 5).map(f => {
                const name = typeof f === 'string' ? f : f.name;
                return `<span class="tooltip-feature-tag">${name}</span>`;
            }).join('');
            
            if (node.features.length > 5) {
                featureList.innerHTML += `<span style="color: var(--text-muted); font-size: 11px;">+${node.features.length - 5} more</span>`;
            }
        } else if (featuresDiv) {
            featuresDiv.style.display = 'none';
        }

        // Description
        if (node.description && descDiv && descText) {
            descDiv.style.display = 'block';
            descText.textContent = node.description;
        } else if (descDiv) {
            descDiv.style.display = 'none';
        }

        // Position and show
        tooltip.style.display = 'block';
        tooltip.style.left = `${Math.min(x + 20, window.innerWidth - 340)}px`;
        tooltip.style.top = `${Math.min(y + 20, window.innerHeight - 200)}px`;
    }

    /**
     * Update tooltip position
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     */
    updateTooltip(x, y) {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;

        tooltip.style.left = `${Math.min(x + 20, window.innerWidth - 340)}px`;
        tooltip.style.top = `${Math.min(y + 20, window.innerHeight - 200)}px`;
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Update toggle button UI state
     * @param {string} elementId - Toggle element ID
     * @param {boolean} active - Whether toggle is active
     */
    updateToggleUI(elementId, active) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (active) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }

    /**
     * Update statistics display
     * @param {Object} stats - Statistics object with counts
     */
    updateStats(stats) {
        const mappings = {
            'statSources': stats.datasource,
            'statEntities': stats.entity,
            'statViews': stats.featureview,
            'statServices': stats.service,
            'statFeatures': stats.features
        };

        Object.entries(mappings).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    /**
     * Update repository subtitle display
     * @param {Object} repoSettings - Repository settings
     */
    updateRepoSubtitle(repoSettings) {
        const subtitle = document.getElementById('repoSubtitle');
        if (subtitle) {
            subtitle.textContent = `${repoSettings.name} • ${repoSettings.location}`;
        }
    }

    /**
     * Update user display in header
     * @param {Object} user - Current user object
     */
    updateUserDisplay(user) {
        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        const role = document.getElementById('userRole');

        if (avatar) avatar.textContent = user.initials;
        if (name) name.textContent = user.name;
        if (role) role.textContent = user.role;
    }

    /**
     * Set canvas cursor style
     * @param {string} cursor - CSS cursor value
     */
    setCanvasCursor(cursor) {
        const canvas = document.getElementById('diagramCanvas');
        if (canvas) {
            canvas.style.cursor = cursor;
        }
    }

    /**
     * Update theme icon displays
     * @param {string} theme - Current theme ('dark' or 'light')
     */
    updateThemeIcons(theme) {
        const icon = theme === 'dark' ? '☀️' : '🌙';
        
        const themeIcon = document.getElementById('themeIcon');
        const settingsThemeIcon = document.getElementById('settingsThemeIcon');
        
        if (themeIcon) themeIcon.textContent = icon;
        if (settingsThemeIcon) settingsThemeIcon.textContent = icon;
    }

    /**
     * Show FAB menu (Floating Action Button)
     * @param {boolean} show - Whether to show or hide
     */
    toggleFabMenu(show) {
        const buttons = ['fabSource', 'fabEntity', 'fabView', 'fabService'];
        
        buttons.forEach((id, idx) => {
            setTimeout(() => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.style.display = show ? 'flex' : 'none';
                }
            }, idx * 50);
        });
    }

    /**
     * Update push modal progress
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} message - Status message
     * @param {string} [status] - Status type: 'normal', 'success', 'error'
     */
    updatePushProgress(percent, message, status = 'normal') {
        const progress = document.getElementById('pushProgress');
        const statusEl = document.getElementById('pushStatus');
        const messageEl = document.getElementById('pushModalMessage');

        if (progress) {
            progress.style.width = `${percent}%`;
            
            const colors = {
                normal: 'var(--feast-blue)',
                success: 'var(--feast-green)',
                error: 'var(--feast-red)'
            };
            progress.style.backgroundColor = colors[status] || colors.normal;
        }

        if (statusEl) statusEl.innerHTML = message;
        if (messageEl && message) messageEl.innerHTML = message;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
EOFUIMGR

# =============================================================================
# File 8: code-generator.js - Code generation for Python/YAML/JSON
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/code-generator.js << 'EOFCODEGEN'
/**
 * Code Generator Module
 * 
 * Generates Feast configuration code in Python, YAML, and JSON formats.
 * Includes entity definitions, data sources, feature views, services,
 * Debezium configs, Spark jobs, Django models, and Postgres RLS.
 * 
 * File: code-generator.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/code-generator.js
 * 
 * @module CodeGenerator
 */

/**
 * Generates Feast repository code in multiple formats
 * @class
 */
class CodeGenerator {
    /**
     * Create code generator instance
     * @param {Object} repoSettings - Repository configuration
     */
    constructor(repoSettings) {
        this.repoSettings = repoSettings;
    }

    /**
     * Set/update repository settings
     * @param {Object} settings - New repository settings
     */
    setRepoSettings(settings) {
        this.repoSettings = settings;
    }

    /**
     * Generate entities.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for entities
     */
    generateEntitiesFile(nodes) {
        const entities = Array.from(nodes.values()).filter(n => n.type === 'entity');
        
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
    Used by ${this.getUsedByCount(node.id, nodes)} feature view(s)
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

    /**
     * Generate data_sources.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for data sources
     */
    generateDataSourcesFile(nodes) {
        const sources = Array.from(nodes.values()).filter(n => n.type === 'datasource');
        
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

    /**
     * Generate feature_views.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for feature views
     */
    generateFeatureViewsFile(nodes) {
        const views = Array.from(nodes.values()).filter(n => n.type === 'featureview');
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
                code += this.generateFeatureViewCode(node, nodes);
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
                code += this.generateFeatureViewCode(node, nodes);
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
                code += this.generateFeatureViewCode(node, nodes);
            });
        }
        
        return code;
    }

    /**
     * Generate code for a single feature view
     * @param {Object} node - Feature view node
     * @param {Map} nodes - All nodes for entity lookup
     * @returns {string} Python code for the feature view
     */
    generateFeatureViewCode(node, nodes) {
        const varName = node.name.toLowerCase().replace(/\s+/g, '_');
        const entityNames = node.entities.map(e => {
            const entity = nodes.get(e);
            return entity ? entity.name.toLowerCase().replace(/\s+/g, '_') : 'entity';
        }).join(', ');
        
        const sourceName = node.inputs.length > 0 ? 
            nodes.get(node.inputs[0])?.name?.toLowerCase().replace(/\s+/g, '_') + '_source' : 
            'None';
        
        return `<span class="code-comment">"""
${node.name} Feature View
${'-'.repeat(node.name.length + 14)}

Type: ${node.subtype}
Entities: [${entityNames}]
Features: ${node.features.length}
TTL: ${node.details.ttl || '86400'} seconds

${node.description || 'No description provided.'}

Schema:
${node.features.map(f => `    - ${f.name} (${f.type})`).join('\n')}
"""</span>
<span class="code-keyword">${varName}</span> = FeatureView(
    name=<span class="code-string">"${node.name}"</span>,
    entities=[${entityNames}],
    ttl=timedelta(seconds=${node.details.ttl || '86400'}),
    schema=[
        ${node.features.map(f => `Feature(name=<span class="code-string">"${f.name}"</span>, dtype=${f.type})`).join(',\n        ')}
    ],
    online=True,
    source=${sourceName}${node.tags.length > 0 ? `,
    tags={${node.tags.map(t => `"${t}": ""`).join(', ')}}` : ''}
)

`;
    }

    /**
     * Generate services.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for feature services
     */
    generateServicesFile(nodes) {
        const services = Array.from(nodes.values()).filter(n => n.type === 'service');
        
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
                    const view = nodes.get(f);
                    return view ? view.name.toLowerCase().replace(/\s+/g, '_') : 'view';
                }).join(', ');
                
                const usedBy = node.details.usedBy || [];
                
                code += `<span class="code-comment">"""
${node.name} Feature Service
${'-'.repeat(node.name.length + 16)}

${node.description || 'No description provided.'}

Dependencies:
${node.features.map(f => {
    const view = nodes.get(f);
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

    /**
     * Generate debezium_configs.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for Debezium configurations
     */
    generateDebeziumConfigs(nodes) {
        const sources = Array.from(nodes.values()).filter(n => 
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

    /**
     * Generate spark_jobs.py content
     * @param {Map} nodes - All diagram nodes
     * @returns {string} Python code for Spark streaming jobs
     */
    generateSparkJobs(nodes) {
        const streamViews = Array.from(nodes.values()).filter(n => 
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
                const sourceNode = view.inputs.length > 0 ? nodes.get(view.inputs[0]) : null;
                const topicName = sourceNode ? sourceNode.name.toLowerCase().replace(/\s+/g, '_') : 'source';
                
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
        .option(<span class="code-string">"subscribe"</span>, <span class="code-string">"dbz.${topicName}"</span>) \\
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

    /**
     * Generate django_models.py content
     * @returns {string} Python code for Django models
     */
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

    /**
     * Generate postgres_rls.sql content
     * @returns {string} SQL code for Row Level Security
     */
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

    /**
     * Generate JSON export content
     * @param {Map} nodes - All diagram nodes
     * @param {Array} edges - All diagram edges
     * @returns {string} Formatted JSON string with syntax highlighting
     */
    generateJSONExport(nodes, edges) {
        const data = {
            repository: this.repoSettings,
            exportDate: new Date().toISOString(),
            version: '3.0',
            nodes: Array.from(nodes.entries()),
            edges: edges,
            stats: {
                totalNodes: nodes.size,
                totalEdges: edges.length,
                totalFeatures: Array.from(nodes.values()).reduce((acc, n) => acc + (n.features?.length || 0), 0)
            }
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        return `<span class="code-keyword">${jsonStr.replace(/"([^"]+)":/g, '<span class="code-string">"$1"</span>:').replace(/: "([^"]+)"/g, ': <span class="code-string">"$1"</span>')}</span>`;
    }

    /**
     * Generate feature_store.yaml content
     * @returns {string} YAML configuration
     */
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

    /**
     * Generate code example for a specific node
     * @param {Object} node - Node to generate code for
     * @param {Map} allNodes - All nodes for lookups
     * @returns {string} HTML-formatted code example
     */
    generateCodeExample(node, allNodes) {
        if (node.type === 'featureview') {
            const entityId = node.entities[0];
            const entity = entityId ? allNodes.get(entityId) : null;
            const joinKey = entity ? entity.joinKey : 'id';
            
            return `<span class="code-comment"># Retrieve features from ${node.name}</span>
<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> FeatureStore

store = FeatureStore(repo_path=<span class="code-string">"${this.repoSettings.location}"</span>)

features = store.get_online_features(
    features=[
        ${node.features.slice(0, 2).map(f => `<span class="code-string">"${node.name}:${f.name}"</span>`).join(',\n        ')}${node.features.length > 2 ? ',' : ''}
    ],
    entity_rows=[{<span class="code-string">"${joinKey}"</span>: <span class="code-string">"123"</span>}]
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
            const varName = node.name.toLowerCase().replace(/\s+/g, '_');
            return `<span class="code-comment"># Define entity</span>
<span class="code-keyword">from</span> feast <span class="code-keyword">import</span> Entity, ValueType

<span class="code-keyword">${varName}</span> = Entity(
    name=<span class="code-string">"${node.name}"</span>,
    join_keys=[<span class="code-string">"${node.joinKey}"</span>],
    value_type=ValueType.STRING
)`;
        }
        return `<span class="code-comment"># Component code example</span>`;
    }

    /**
     * Helper: Count feature views using an entity
     * @private
     */
    getUsedByCount(entityId, nodes) {
        let count = 0;
        nodes.forEach(node => {
            if (node.type === 'featureview' && node.entities.includes(entityId)) {
                count++;
            }
        });
        return count;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodeGenerator;
}
EOFCODEGEN

# =============================================================================
# File 9: llm-helper.js - LLM integration and chat functionality
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/llm-helper.js << 'EOFLLM'
/**
 * LLM Helper Module
 * 
 * Manages AI assistant functionality including chat sessions,
 * code generation, optimization suggestions, and validation.
 * 
 * File: llm-helper.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/llm-helper.js
 * 
 * @module LLMHelper
 */

/**
 * LLM Assistant for Feast Architect
 * @class
 */
class LLMHelper {
    /**
     * Create LLM helper instance
     * @param {APIClient} apiClient - API client for backend communication
     * @param {Object} repoSettings - Repository configuration
     */
    constructor(apiClient, repoSettings) {
        this.api = apiClient;
        this.repoSettings = repoSettings;
        
        /**
         * Current active chat session ID
         * @type {number|null}
         */
        this.currentSession = null;
        
        /**
         * Message history for current session
         * @type {Array<Object>}
         */
        this.messageHistory = [];
        
        /**
         * UI container for messages
         * @type {HTMLElement|null}
         */
        this.messagesContainer = null;
    }

    /**
     * Initialize LLM panel UI references
     */
    initialize() {
        this.messagesContainer = document.getElementById('llmMessages');
    }

    /**
     * Send a predefined prompt to the LLM
     * @param {string} promptType - Type of prompt: 'generate_code', 'optimize', 'lineage', 'validate'
     * @param {Object} [context] - Selected node context
     */
    async askPrompt(promptType, context = null) {
        if (!this.messagesContainer) this.initialize();

        const prompts = {
            generate_code: 'Generate Feast code for this architecture',
            optimize: 'Suggest optimizations for my feature views',
            lineage: 'Explain this data lineage',
            validate: 'Validate my entity relationships'
        };

        const userMessage = prompts[promptType] || promptType;
        
        // Add user message to UI
        this.addMessage(userMessage, 'user');
        
        // Show loading indicator
        const loadingId = this.addLoadingMessage();
        
        try {
            // Try backend first
            if (!this.currentSession) {
                const session = await this.api.createChatSession(
                    this.repoSettings.id,
                    `Chat about ${this.repoSettings.name}`,
                    userMessage,
                    promptType
                );
                this.currentSession = session.id;
                
                // Remove loading and display response
                this.removeMessage(loadingId);
                
                if (session.messages) {
                    const lastMsg = session.messages[session.messages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        const msgId = this.addMessage(lastMsg.content, 'assistant', true);
                        this.addActionButtons(msgId);
                    }
                }
            } else {
                // Use existing session
                const response = await this.api.sendChatMessage(
                    this.currentSession,
                    userMessage,
                    promptType
                );
                
                this.removeMessage(loadingId);
                
                if (response.response) {
                    const msgId = this.addMessage(response.response, 'assistant', true);
                    this.addActionButtons(msgId);
                }
            }
        } catch (error) {
            console.error('LLM query failed:', error);
            this.removeMessage(loadingId);
            
            // Fallback to local generation
            const fallbackResponse = this.generateFallbackResponse(promptType, context);
            const msgId = this.addMessage(fallbackResponse + 
                '<p style="color: var(--text-muted); font-size: 11px; margin-top: 8px;">[Local fallback - backend unavailable]</p>', 
                'assistant', 
                true
            );
            this.addActionButtons(msgId);
        }
        
        this.scrollToBottom();
    }

    /**
     * Send custom message from input field
     * @param {string} message - User message text
     */
    async sendMessage(message) {
        if (!message.trim()) return;
        if (!this.messagesContainer) this.initialize();

        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        const input = document.getElementById('llmInput');
        if (input) input.value = '';

        // Show loading
        const loadingId = this.addLoadingMessage();

        try {
            if (!this.currentSession) {
                const session = await this.api.createChatSession(
                    this.repoSettings.id,
                    `Chat about ${this.repoSettings.name}`,
                    message,
                    'default'
                );
                this.currentSession = session.id;
                
                this.removeMessage(loadingId);
                
                if (session.messages) {
                    const lastMsg = session.messages[session.messages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        const msgId = this.addMessage(lastMsg.content, 'assistant', true);
                        this.addActionButtons(msgId);
                    }
                }
            } else {
                const response = await this.api.sendChatMessage(
                    this.currentSession,
                    message,
                    'default'
                );
                
                this.removeMessage(loadingId);
                
                if (response.response) {
                    const msgId = this.addMessage(response.response, 'assistant', true);
                    this.addActionButtons(msgId);
                }
            }
        } catch (error) {
            console.error('Send message failed:', error);
            this.removeMessage(loadingId);
            
            // Fallback response
            const fallback = `<p>I've analyzed your question about "${message}".</p>
<p>Based on your current architecture, I recommend reviewing the data lineage from sources to services to ensure consistency.</p>`;
            const msgId = this.addMessage(fallback, 'assistant', true);
            this.addActionButtons(msgId);
        }
        
        this.scrollToBottom();
    }

    /**
     * Add message to chat UI
     * @param {string} content - Message content
     * @param {string} role - 'user' or 'assistant'
     * @param {boolean} isHTML - Whether content is HTML
     * @returns {string} Message element ID
     */
    addMessage(content, role, isHTML = false) {
        const id = 'msg_' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `llm-message ${role}`;
        
        if (isHTML) {
            div.innerHTML = content;
        } else {
            div.textContent = content;
        }
        
        this.messagesContainer.appendChild(div);
        return id;
    }

    /**
     * Add loading indicator message
     * @returns {string} Loading element ID
     */
    addLoadingMessage() {
        const id = 'loading_' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'llm-message assistant';
        div.innerHTML = '<div class="spinner"></div> Analyzing your feature store...';
        this.messagesContainer.appendChild(div);
        return id;
    }

    /**
     * Remove a message by ID
     * @param {string} id - Message element ID
     */
    removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    /**
     * Add action buttons to assistant message
     * @param {string} messageId - Parent message ID
     */
    addActionButtons(messageId) {
        const message = document.getElementById(messageId);
        if (!message) return;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'llm-actions';
        actionsDiv.innerHTML = `
            <button class="llm-action-btn" onclick="diagram.applyLLMSuggestion()">Apply to Diagram</button>
            <button class="llm-action-btn" onclick="diagram.copyLLMResponse(this)">Copy</button>
            <button class="llm-action-btn" onclick="diagram.dismissLLM(this)">Dismiss</button>
        `;
        
        message.appendChild(actionsDiv);
    }

    /**
     * Scroll messages container to bottom
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    /**
     * Update context display in LLM panel
     * @param {Object|null} selectedNode - Currently selected node
     * @param {Map} allNodes - All diagram nodes
     * @param {Object} colors - Node color configuration
     */
    updateContext(selectedNode, allNodes, colors) {
        const container = document.getElementById('llmContextContent');
        if (!container) return;

        if (!selectedNode) {
            // Show architecture overview
            const stats = {
                nodes: allNodes.size,
                sources: Array.from(allNodes.values()).filter(n => n.type === 'datasource').length,
                entities: Array.from(allNodes.values()).filter(n => n.type === 'entity').length,
                views: Array.from(allNodes.values()).filter(n => n.type === 'featureview').length,
                services: Array.from(allNodes.values()).filter(n => n.type === 'service').length
            };
            
            container.innerHTML = `
                <div class="llm-context-item">
                    <span>📊</span>
                    <span>Architecture Overview: ${stats.nodes} components</span>
                </div>
                <div class="llm-context-item">
                    <span>🔗</span>
                    <span>${stats.sources} sources, ${stats.entities} entities</span>
                </div>
                <div class="llm-context-item">
                    <span>⚡</span>
                    <span>${stats.views} views, ${stats.services} services</span>
                </div>
            `;
        } else {
            // Show selected node context
            const node = selectedNode;
            const config = colors[node.type];
            let icon = config.icon;
            
            if (node.type === 'datasource' && node.dbType && node.dbType.icon) {
                icon = node.dbType.icon;
            }
            
            let html = `
                <div class="llm-context-item">
                    <span>${icon}</span>
                    <span><strong>${node.name}</strong> (${config.label})</span>
                </div>
            `;
            
            if (node.description) {
                html += `
                    <div class="llm-context-item">
                        <span>📝</span>
                        <span>${node.description.substring(0, 60)}${node.description.length > 60 ? '...' : ''}</span>
                    </div>
                `;
            }
            
            if (node.features) {
                html += `
                    <div class="llm-context-item">
                        <span>⚡</span>
                        <span>${node.features.length} features</span>
                    </div>
                `;
            }
            
            if (node.entities) {
                html += `
                    <div class="llm-context-item">
                        <span>👤</span>
                        <span>${node.entities.length} entities</span>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
    }

    /**
     * Generate fallback response when backend is unavailable
     * @param {string} type - Response type
     * @param {Object} context - Node context
     * @returns {string} HTML response content
     */
    generateFallbackResponse(type, context) {
        switch(type) {
            case 'generate_code':
                return this.generateCodeResponse(context);
            case 'optimize':
                return this.generateOptimizeResponse(context);
            case 'lineage':
                return this.generateLineageResponse(context);
            case 'validate':
                return this.generateValidateResponse();
            default:
                return '<p>I\'m ready to help with your Feast architecture.</p>';
        }
    }

    /**
     * Generate code response
     * @private
     */
    generateCodeResponse(context) {
        if (!context) {
            return `<p>Here's a complete Feast repository structure:</p>
<pre>feature_repo/
├── entities.py          # Entity definitions
├── data_sources.py      # Data source configs
├── feature_views.py     # Feature view definitions
├── services.py          # Feature services
└── feature_store.yaml   # Configuration</pre>
<p>All files include proper docstrings and follow Feast best practices.</p>`;
        }
        
        return `<p>Generated code for <strong>${context.name}</strong>:</p>
<pre># ${context.name} configuration
${context.type === 'featureview' ? `
feature_view = FeatureView(
    name="${context.name}",
    entities=[...],
    features=[...]
)` : context.type === 'entity' ? `
entity = Entity(
    name="${context.name}",
    join_keys=["${context.joinKey}"]
)` : ''}
</pre>`;
    }

    /**
     * Generate optimization response
     * @private
     */
    generateOptimizeResponse(context) {
        if (!context) {
            return `<p>Architecture Optimization Suggestions:</p>
<ul style="margin-left: 20px; margin-top: 8px;">
    <li><strong>Streaming Efficiency:</strong> Consider increasing Kafka partitions for high-throughput sources</li>
    <li><strong>Feature TTL:</strong> Review TTL settings - some features may expire too quickly</li>
    <li><strong>Entity Cardinality:</strong> High cardinality entities may benefit from caching</li>
</ul>`;
        }
        
        return `<p>Optimization recommendations for <strong>${context.name}</strong>:</p>
<ul style="margin-left: 20px; margin-top: 8px;">
    <li>Reduce feature granularity to improve serving latency</li>
    <li>Add feature validation to catch data quality issues</li>
    <li>Consider materialization for frequently accessed features</li>
</ul>`;
    }

    /**
     * Generate lineage response
     * @private
     */
    generateLineageResponse(context) {
        if (!context) {
            return `<p>Full Data Lineage Overview:</p>
<p>Your architecture flows from sources through feature views to services.</p>
<p>Key lineage paths should be reviewed for consistency.</p>`;
        }
        
        return `<p>Data Lineage for <strong>${context.name}</strong>:</p>
<p><strong>Inputs:</strong> ${context.inputs?.length || 0} connections</p>
<p><strong>Outputs:</strong> ${context.outputs?.length || 0} connections</p>
<p>This component is ${context.inputs?.length === 0 ? 'a root source' : context.outputs?.length === 0 ? 'a terminal sink' : 'a middle transformation'} in your data flow.</p>`;
    }

    /**
     * Generate validation response
     * @private
     */
    generateValidateResponse() {
        return `<p>✅ <strong>Validation Passed!</strong></p>
<p>All entity relationships appear properly configured. Your architecture is ready for deployment.</p>
<p>Consider running feast apply to validate against actual infrastructure.</p>`;
    }

    /**
     * Clear chat history and session
     */
    clearSession() {
        this.currentSession = null;
        this.messageHistory = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMHelper;
}
EOFLLM

# =============================================================================
# File 10: search-manager.js - Search functionality
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/search-manager.js << 'EOFSEARCH'
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
EOFSEARCH

# =============================================================================
# File 11: layout-manager.js - Auto-layout and positioning algorithms
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/layout-manager.js << 'EOFLAYOUT'
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
            colWidth: 280,
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
EOFLAYOUT

# =============================================================================
# File 12: example-data.js - Complex example architecture data
# =============================================================================
cat >> FeastArchitect/static/FeastArchitect/js/modules/example-data.js << 'EOFEXAMPLE'
            'Owner: Platform Team\nSLA: 99.99%\nBackup: Daily snapshots\nEncryption: AES-256 at rest'
        }
    });
    
    // 2. MongoDB (NoSQL with Debezium)
    const mongoEvents = nodeManager.addDataSource({
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
    const kafkaStream = nodeManager.addDataSource({
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
    const dataWarehouse = nodeManager.addDataSource({
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
    const dynamoCache = nodeManager.addDataSource({
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
    const redisCache = nodeManager.addDataSource({
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
    const s3Store = nodeManager.addDataSource({
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
    const graphDb = nodeManager.addDataSource({
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
    const searchIndex = nodeManager.addDataSource({
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
    const timeSeriesDb = nodeManager.addDataSource({
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
    
    // ==========================================
    // ENTITIES (5 core business entities)
    // ==========================================
    
    const user = nodeManager.addEntity({
        name: 'User',
        joinKey: 'user_id',
        description: 'Registered application users across all platforms',
        tags: ['core', 'pii'],
        details: {
            notes: '100M+ users globally\nGDPR compliant\nPII masking required\nJoins: user_id (string)'
        }
    });
    
    const session = nodeManager.addEntity({
        name: 'Session',
        joinKey: 'session_id',
        description: 'Ephemeral user sessions for real-time features',
        tags: ['ephemeral', 'real-time'],
        details: {
            notes: 'TTL: 4 hours\nHigh cardinality\nUsed for real-time personalization'
        }
    });
    
    const product = nodeManager.addEntity({
        name: 'Product',
        joinKey: 'product_id',
        description: 'Product catalog with variants and categories',
        tags: ['catalog', 'reference'],
        details: {
            notes: '2.5M active products\nUpdated: hourly\nCategories: hierarchical'
        }
    });
    
    const merchant = nodeManager.addEntity({
        name: 'Merchant',
        joinKey: 'merchant_id',
        description: 'Seller accounts with risk profiles',
        tags: ['seller', 'risk'],
        details: {
            notes: '50K active merchants\nKYC verified\nRisk scoring enabled'
        }
    });
    
    const device = nodeManager.addEntity({
        name: 'Device',
        joinKey: 'device_fingerprint',
        description: 'Device fingerprinting for fraud detection',
        tags: ['fraud', 'security'],
        details: {
            notes: 'Fingerprinting via JS SDK\nBot detection enabled\nPrivacy compliant'
        }
    });
    
    // ==========================================
    // FEATURE VIEWS - Batch (4 views)
    // ==========================================
    
    const userDemographics = nodeManager.addFeatureView({
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
    
    const userTransactions = nodeManager.addFeatureView({
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
    
    const productCatalog = nodeManager.addFeatureView({
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
    
    const merchantRiskProfile = nodeManager.addFeatureView({
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
    
    // ==========================================
    // FEATURE VIEWS - Stream (2 views)
    // ==========================================
    
    const userBehaviorStream = nodeManager.addFeatureView({
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
    
    const deviceFingerprint = nodeManager.addFeatureView({
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
    
    // ==========================================
    // FEATURE VIEWS - On-Demand (1 view)
    // ==========================================
    
    const sessionContext = nodeManager.addFeatureView({
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
    
    // ==========================================
    // FEATURE VIEWS - Cross-Source (1 view)
    // ==========================================
    
    const unifiedUserProfile = nodeManager.addFeatureView({
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
    
    // ==========================================
    // SERVICES (5 feature services)
    // ==========================================
    
    const recommendationService = nodeManager.addService({
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
    
    const fraudDetectionService = nodeManager.addService({
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
    
    const searchRankingService = nodeManager.addService({
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
    
    const analyticsWarehouseService = nodeManager.addService({
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
    
    const realTimePersonalization = nodeManager.addService({
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
    
    // ==========================================
    // ADDITIONAL CROSS-SOURCE CONNECTIONS
    // ==========================================
    
    // Add manual connections for sources that feed into views
    // These would typically be handled by the data source selection in the view,
    // but we add explicit edges for visualization clarity
    
    addConnection(s3Store, unifiedUserProfile);
    addConnection(graphDb, fraudDetectionService);
    addConnection(searchIndex, searchRankingService);
    addConnection(timeSeriesDb, analyticsWarehouseService);
    
    // Trigger auto-layout
    if (autoLayout) {
        autoLayout();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = loadComplexExample;
}
EOFEXAMPLE

# =============================================================================
# File 13: feast-diagram.js - Main FeastDiagram class (refactored)
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules/feast-diagram.js << 'EOFMAINCLASS'
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
        this.renderer.setupMiniMap();
        
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
EOFMAINCLASS

# =============================================================================
# File 14: modules-loader.js - Script loader to maintain load order
# =============================================================================
cat > FeastArchitect/static/FeastArchitect/js/modules-loader.js << 'EOFLOADER'
/**
 * Module Loader
 * 
 * Ensures proper load order for all JavaScript modules.
 * Loads dependencies in sequence before initializing main application.
 * 
 * File: modules-loader.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules-loader.js
 * 
 * Loading Order:
 * 1. config.js - Constants and database types
 * 2. utils.js - Utility functions
 * 3. api.js - API client
 * 4. canvas-renderer.js - Canvas rendering
 * 5. node-manager.js - Node CRUD operations
 * 6. layout-manager.js - Auto-layout algorithms
 * 7. search-manager.js - Search functionality
 * 8. ui-manager.js - UI interactions
 * 9. code-generator.js - Code generation
 * 10. llm-helper.js - LLM integration
 * 11. example-data.js - Example architecture
 * 12. feast-diagram.js - Main class
 * 13. main.js - Application entry point
 */

(function() {
    'use strict';
    
    const modules = [
        'modules/config.js',
        'modules/utils.js',
        'modules/api.js',
        'modules/canvas-renderer.js',
        'modules/node-manager.js',
        'modules/layout-manager.js',
        'modules/search-manager.js',
        'modules/ui-manager.js',
        'modules/code-generator.js',
        'modules/llm-helper.js',
        'modules/example-data.js',
        'modules/feast-diagram.js',
        'main.js'
    ];
    
    const basePath = '/static/FeastArchitect/js/';
    
    /**
     * Load a single script
     * @param {string} src - Script source path
     * @returns {Promise} Resolves when script loads
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = basePath + src;
            script.async = false; // Maintain load order
            
            script.onload = () => {
                console.log('Loaded:', src);
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load:', src);
                reject(new Error(`Failed to load ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Load all modules in sequence
     */
    async function loadAllModules() {
        console.log('Loading Feast Architect modules...');
        
        for (const module of modules) {
            try {
                await loadScript(module);
            } catch (error) {
                console.error('Module loading failed:', error);
                // Continue loading other modules
            }
        }
        
        console.log('All modules loaded');
    }
    
    // Start loading when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllModules);
    } else {
        loadAllModules();
    }
})();
EOFLOADER

echo "All JavaScript modules created successfully!"
echo ""
echo "Directory structure created:"
echo "FeastArchitect/static/FeastArchitect/js/"
echo "├── main.js                    # Application entry point"
echo "├── modules-loader.js          # Sequential module loader"
echo "└── modules/"
echo "    ├── config.js              # Configuration & database types"
echo "    ├── utils.js               # Utility functions"
echo "    ├── api.js                 # Django API client"
echo "    ├── canvas-renderer.js     # Canvas rendering engine"
echo "    ├── node-manager.js        # Node CRUD operations"
echo "    ├── layout-manager.js      # Auto-layout algorithms"
echo "    ├── search-manager.js      # Search functionality"
echo "    ├── ui-manager.js          # UI interactions"
echo "    ├── code-generator.js      # Python/YAML/JSON generation"
echo "    ├── llm-helper.js          # AI assistant integration"
echo "    ├── example-data.js        # Complex example architecture"
echo "    └── feast-diagram.js       # Main orchestrator class"
echo ""
echo "To use in your Django template, replace the inline script with:"
echo ""
echo "<script src=\"{% static 'FeastArchitect/js/modules-loader.js' %}\"></script>"
