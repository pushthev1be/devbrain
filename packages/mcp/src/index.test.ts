/**
 * Tests for the MCP tool handlers in packages/mcp/src/index.ts
 *
 * Uses @modelcontextprotocol/sdk InMemoryTransport to wire a real Client
 * directly to createMcpServer() in-process. All @devbrain/core calls are
 * intercepted by vi.mock so no DB or Gemini connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mock @devbrain/core before the server module loads ────────────────────────

const mockProject = {
  id: 'proj-test',
  name: 'test-project',
  path: process.cwd(),
  stack: ['Node.js', 'TypeScript'],
  createdAt: Date.now() - 86400000,
  lastSeen: Date.now(),
};

const mockFix = {
  id: 'e1', projectId: 'proj-test', type: 'fix',
  title: 'JWT token expires in production',
  content: 'Set TOKEN_EXPIRY=86400 in prod .env',
  tags: ['jwt', 'auth'], category: 'auth',
  errorPattern: 'TokenExpiredError: jwt expired',
  embedding: new Array(3072).fill(0.1),
  createdAt: Date.now() - 3600000,
  confidence: 'confirmed',
  retrievalCount: 5,
  project: mockProject,
};

const mockDecision = {
  id: 'e2', projectId: 'proj-test', type: 'decision',
  title: 'Use JWT over sessions',
  content: 'Stateless, scales better across services',
  tags: ['jwt', 'auth', 'architecture'], category: 'auth',
  embedding: new Array(3072).fill(0.05),
  createdAt: Date.now() - 7200000,
  confidence: 'corroborated',
  project: mockProject,
};

const mockEntries = [mockFix, mockDecision];

vi.mock('@devbrain/core', async importOriginal => {
  // The entry-type registry is pure data plus pure helpers, and the tool schemas
  // under test are generated from it — so use the real one. Stubbing it here
  // would let the schemas drift from the real taxonomy without failing a test.
  const real = await importOriginal<typeof import('@devbrain/core')>();

  return {
  ENTRY_TYPES:      real.ENTRY_TYPES,
  ENTRY_TYPE_NAMES: real.ENTRY_TYPE_NAMES,
  normalizeType:    real.normalizeType,
  buildDossier:     real.buildDossier,
  describeStorage:  vi.fn().mockReturnValue({ kind: 'local', location: '/tmp/db.json' }),

  // Nothing is a duplicate in these tests, so saves take the normal path.
  findDuplicate:    vi.fn().mockResolvedValue(null),
  isDuplicateEntry: vi.fn().mockResolvedValue(false),

  // Session tracking is exercised in sessions.test.ts against the real store.
  startSession:            vi.fn().mockResolvedValue(undefined),
  endSession:              vi.fn().mockResolvedValue(undefined),
  getAbandonedSession:     vi.fn().mockResolvedValue(null),
  describeAbandonedSession: real.describeAbandonedSession,
  getProjectByPath:          vi.fn().mockResolvedValue(mockProject),
  upsertProject:             vi.fn().mockResolvedValue(undefined),
  insertEntry:               vi.fn().mockResolvedValue(undefined),
  getEntriesByProject:       vi.fn().mockResolvedValue(mockEntries),
  getAllEntriesWithProjects:  vi.fn().mockResolvedValue(mockEntries),
  getAllProjects:             vi.fn().mockResolvedValue([mockProject]),
  getRepoRoot:               vi.fn().mockReturnValue(process.cwd()),
  getProjectName:            vi.fn().mockReturnValue('test-project'),
  detectStack:               vi.fn().mockReturnValue(['Node.js']),
  getEmbedding:              vi.fn().mockResolvedValue(new Array(3072).fill(0.1)),
  similarityLabel:           vi.fn().mockReturnValue('90% match'),
  timeAgo:                   vi.fn().mockReturnValue('2h ago'),
  buildContext:              vi.fn().mockReturnValue({
    issues:               [{ entry: mockFix,      project: mockProject, score: 0.9 }],
    decisions:            [{ entry: mockDecision, project: mockProject, score: 0.8 }],
    architecture:         [],
    patterns:             [],
    antiPatterns:         [],
    stacks:               [],
    notes:                [],
    crossProjectPatterns: undefined,
    supersededDecisions:  undefined,
    currentProject:       mockProject,
  }),
  compressContext:           vi.fn().mockImplementation(ctx => Promise.resolve({ ...ctx, synthesis: {} })),
  formatContext:             vi.fn().mockReturnValue('# DevBrain Context — test-project\n\n## Past Issues\n- JWT fix'),
  bumpRetrievalCounts:       vi.fn().mockResolvedValue(undefined),
  preciseSearch:             vi.fn().mockReturnValue([{
    entry: mockFix, project: mockProject,
    similarity: 0.9, patternScore: 0.8, categoryMatch: true, matchType: 'pattern',
  }]),
  vectorSearch:              vi.fn().mockRejectedValue(new Error('no index in test')),
  autoArchetype:             vi.fn().mockResolvedValue('missing cleanup in async lifecycle'),
  recapSession:              vi.fn().mockResolvedValue([{
    type: 'fix', title: 'Fixed memory leak in useEffect',
    content: 'Added cleanup callback to remove event listener on unmount',
    tags: ['react', 'hooks'], category: 'performance',
    errorPattern: 'MaxListenersExceededWarning',
    causeArchetype: 'missing cleanup callback in lifecycle subscription',
  }]),
  supersedeEntry:            vi.fn().mockResolvedValue(undefined),
  reinforceEntry:            vi.fn().mockResolvedValue(undefined),
  deleteEntry:               vi.fn().mockResolvedValue(undefined),
  RateLimitError:            class RateLimitError extends Error { retryAfter = 60; },
  };
});

vi.mock('./mongoMcp', () => ({
  mongoMcpFind: vi.fn().mockResolvedValue({ documents: [], summary: '0 documents' }),
}));

vi.mock('./agent', () => ({
  runAgent: vi.fn().mockResolvedValue('Agent response'),
}));

// ── set up MCP client/server pair via InMemoryTransport ───────────────────────

import { Client }              from '@modelcontextprotocol/sdk/client';
import { InMemoryTransport }   from '@modelcontextprotocol/sdk/inMemory';

// Dynamically import createMcpServer after mocks are registered
async function buildTestClient(): Promise<Client> {
  const { createMcpServer } = await import('./testExports');
  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'vitest-client', version: '0' });
  await client.connect(clientTransport);
  return client;
}

// ── helper ────────────────────────────────────────────────────────────────────

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const result = await client.callTool({ name, arguments: args });
  return result as { content: Array<{ type: string; text: string }>; isError?: boolean };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('MCP tool: get_context', () => {
  it('returns a formatted context string', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'get_context', { query: 'auth' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text.length).toBeGreaterThan(10);
  });
});

describe('MCP tool: task_start', () => {
  it('returns a project briefing scoped to the task', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'task_start', {
      description: 'fix auth token expiry bug',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('test-project');
  });
});

describe('MCP tool: task_end', () => {
  it('extracts and saves entries from a session summary', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'task_end', {
      summary: 'Fixed a memory leak by adding cleanup to the useEffect hook. MaxListenersExceededWarning is gone.',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('DevBrain:');
    expect(result.content[0].text).toContain('saved');
  });

  it('confirms how many entries were extracted', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'task_end', {
      summary: 'Fixed memory leak. Added cleanup to useEffect.',
    });
    // recapSession mock returns 1 entry
    expect(result.content[0].text).toContain('1 knowledge entry');
  });
});

describe('MCP tool: save_entry', () => {
  it('returns a DevBrain confirmation message', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'save_entry', {
      type: 'fix',
      title: 'Fixed JWT expiry in prod',
      content: 'Set TOKEN_EXPIRY=86400 in .env',
      tags: ['jwt', 'auth'],
      category: 'auth',
      error_pattern: 'TokenExpiredError: jwt expired',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/^DevBrain:/);
  });

  it('works without optional fields', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'save_entry', {
      type: 'decision',
      title: 'Use PostgreSQL for this service',
      content: 'Better query flexibility than MongoDB for relational data',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('DevBrain:');
  });

  it('auto-generates cause_archetype when not provided', async () => {
    const { autoArchetype } = await import('@devbrain/core');
    const client = await buildTestClient();
    await callTool(client, 'save_entry', {
      type: 'bug',
      title: 'Memory leak in event emitter',
      content: 'Listener not removed on component unmount',
    });
    expect(autoArchetype).toHaveBeenCalled();
  });
});

describe('MCP tool: search_knowledge', () => {
  it('returns results for a query', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'search_knowledge', {
      query: 'JWT token expiry',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('DevBrain results');
  });

  it('passes error_pattern through to preciseSearch', async () => {
    const { preciseSearch } = await import('@devbrain/core');
    const client = await buildTestClient();
    await callTool(client, 'search_knowledge', {
      query: 'jwt expired',
      error_pattern: 'TokenExpiredError: jwt expired',
    });
    expect(preciseSearch).toHaveBeenCalledWith(
      expect.stringContaining('TokenExpiredError'),
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({ topK: 6 })
    );
  });
});

describe('MCP tool: get_project_summary', () => {
  it('returns project name and entry counts', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'get_project_summary', {});
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('test-project');
  });
});

describe('MCP tool: query_entries', () => {
  it('returns entries with header', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'query_entries', { type: 'fix' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('DevBrain entries');
  });

  it('filters by category', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'query_entries', { category: 'auth' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('category:auth');
  });
});

describe('MCP tools list', () => {
  it('exposes all 8 expected tools', async () => {
    const client = await buildTestClient();
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name);
    expect(names).toContain('task_start');
    expect(names).toContain('task_end');
    expect(names).toContain('save_entry');
    expect(names).toContain('search_knowledge');
    expect(names).toContain('get_context');
    expect(names).toContain('get_project_summary');
    expect(names).toContain('query_entries');
    expect(names).toContain('query_knowledge_db');
    expect(names).toHaveLength(8);
  });

  it('tool descriptions contain imperative CALL THIS language', async () => {
    const client = await buildTestClient();
    const { tools } = await client.listTools();
    const task_start = tools.find(t => t.name === 'task_start')!;
    const save_entry = tools.find(t => t.name === 'save_entry')!;
    expect(task_start.description).toMatch(/CALL THIS FIRST/);
    expect(save_entry.description).toMatch(/CALL THIS/);
  });
});
