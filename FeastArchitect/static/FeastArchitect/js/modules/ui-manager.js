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
    showNotification(title, text, type = 'success', duration = 3000) {
        const notif = document.getElementById('notification');
        if (!notif) return;

        const titleEl = document.getElementById('notifTitle');
        const textEl  = document.getElementById('notifText');
        const iconEl  = document.getElementById('notifIcon');

        if (titleEl) titleEl.textContent = title;
        if (textEl)  textEl.textContent  = text;

        // Type → icon + CSS class
        const types = {
            success: { icon: '✅', cls: '' },
            error:   { icon: '❌', cls: 'notif-error' },
            warning: { icon: '⚠️', cls: 'notif-warning' },
            info:    { icon: 'ℹ️', cls: 'notif-info' },
        };
        const cfg = types[type] || types.success;
        if (iconEl) iconEl.textContent = cfg.icon;

        notif.classList.remove('notif-error', 'notif-warning', 'notif-info');
        if (cfg.cls) notif.classList.add(cfg.cls);

        notif.classList.add('show');

        clearTimeout(notif._hideTimer);
        notif._hideTimer = setTimeout(() => {
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
        if (!subtitle) return;
        if (repoSettings.isNew) {
            subtitle.innerHTML = `<span class="repo-new-badge">NEW</span> ${repoSettings.name} <span style="opacity:0.5">· unsaved</span>`;
        } else {
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
