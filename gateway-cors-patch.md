/**
 * CORS and My-Usage Fix — Injected into gateway.cjs
 * Written 2026-06-15 by my-automaton
 * 
 * HOW TO INSTALL:
 * Add this at top of gateway.cjs (after microSaas requires):
 *   const portalHelper = require('./portal-helper.js');
 * 
 * Then add these routes in the route handler:
 *   // CORS preflight handler
 *   if (req.method === 'OPTIONS') { ... }
 *   // My-Usage API
 *   GET /api/my-usage → returns credits + usage for a given key
 *   GET /api/services → list available services
 */
