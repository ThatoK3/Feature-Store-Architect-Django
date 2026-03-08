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
