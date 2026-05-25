#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  getProjectByPath, upsertProject, insertEntry,
  getEntriesByProject, getAllEntriesWithProjects,
  getRepoRoot, getProjectName, detectStack,
  getEmbedding, similarityLabel, timeAgo,
  buildContext, compressContext, formatContext,
  bumpRetrievalCounts, preciseSearch, vectorSearch,
} from '@devbrain/core';
import type { EntryCategory } from '@devbrain/core';
import type { Entry } from '@devbrain/core';
import { nanoid } from 'nanoid';

// Load GEMINI_API_KEY from ~/.devbrain/.env
const envPath = join(homedir(), '.devbrain', '.env');
if (!process.env.GEMINI_API_KEY && existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=');
    if (k?.trim()) process.env[k.trim()] = v.join('=').trim();
  }
}

const server = new Server(
  { name: 'devbrain', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'save_entry',
      description:
        'Save knowledge to DevBrain. Call this when you fix a bug, make an architectural decision, ' +
        'discover a reusable pattern, or want to preserve something useful about the project for future sessions.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['bug', 'fix', 'decision', 'pattern', 'lesson', 'stack', 'solution', 'note', 'anti-pattern'],
            description: 'bug=problem found · fix=solution applied · decision=architectural choice · pattern=reusable approach · lesson=learned the hard way · stack=technologies used',
          },
          title: {
            type: 'string',
            description: 'One-line description of the problem or thing to remember (max 120 chars)',
          },
          content: {
            type: 'string',
            description: 'The full solution, explanation, or detail',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relevant tags: language, framework, error type, concept',
          },
          category: {
            type: 'string',
            enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'],
            description: 'Problem category — pick the best fit for precise future retrieval',
          },
          error_pattern: {
            type: 'string',
            description: 'The exact error message, exception text, or specific symptom that identifies this bug. Used for precise matching. Include if applicable.',
          },
          cause_archetype: {
            type: 'string',
            description: 'The abstract root-cause pattern transferable across projects — e.g. "environment config divergence on time-dependent values". Include for bugs/anti-patterns when the root cause generalizes beyond this project.',
          },
          project_path: {
            type: 'string',
            description: 'Absolute path to the project directory. Omit to use the current working directory.',
          },
        },
        required: ['type', 'title', 'content'],
      },
    },
    {
      name: 'search_knowledge',
      description:
        'Search DevBrain for past solutions, bugs, decisions, and patterns across all projects. ' +
        'Call this at the start of a task to check if this problem was solved before. ' +
        'Pass category and error_pattern when known — enables precise pattern matching, not just semantic similarity.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language description of the problem or what you are looking for' },
          category: {
            type: 'string',
            enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'],
            description: 'Problem category if known — boosts relevant results',
          },
          error_pattern: {
            type: 'string',
            description: 'Exact error message or symptom text if available — enables direct pattern matching',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_project_summary',
      description: 'Get the stored knowledge summary for a project — stack, entry counts, and recent captures.',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: {
            type: 'string',
            description: 'Absolute path to the project. Omit to use the current working directory.',
          },
        },
      },
    },
    {
      name: 'get_context',
      description:
        'Get ranked historical context from DevBrain to initialize reasoning before starting a task. ' +
        'Returns past issues, architecture decisions, patterns, and stack notes — deduplicated and weighted ' +
        'by relevance, recency, and project match. Call this at the start of any non-trivial task.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Optional topic to focus the context (e.g. "auth", "database migrations"). Omit for general project context.',
          },
          project_path: {
            type: 'string',
            description: 'Absolute path to the project. Omit to use the current working directory.',
          },
        },
      },
    },
    {
      name: 'query_entries',
      description:
        'Directly browse DevBrain entries by type, category, project, or recency — no search query needed. ' +
        'Use this when you know the shape of knowledge you want: e.g. all anti-patterns, all auth decisions, ' +
        'all bugs in this project from the last 30 days. Complements search_knowledge (semantic) and get_context (ranked blend).',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['bug', 'fix', 'decision', 'pattern', 'lesson', 'stack', 'solution', 'note', 'anti-pattern'],
            description: 'Filter by entry type. Omit to include all types.',
          },
          category: {
            type: 'string',
            enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'],
            description: 'Filter by problem category.',
          },
          project_path: {
            type: 'string',
            description: 'Limit to a specific project. Omit to search across all projects.',
          },
          since_days: {
            type: 'number',
            description: 'Only return entries created within this many days. Omit for all time.',
          },
          limit: {
            type: 'number',
            description: 'Max entries to return (default 20, max 50).',
          },
        },
      },
    },
  ],
}));

