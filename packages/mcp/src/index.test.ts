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
  clip:             real.clip,
  describeStorage:  vi.fn().mockReturnValue({ kind: 'local', location: '/tmp/db.json' }),

  // Nothing is a duplicate in these tests, so saves take the normal path.
  findDuplicate:    vi.fn().mockResolvedValue(null),
  isDuplicateEntry: vi.fn().mockResolvedValue(false),

  findTextDuplicate: vi.fn().mockResolvedValue(null),

  // Two of the last three commits are unreviewed.
  listCommitHashes:          vi.fn().mockReturnValue(['a', 'b', 'c']),
  filterUnprocessedCommits:  vi.fn().mockResolvedValue(['a', 'b']),
  getProjectByPath:          vi.fn().mockResolvedValue(mockProject),
  upsertProject:             vi.fn().mockResolvedValue(undefined),
  insertEntry:               vi.fn().mockResolvedValue(undefined),
  getEntriesByProject:       vi.fn().mockResolvedValue(mockEntries),
  getAllEntriesWithProjects:  vi.fn().mockResolvedValue(mockEntries),
  getAllProjects:             vi.fn().mockResolvedValue([mockProject]),
  getRepoRoot:               vi.fn().mockReturnValue(process.cwd()),
  // No hook has run in these tests, so no session is active — the same as a
  // save made from an editor DevBrain's hooks are not installed in.
  activeSession:             vi.fn().mockReturnValue(undefined),
  // No ask outstanding, so a save in these tests is one the agent volunteered.
  takeAsk:                   vi.fn().mockReturnValue(false),
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
  supersedeEntry:            vi.fn().mockResolvedValue(undefined),
  reinforceEntry:            vi.fn().mockResolvedValue(undefined),
  deleteEntry:               vi.fn().mockResolvedValue(undefined),
  RateLimitError:            class RateLimitError extends Error { retryAfter = 60; },
  };
});

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
  it('heads the briefing with what get_project_summary used to report', async () => {
    const client = await buildTestClient();
    const text = (await callTool(client, 'get_context', {})).content[0].text;
    expect(text).toContain('Project: test-project');
    expect(text).toContain('2 entries (1 fix · 1 decision)');
  });

  it('points at backfill when commits have not been reviewed', async () => {
    const client = await buildTestClient();
    const text = (await callTool(client, 'get_context', {})).content[0].text;
    expect(text).toContain('2 past commits not reviewed yet');
    expect(text).toContain('devbrain backfill');
  });

  it('says so when the project is not registered', async () => {
    const { getProjectByPath } = await import('@devbrain/core');
    vi.mocked(getProjectByPath).mockResolvedValueOnce(null);
    const client = await buildTestClient();
    const text = (await callTool(client, 'get_context', {})).content[0].text;
    expect(text).toContain('devbrain init');
  });
});

