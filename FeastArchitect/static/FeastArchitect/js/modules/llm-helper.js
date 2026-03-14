/**
 * LLM Helper — Feature Explorer
 *
 * Full conversation history, markdown+code rendering,
 * structured ACTION block parsing for diagram interactions.
 */

class LLMHelper {
    constructor(apiClient, repoSettings) {
        this.api          = apiClient;
        this.repoSettings = repoSettings;
        this.sessionId    = null;
        this.container    = null;
    }

    initialize() {
        this.container = document.getElementById('llmMessages');
    }

    // ── Public entry points ──────────────────────────────────

    async askPrompt(promptType, getDiagramContext) {
        const labels = {
            generate_code: 'Generate Feast Python code for this architecture',
            optimize:      'What optimisations do you recommend for this feature store?',
            lineage:       'Explain the data lineage from sources to services',
            validate:      'Validate entity relationships and identify any issues',
        };
        const msg = labels[promptType] || promptType;
        await this._send(msg, promptType, getDiagramContext);
    }

    async sendMessage(text, getDiagramContext) {
        if (!text.trim()) return;
        const input = document.getElementById('llmInput');
        if (input) { input.value = ''; input.style.height = '44px'; }
        await this._send(text, 'default', getDiagramContext);
    }

    clearSession() {
        this.sessionId = null;
        if (this.container) this.container.innerHTML = '';
        if (typeof diagram !== 'undefined') diagram._llmUpdateNewChatBtn?.();
    }

    // ── Core send ────────────────────────────────────────────

