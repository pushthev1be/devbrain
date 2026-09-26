/**
 * Test-only re-export shim.
 * Imports createMcpServer from index.ts without triggering the IIFE entry point.
 * Used exclusively by index.test.ts.
 */
export { createMcpServer } from './index';
export { HTML_DASHBOARD } from './dashboard';
