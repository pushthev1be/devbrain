import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts'],
    },
  },
  resolve: {
    // Point partially-installed packages directly at their CJS entry points
    alias: {
      '@google/genai': resolve('./node_modules/@google/genai/dist/index.cjs'),
      'mongodb': resolve('./node_modules/mongodb/lib/index.js'),
      '@modelcontextprotocol/sdk/client': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.js'),
      '@modelcontextprotocol/sdk/inMemory': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/inMemory.js'),
      '@modelcontextprotocol/sdk/server/index.js': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js'),
      '@modelcontextprotocol/sdk/server/stdio.js': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js'),
      '@modelcontextprotocol/sdk/server/streamableHttp.js': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/streamableHttp.js'),
      '@modelcontextprotocol/sdk/types.js': resolve('./node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js'),
    },
  },
});
