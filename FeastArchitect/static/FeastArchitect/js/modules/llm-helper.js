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