describe('MCP tool: save_entry', () => {
  it('returns a DevBrain confirmation message', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'save_entry', {
      type: 'fix',
      title: 'JWT expiry differs in prod',
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

  it('retracts the entry it corrects, in the same call', async () => {
    const { supersedeEntry } = await import('@devbrain/core');
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'JWT expiry is set by the identity provider, not .env',
      content: 'TOKEN_EXPIRY is ignored; the IdP issues the exp claim.', supersedes: 'e1',
    })).content[0].text;
    expect(supersedeEntry).toHaveBeenCalledWith('e1', expect.any(String));
    expect(text).toContain('Retracted');
  });

  it('links the bug it closed, and keeps both entries', async () => {
    const { insertEntry, supersedeEntry } = await import('@devbrain/core');
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'Token expiry comes from the IdP exp claim',
      content: 'Read exp from the token instead of TOKEN_EXPIRY.', fixes: 'e1',
    })).content[0].text;
    expect(insertEntry).toHaveBeenCalledWith(expect.objectContaining({ fixes: 'e1' }));
    expect(text).toContain('Closes');
    // Unlike supersedes: the bug was right, so it stays and keeps surfacing.
    expect(supersedeEntry).not.toHaveBeenCalled();
    expect(text).not.toContain('Retracted');
  });

  // An edge to an id that does not exist is worse than no edge: the graph shows
  // the bug as closed and there is nothing at the other end to look at.
  it('stores no link for an id that does not exist, and says so', async () => {
    const { insertEntry } = await import('@devbrain/core');
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'Retry the upload once on a 502 from the CDN',
      content: 'The CDN returns 502 while a cache node restarts.', fixes: 'nope-not-an-id',
    })).content[0].text;
    expect(insertEntry).toHaveBeenCalledWith(expect.not.objectContaining({ fixes: expect.anything() }));
    expect(text).toContain('nothing was linked');
  });

  it('stamps the session when a hook has recorded one, so the episode holds together', async () => {
    const core = await import('@devbrain/core');
    vi.mocked(core.activeSession).mockReturnValueOnce('sess-live');
    const client = await buildTestClient();
    await callTool(client, 'save_entry', {
      type: 'lesson', title: 'pkill does not kill node under Git Bash on Windows',
      content: 'Use Get-NetTCPConnection piped to Stop-Process instead.',
    });
    expect(core.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'sess-live' }));
  });

  it('leaves sessionId off entirely when no hook has run', async () => {
    const { insertEntry } = await import('@devbrain/core');
    const client = await buildTestClient();
    await callTool(client, 'save_entry', {
      type: 'note', title: 'The dashboard serves on 8080 by default',
      content: 'devbrain-mcp --serve, or PORT to override.',
    });
    expect(insertEntry).toHaveBeenCalledWith(expect.not.objectContaining({ sessionId: expect.anything() }));
  });

  // The same trap as supersedes, and worse: a fix restates the bug it closes
  // almost word for word, so counted as a duplicate the fix is never recorded,
  // the link is never written, and the bug stays open for good.
  it('does not let the bug being closed block its own fix as a duplicate', async () => {
    const core = await import('@devbrain/core');
    vi.mocked(core.findDuplicate).mockResolvedValueOnce({ entry: mockFix as never, similarity: 0.96 });
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'JWT token expires in production — read exp from the IdP',
      content: 'The IdP sets exp; TOKEN_EXPIRY was never read.', fixes: 'e1',
    })).content[0].text;
    expect(text).not.toContain('already known');
    expect(text).toContain('Closes');
    expect(core.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ fixes: 'e1' }));
  });

  it('does not let the entry being corrected block its correction as a duplicate', async () => {
    // A correction is naturally similar to what it corrects. Counting that as
    // "already known" meant the wrong entry could never be retracted.
    const core = await import('@devbrain/core');
    vi.mocked(core.findDuplicate).mockResolvedValueOnce({ entry: mockFix as never, similarity: 0.95 });
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'JWT token expires in production — the real cause',
      content: 'The IdP sets exp.', supersedes: 'e1',
    })).content[0].text;
    expect(text).not.toContain('already known');
    expect(text).toContain('Retracted');
  });

  it('refuses to retract an entry indexed from a file, and points at the file', async () => {
    const core = await import('@devbrain/core');
    vi.mocked(core.getAllEntriesWithProjects).mockResolvedValueOnce([
      { ...mockFix, source: { file: 'CLAUDE.md', anchor: 'a', hash: 'h', heading: 'Auth > JWT', indexedAt: 1 } },
    ] as never);
    const client = await buildTestClient();
    const text = (await callTool(client, 'save_entry', {
      type: 'fix', title: 'x is wrong', content: 'y', supersedes: 'e1',
    })).content[0].text;
    expect(text).toContain('CLAUDE.md');
    expect(core.insertEntry).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'x is wrong' }));
  });
});

describe('MCP tool: search_knowledge', () => {
  it('returns results for a query, each with an id', async () => {
    const client = await buildTestClient();
    const text = (await callTool(client, 'search_knowledge', { query: 'JWT token expiry' })).content[0].text;
    expect(text).toContain('DevBrain results');
    expect(text).toMatch(/id: e1/);
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

  it('with no query, lists entries by filter (what query_entries did)', async () => {
    const client = await buildTestClient();
    const text = (await callTool(client, 'search_knowledge', { type: 'decision' })).content[0].text;
    expect(text).toContain('DevBrain entries (1)');
    expect(text).toContain('Use JWT over sessions');
    expect(text).not.toContain('JWT token expires');
  });

  it('applies type filters to a search too', async () => {
    const { preciseSearch } = await import('@devbrain/core');
    const client = await buildTestClient();
    await callTool(client, 'search_knowledge', { query: 'jwt', type: 'decision' });
    const candidates = vi.mocked(preciseSearch).mock.calls.at(-1)![2] as { id: string }[];
    expect(candidates.map(c => c.id)).toEqual(['e2']);
  });
});

describe('MCP tools list', () => {
  it('exposes exactly the three tools', async () => {
    const client = await buildTestClient();
    const { tools } = await client.listTools();
    // Compare the whole set: adding a tool without listing it here should fail
    // with its name.
    expect(tools.map(t => t.name).sort()).toEqual(['get_context', 'save_entry', 'search_knowledge']);
  });

  it('tells the agent how to correct a wrong entry', async () => {
    const client = await buildTestClient();
    const { tools } = await client.listTools();
    const save = tools.find(t => t.name === 'save_entry')!;
    expect(save.description).toMatch(/supersedes/);
    expect(Object.keys(save.inputSchema.properties as object)).toContain('supersedes');
  });

  it('answers an old tool name with the current ones', async () => {
    const client = await buildTestClient();
    const result = await callTool(client, 'task_start', { description: 'x' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('get_context, search_knowledge and save_entry');
  });

  it('tool descriptions contain imperative CALL THIS language', async () => {
    const client = await buildTestClient();
    const { tools } = await client.listTools();
    for (const t of tools) expect(t.description).toMatch(/CALL THIS/);
  });
});
