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
