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

function initializeDiagram() {
    console.log('Initializing diagram...');
    
    const canvas = document.getElementById('diagramCanvas');
    if (!canvas) {
        console.error('ERROR: diagramCanvas element not found in DOM!');
        console.log('Available elements:', document.querySelectorAll('canvas'));
        return;
    }
    
    console.log('Canvas found, creating FeastDiagram...');
    
    try {
        /**
         * Global diagram instance
         * @type {FeastDiagram}
         * @global
         */
        window.diagram = new FeastDiagram('diagramCanvas');
        console.log('Feast Diagram initialized successfully');
    } catch (error) {
        console.error('ERROR initializing FeastDiagram:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    // DOM is still loading, wait for it
    document.addEventListener('DOMContentLoaded', initializeDiagram);
} else {
    // DOM already loaded, initialize immediately
    console.log('DOM already loaded, initializing immediately...');
    initializeDiagram();
}