function saveConfirmation(
  type: string, title: string,
  category?: string, causeArchetype?: string, errorPattern?: string
): string {
  const cat   = category && category !== 'other' ? ` ${category}` : '';
  const short = title.slice(0, 65);

  if (type === 'fix') {
    if (causeArchetype) return `Stored recurring${cat} fix archetype: ${causeArchetype.slice(0, 70)}`;
    if (errorPattern)   return `Saved new${cat} fix — error pattern stored for future matching`;
    return `Saved new${cat} fix: ${short}`;
  }
  if (type === 'decision')     return `Detected architectural decision: ${short}`;
  if (type === 'anti-pattern') {
    if (causeArchetype) return `Stored anti-pattern archetype: ${causeArchetype.slice(0, 70)}`;
    return `Stored${cat} anti-pattern to avoid: ${short}`;
  }
  if (type === 'bug') {
    if (causeArchetype) return `Stored${cat} bug + root-cause archetype: ${causeArchetype.slice(0, 70)}`;
    return `Stored${cat} bug: ${short}`;
  }
  if (type === 'pattern') return `Captured reusable${cat} pattern: ${short}`;
  if (type === 'lesson') {
    if (causeArchetype) return `Stored recurring issue archetype: ${causeArchetype.slice(0, 70)}`;
    return `Captured hard-won${cat} lesson: ${short}`;
  }
  if (type === 'stack')    return `Stack snapshot saved: ${short}`;
  if (type === 'solution') return `Saved${cat} solution: ${short}`;
  return `Saved [${type}]${cat ? ' · ' + cat.trim() : ''}: ${short}`;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── save_entry ─────────────────────────────────────────────────────────────
    if (name === 'save_entry') {
      const { type, title, content, tags = [], category, error_pattern, cause_archetype, project_path } = args as {
        type: Entry['type']; title: string; content: string;
        tags?: string[]; category?: EntryCategory; error_pattern?: string; cause_archetype?: string; project_path?: string;
      };

      const cwd      = project_path ?? process.cwd();
      const repoRoot = getRepoRoot(cwd) ?? cwd;
      let project    = await getProjectByPath(repoRoot);

      if (!project) {
        project = {
          id: nanoid(), name: getProjectName(repoRoot), path: repoRoot,
          stack: detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now(),
        };
        await upsertProject(project);
      }

      let embedding: number[] | undefined;
      try { embedding = await getEmbedding(`${title} ${content} ${tags.join(' ')}`); } catch {}

      await insertEntry({
        id: nanoid(), projectId: project.id,
        type, title: title.slice(0, 120), content, tags,
        embedding, createdAt: Date.now(), confidence: 'observation',
        ...(category       ? { category }                        : {}),
        ...(error_pattern  ? { errorPattern: error_pattern }     : {}),
        ...(cause_archetype ? { causeArchetype: cause_archetype } : {}),
      });

      const confirmation = saveConfirmation(type, title, category, cause_archetype, error_pattern);
      return {
        content: [{ type: 'text', text: `DevBrain: ${confirmation}` }],
      };
    }

    // ── search_knowledge ───────────────────────────────────────────────────────
    if (name === 'search_knowledge') {
      const { query, category, error_pattern } = args as {
        query: string; category?: EntryCategory; error_pattern?: string;
      };
      const searchText     = error_pattern ? `${query} ${error_pattern}` : query;
      const queryEmbedding = await getEmbedding(searchText);

      // Atlas Vector Search — fast ANN retrieval, then re-rank with preciseSearch
      let candidates;
      try {
        candidates = await vectorSearch(queryEmbedding, { topK: 20 });
      } catch {
        // fallback to in-memory if index not ready
        candidates = await getAllEntriesWithProjects();
      }

      const results = preciseSearch(searchText, queryEmbedding, candidates, {
        category, topK: 6, threshold: 0.45,
      });

      if (results.length === 0) {
        return { content: [{ type: 'text', text: `No matches found in DevBrain for: "${query}"` }] };
      }

      const callerProject = await getProjectByPath(getRepoRoot(process.cwd()) ?? process.cwd()).catch(() => null);
      await bumpRetrievalCounts(results.map(r => r.entry.id), callerProject?.id);

      const text = results.map((r, i) => {
        const matchLabel = r.matchType === 'pattern' ? 'pattern match' : similarityLabel(r.similarity);
        const catLabel   = r.entry.category ? ` [${r.entry.category}]` : '';
        return (
          `${i + 1}. [${r.entry.type}]${catLabel} ${r.entry.title}\n` +
          `   ${matchLabel} · ${r.project.name} · ${timeAgo(r.entry.createdAt)}\n` +
          (r.entry.errorPattern ? `   pattern: ${r.entry.errorPattern}\n` : '') +
          `   ${r.entry.content}` +
          (r.entry.tags.length ? `\n   tags: ${r.entry.tags.join(', ')}` : '')
        );
      }).join('\n\n');

      return { content: [{ type: 'text', text: `DevBrain results for "${query}":\n\n${text}` }] };
    }

    // ── get_project_summary ────────────────────────────────────────────────────
    if (name === 'get_project_summary') {
      const { project_path } = ((args ?? {}) as { project_path?: string });
      const cwd      = project_path ?? process.cwd();
      const repoRoot = getRepoRoot(cwd) ?? cwd;
      const project  = await getProjectByPath(repoRoot);

      if (!project) {
        return { content: [{ type: 'text', text: 'Project not tracked in DevBrain. Run: devbrain init' }] };
      }

      const entries = await getEntriesByProject(project.id);
      const counts  = { bug: 0, fix: 0, note: 0, decision: 0, pattern: 0, lesson: 0, stack: 0, solution: 0 };
      for (const e of entries) { if (e.type in counts) counts[e.type as keyof typeof counts]++; }

      const recent = entries.slice(0, 6).map(e =>
        `  [${e.type}] ${e.title.slice(0, 80)} (${timeAgo(e.createdAt)})`
      ).join('\n');

      const summary = [
        `Project: ${project.name}`,
        `Stack:   ${project.stack.join(', ') || 'Unknown'}`,
        `Entries: ${entries.length} total`,
        `         ${Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}s`).join(' · ')}`,
        entries.length ? `\nRecent:\n${recent}` : '',
      ].filter(Boolean).join('\n');

      return { content: [{ type: 'text', text: summary }] };
    }

    // ── get_context ────────────────────────────────────────────────────────────
    if (name === 'get_context') {
      const { query, project_path } = ((args ?? {}) as { query?: string; project_path?: string });
      const cwd      = project_path ?? process.cwd();
      const repoRoot = getRepoRoot(cwd) ?? cwd;
      const project  = await getProjectByPath(repoRoot);
      const all      = await getAllEntriesWithProjects();

      let queryEmbedding: number[] | undefined;
      if (query?.trim()) {
        try { queryEmbedding = await getEmbedding(query); } catch {}
      }

      const raw  = buildContext(all, project ?? null, queryEmbedding, query);
      const ctx  = await compressContext(raw);
      const text = formatContext(ctx, query);

      const retrievedIds = [
        ...raw.issues, ...raw.decisions, ...raw.patterns, ...raw.antiPatterns, ...raw.stacks,
        ...(raw.crossProjectPatterns ?? []),
      ].map(r => r.entry.id);
      await bumpRetrievalCounts(retrievedIds, project?.id);

      return { content: [{ type: 'text', text }] };
    }

    // ── query_entries ──────────────────────────────────────────────────────────
    if (name === 'query_entries') {
      const { type, category, project_path, since_days, limit = 20 } = (args ?? {}) as {
        type?: string; category?: EntryCategory; project_path?: string;
        since_days?: number; limit?: number;
      };

      const all = await getAllEntriesWithProjects();
      const cutoff = since_days ? Date.now() - since_days * 86_400_000 : 0;

      let filtered = all.filter(e => {
        if (e.supersededBy) return false;
        if (type && e.type !== type) return false;
        if (category && e.category !== category) return false;
        if (cutoff && e.createdAt < cutoff) return false;
        if (project_path) {
          const root = getRepoRoot(project_path) ?? project_path;
          const proj = all.find(x => x.project.path === root);
          if (proj && e.projectId !== proj.project.id) return false;
        }
        return true;
      });

      filtered.sort((a, b) => b.createdAt - a.createdAt);
      filtered = filtered.slice(0, Math.min(limit, 50));

      if (filtered.length === 0) {
        const filters = [type, category, since_days ? `last ${since_days}d` : null].filter(Boolean).join(', ');
        return { content: [{ type: 'text', text: `No entries found${filters ? ` matching: ${filters}` : ''}.` }] };
      }

      const callerProject = await getProjectByPath(getRepoRoot(process.cwd()) ?? process.cwd()).catch(() => null);
      await bumpRetrievalCounts(filtered.map(e => e.id), callerProject?.id);

      const text = filtered.map((e, i) => {
        const catLabel  = e.category ? ` [${e.category}]` : '';
        const conf      = e.confidence && e.confidence !== 'observation' ? ` · ${e.confidence}` : '';
        const crossBadge = (e.seenInProjects?.length ?? 0) >= 2 ? ` · ×${e.seenInProjects!.length} projects` : '';
        return (
          `${i + 1}. [${e.type}]${catLabel} ${e.title}\n` +
          `   ${e.project.name} · ${timeAgo(e.createdAt)}${conf}${crossBadge}\n` +
          (e.errorPattern   ? `   pattern: ${e.errorPattern}\n`      : '') +
          (e.causeArchetype ? `   archetype: ${e.causeArchetype}\n`   : '') +
          `   ${e.content.slice(0, 200)}` +
          (e.tags.length    ? `\n   tags: ${e.tags.join(', ')}`       : '')
        );
      }).join('\n\n');

      const header = `DevBrain entries${type ? ` · type:${type}` : ''}${category ? ` · category:${category}` : ''}${since_days ? ` · last ${since_days}d` : ''} (${filtered.length} results)`;
      return { content: [{ type: 'text', text: `${header}\n\n${text}` }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };

  } catch (err) {
    return {
      content: [{ type: 'text', text: `DevBrain error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

(async () => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : null;

  if (PORT) {
    // HTTP mode — Cloud Run

    function json(res: import('http').ServerResponse, status: number, data: unknown) {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    }

    function readBody(req: import('http').IncomingMessage): Promise<unknown> {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
      });
    }

    const BASE_URL = `https://devbrain-715714057208.us-central1.run.app`;

    const OPENAPI_SPEC = {
      openapi: '3.0.0',
      info: { title: 'DevBrain API', version: '1.0.0', description: 'Developer knowledge base — search past bugs, decisions, and patterns across projects.' },
      servers: [{ url: BASE_URL }],
      paths: {
        '/api/search': {
          post: {
            operationId: 'searchKnowledge',
            summary: 'Search past bugs, fixes, decisions, and patterns',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: {
                query: { type: 'string', description: 'Natural language description of the problem' },
                category: { type: 'string', enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'] },
              } } } },
            },
            responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: {
              text: { type: 'string', description: 'Human-readable search results summary' },
              results: { type: 'array', items: { type: 'object', properties: {
                type: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' },
                project: { type: 'string' }, match: { type: 'string' },
              } } },
            } } } } } },
          },
        },
        '/api/save': {
          post: {
            operationId: 'saveEntry',
            summary: 'Save a knowledge entry (bug, fix, decision, pattern, lesson, etc.)',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { type: 'object', required: ['type', 'title', 'content'], properties: {
                type: { type: 'string', enum: ['bug','fix','decision','pattern','lesson','stack','solution','note','anti-pattern'] },
                title: { type: 'string', description: 'One-line summary (max 120 chars)' },
                content: { type: 'string', description: 'Full explanation or solution' },
                tags: { type: 'array', items: { type: 'string' } },
                category: { type: 'string', enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'] },
              } } } },
            },
            responses: { '200': { description: 'Saved confirmation', content: { 'application/json': { schema: { type: 'object', properties: {
              text: { type: 'string', description: 'Confirmation message' },
              saved: { type: 'boolean' },
            } } } } } },
          },
        },
        '/api/context': {
          post: {
            operationId: 'getContext',
            summary: 'Get ranked historical context before starting a task',
            requestBody: {
              required: false,
              content: { 'application/json': { schema: { type: 'object', properties: {
                query: { type: 'string', description: 'Optional topic to focus context' },
              } } } },
            },
            responses: { '200': { description: 'Ranked context', content: { 'application/json': { schema: { type: 'object', properties: {
              text: { type: 'string', description: 'Ranked context as formatted text' },
              context: { type: 'string' },
            } } } } } },
          },
        },
      },
    };

    const httpServer = createServer(async (req, res) => {
      const url = req.url?.split('?')[0];

      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
        res.end(); return;
      }

      if (req.method === 'GET' && url === '/health') {
        json(res, 200, { status: 'ok', service: 'devbrain-mcp' }); return;
      }

      if (req.method === 'GET' && url === '/openapi.json') {
        json(res, 200, OPENAPI_SPEC); return;
      }

      // ── REST API for Agent Builder ─────────────────────────────────────────
      if (url === '/api/search' && req.method === 'POST') {
        try {
          const { query, category, error_pattern } = await readBody(req) as { query: string; category?: EntryCategory; error_pattern?: string };
          if (!query) { json(res, 400, { error: 'query is required' }); return; }
          const searchText = error_pattern ? `${query} ${error_pattern}` : query;
          const queryEmbedding = await getEmbedding(searchText);
          let candidates;
          try { candidates = await vectorSearch(queryEmbedding, { topK: 20 }); }
          catch { candidates = await getAllEntriesWithProjects(); }
          const results = preciseSearch(searchText, queryEmbedding, candidates, { category, topK: 6, threshold: 0.45 });
          await bumpRetrievalCounts(results.map(r => r.entry.id));
          const mapped = results.map(r => ({
            type: r.entry.type, title: r.entry.title, content: r.entry.content,
            tags: r.entry.tags, project: r.project.name, match: similarityLabel(r.similarity),
            matchType: r.matchType, createdAt: r.entry.createdAt,
          }));
          const text = mapped.length === 0
            ? `No results found for "${query}"`
            : mapped.map((r, i) => `${i+1}. [${r.type}] ${r.title}\n   ${r.match} · ${r.project}\n   ${r.content}`).join('\n\n');
          json(res, 200, { text, results: mapped });
        } catch (err) { json(res, 500, { error: String(err) }); }
        return;
      }

      if (url === '/api/save' && req.method === 'POST') {
        try {
          const { type, title, content, tags = [], category, error_pattern, cause_archetype } = await readBody(req) as {
            type: Entry['type']; title: string; content: string;
            tags?: string[]; category?: EntryCategory; error_pattern?: string; cause_archetype?: string;
          };
          if (!type || !title || !content) { json(res, 400, { error: 'type, title, content are required' }); return; }
          // Ensure a real project document exists so $lookup aggregation finds these entries
          const agentProjectId = 'agent-builder';
          const existing = await getProjectByPath('agent-builder');
          if (!existing) {
            await upsertProject({
              id: agentProjectId, name: 'Agent Builder', path: 'agent-builder',
              stack: [], createdAt: Date.now(), lastSeen: Date.now(),
            });
          } else {
            await upsertProject({ ...existing, lastSeen: Date.now() });
          }
          let embedding: number[] | undefined;
          try { embedding = await getEmbedding(`${title} ${content} ${tags.join(' ')}`); } catch {}
          await insertEntry({
            id: nanoid(), projectId: agentProjectId, type,
            title: title.slice(0, 120), content, tags,
            embedding, createdAt: Date.now(), confidence: 'observation',
            ...(category ? { category } : {}),
            ...(error_pattern ? { errorPattern: error_pattern } : {}),
            ...(cause_archetype ? { causeArchetype: cause_archetype } : {}),
          });
          const confirmation = saveConfirmation(type, title, category, cause_archetype, error_pattern);
          json(res, 200, { text: confirmation, saved: true, type, title: title.slice(0, 80) });
        } catch (err) { json(res, 500, { error: String(err) }); }
        return;
      }

      if (url === '/api/context' && req.method === 'POST') {
        try {
          const { query } = await readBody(req) as { query?: string };
          const all = await getAllEntriesWithProjects();
          let queryEmbedding: number[] | undefined;
          if (query?.trim()) { try { queryEmbedding = await getEmbedding(query); } catch {} }
          const raw  = buildContext(all, null, queryEmbedding);
          const ctx  = await compressContext(raw);
          const text = formatContext(ctx, query);
          json(res, 200, { text, context: text });
        } catch (err) { json(res, 500, { error: String(err) }); }
        return;
      }

      if (url === '/mcp') {
        try {
          // Hono reads rawHeaders, not req.headers — patch rawHeaders directly
          const rh = req.rawHeaders;
          let acceptIdx = -1;
          for (let i = 0; i < rh.length; i += 2) {
            if (rh[i].toLowerCase() === 'accept') { acceptIdx = i; break; }
          }
          const cur = acceptIdx !== -1 ? rh[acceptIdx + 1] : '';
          if (!cur.includes('application/json') || !cur.includes('text/event-stream')) {
            if (acceptIdx !== -1) rh[acceptIdx + 1] = 'application/json, text/event-stream';
            else rh.push('Accept', 'application/json, text/event-stream');
          }
          // SDK stateless mode requires a fresh transport per request
          const mcpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
          await server.connect(mcpTransport);
          await mcpTransport.handleRequest(req, res);
        } catch (err) {
          console.error('MCP transport error:', err);
          if (!res.headersSent) { res.writeHead(500); res.end('MCP error'); }
        }
        return;
      }

      res.writeHead(404); res.end('Not found');
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`DevBrain MCP server listening on port ${PORT}`);
    });
  } else {
    // stdio mode — local Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
})();