    async _send(message, queryType, getDiagramContext) {
        if (!this.container) this.initialize();

        const ctx = getDiagramContext ? getDiagramContext() : {};

        this._appendMessage('user', message);
        const loadingEl = this._appendLoading();

        try {
            let data;

            if (!this.sessionId) {
                // Create session
                const res = await fetch(`${this.api.baseUrl}/chats/`, {
                    method: 'POST',
                    headers: this._headers(),
                    body: JSON.stringify({
                        repository_id:    this.repoSettings.id,
                        title:            `Chat — ${this.repoSettings.name}`,
                        initial_message:  message,
                        query_type:       queryType,
                        selected_node_id: ctx.selectedNodeId || null,
                    }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.detail || json.error || res.status);
                this.sessionId = json.id;
                if (typeof diagram !== 'undefined') diagram._llmUpdateNewChatBtn?.();
                // The initial message response is embedded in the session
                const msgs = json.messages || [];
                const last = msgs.filter(m => m.role === 'assistant').pop();
                data = { success: true, response: last?.content || '' };
            } else {
                // Continue session
                const res = await fetch(`${this.api.baseUrl}/chats/${this.sessionId}/send_message/`, {
                    method: 'POST',
                    headers: this._headers(),
                    body: JSON.stringify({
                        message,
                        query_type:       queryType,
                        selected_node_id: ctx.selectedNodeId || null,
                    }),
                });
                data = await res.json();
                if (!res.ok) throw new Error(data.detail || data.error || res.status);
            }

            loadingEl.remove();

            if (data.response) {
                const { textContent, action } = this._parseResponse(data.response);
                const msgEl = this._appendMessage('assistant', textContent, true);
                if (action) this._appendActionBar(msgEl, action, getDiagramContext);
            }

        } catch (err) {
            console.error('LLM error:', err);
            loadingEl.remove();
            this._appendMessage('assistant',
                `<span style="color:var(--feast-red)">⚠ ${err.message || 'LLM unavailable'}</span>`, true);
        }

        this._scrollBottom();
    }

    // ── Response parsing ─────────────────────────────────────

    /**
     * Strips ```action blocks from the markdown, parses them,
     * and returns { textContent, action }.
     */
    _parseResponse(raw) {
        let action = null;
        const actionMatch = raw.match(/```action\s*([\s\S]*?)```/);
        if (actionMatch) {
            try {
                action = JSON.parse(actionMatch[1].trim());
            } catch(e) {
                console.warn('Failed to parse action block:', e);
            }
        }
        const textContent = raw.replace(/```action[\s\S]*?```/g, '').trim();
        return { textContent, action };
    }

    // ── Markdown + code rendering ─────────────────────────────

    _renderMarkdown(text) {
        // Fenced code blocks
        text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const langLabel = lang ? `<span class="llm-code-lang">${lang}</span>` : '';
            const copyBtn = `<button class="llm-code-copy" onclick="navigator.clipboard.writeText(this.closest('.llm-code-block').querySelector('code').innerText).then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='Copy',1500)})">Copy</button>`;
            return `<div class="llm-code-block"><div class="llm-code-header">${langLabel}${copyBtn}</div><pre><code class="lang-${lang}">${escaped}</code></pre></div>`;
        });

        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code class="llm-inline-code">$1</code>');

        // Bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Headers
        text = text.replace(/^### (.+)$/gm, '<h4 class="llm-h4">$1</h4>');
        text = text.replace(/^## (.+)$/gm,  '<h3 class="llm-h3">$1</h3>');
        text = text.replace(/^# (.+)$/gm,   '<h2 class="llm-h2">$1</h2>');

        // Bullet lists
        text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul class="llm-ul">$1</ul>');

        // Numbered lists
        text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Paragraphs — wrap lone lines
        text = text.replace(/^(?!<[hlu]|<\/[hlu]|<div|<pre)(.+)$/gm, '<p>$1</p>');

        return text;
    }

    // ── Action bar ────────────────────────────────────────────

    _appendActionBar(msgEl, action, getDiagramContext) {
        if (!action || !action.type) return;

        const bar = document.createElement('div');
        bar.className = 'llm-action-bar';

        if (action.type === 'highlight' && action.nodes?.length) {
            const nodeList = action.nodes.join(', ');
            bar.innerHTML = `
                <span class="llm-action-hint">💡 ${action.reason || 'Related nodes found'}</span>
                <button class="llm-action-btn llm-action-highlight"
                    onclick="diagram._llmHighlightNodes(${JSON.stringify(action.nodes)})">
                    Highlight ${action.nodes.length} node${action.nodes.length > 1 ? 's' : ''}
                </button>
            `;
        } else if (action.type === 'select' && action.nodes?.length) {
            bar.innerHTML = `
                <span class="llm-action-hint">🎯 ${action.reason || 'Navigate to node'}</span>
                <button class="llm-action-btn llm-action-select"
                    onclick="diagram._llmSelectNode(${JSON.stringify(action.nodes[0])})">
                    Select ${action.nodes[0]}
                </button>
            `;
        } else if (action.type === 'edit_suggestion' && action.edit) {
            const edit = action.edit;
            bar.innerHTML = `
                <span class="llm-action-hint">✏️ ${edit.confirm_message || 'Apply suggested change?'}</span>
                <button class="llm-action-btn llm-action-apply"
                    onclick="diagram._llmApplyEdit(${JSON.stringify(edit)}, this)">
                    Apply Change
                </button>
                <button class="llm-action-btn llm-action-dismiss" onclick="this.closest('.llm-action-bar').remove()">
                    Dismiss
                </button>
            `;
        }

        if (bar.innerHTML) msgEl.appendChild(bar);
    }

    // ── DOM helpers ───────────────────────────────────────────

    _appendMessage(role, content, isHTML = false) {
        if (!this.container) this.initialize();
        const div = document.createElement('div');
        div.className = `llm-message ${role}`;
        if (role === 'assistant') {
            div.innerHTML = this._renderMarkdown(isHTML ? content : this._escapeHtml(content));
        } else {
            div.textContent = content;
        }
        this.container.appendChild(div);
        return div;
    }

    _appendLoading() {
        if (!this.container) this.initialize();
        const div = document.createElement('div');
        div.className = 'llm-message assistant llm-loading';
        div.innerHTML = `
            <div class="llm-dots">
                <span></span><span></span><span></span>
            </div>
            <span class="llm-loading-text">Thinking…</span>
        `;
        this.container.appendChild(div);
        this._scrollBottom();
        return div;
    }

    _scrollBottom() {
        if (this.container) this.container.scrollTop = this.container.scrollHeight;
    }

    _headers() {
        return {
            'Content-Type': 'application/json',
            'X-CSRFToken': this._csrf(),
        };
    }

    _csrf() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value
            || document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    }

    _escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    // ── Context update ────────────────────────────────────────

    updateContext(selectedNode, allNodes, colors) {
        const bar = document.getElementById('llmContextContent');
        if (!bar) return;

        if (!selectedNode) {
            const n = allNodes.size;
            const src = Array.from(allNodes.values()).filter(x => x.type === 'datasource').length;
            const ent = Array.from(allNodes.values()).filter(x => x.type === 'entity').length;
            const fv  = Array.from(allNodes.values()).filter(x => x.type === 'featureview').length;
            const svc = Array.from(allNodes.values()).filter(x => x.type === 'service').length;
            bar.innerHTML = `
                <span class="llm-context-icon">📊</span>
                <span class="llm-context-text">${n} nodes — ${src} sources · ${ent} entities · ${fv} views · ${svc} services</span>
            `;
        } else {
            const cfg = colors[selectedNode.type] || {};
            const icon = (selectedNode.type === 'datasource' && selectedNode.dbType?.icon)
                ? selectedNode.dbType.icon : cfg.icon || '📦';
            const featCount = selectedNode.features?.length ? ` · ${selectedNode.features.length} features` : '';
            bar.innerHTML = `
                <span class="llm-context-icon">${icon}</span>
                <span class="llm-context-text"><strong>${selectedNode.name}</strong> (${cfg.label || selectedNode.type})${featCount}</span>
            `;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMHelper;
}
