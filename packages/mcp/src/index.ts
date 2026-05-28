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
  getEntriesByProject, getAllEntriesWithProjects, getAllProjects,
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

    // ─── STUNNING DEVCONTEXT DASHBOARD HTML ─────────────────────────────────────
    const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevBrain — Developer Memory System</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #070a13;
      --panel-bg: rgba(15, 23, 42, 0.65);
      --panel-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent-cyan: #06b6d4;
      --accent-magenta: #d946ef;
      --accent-green: #10b981;
      --accent-red: #f43f5e;
      --accent-yellow: #eab308;
      --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: var(--panel-border) transparent;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      background-image: 
        radial-gradient(circle at 12% 18%, rgba(6, 182, 212, 0.06) 0%, transparent 45%),
        radial-gradient(circle at 88% 82%, rgba(217, 70, 239, 0.06) 0%, transparent 45%);
    }

    /* Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--panel-border);
      border-radius: 4px;
    }

    /* Container */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }

    /* Navigation & Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 1.5rem;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-glow {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta));
      box-shadow: 0 0 12px var(--accent-cyan);
      animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); box-shadow: 0 0 18px var(--accent-magenta); }
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .mcp-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--accent-green);
    }

    .mcp-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
    }

    /* Grid layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: var(--glass-shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: var(--transition);
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-sub {
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* Main Area Split */
    .main-layout {
      display: grid;
      grid-template-columns: 1.7fr 1.3fr;
      gap: 2rem;
    }

    .panel {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: var(--glass-shadow);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .panel-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-primary);
    }

    .panel-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: -1.25rem;
      margin-bottom: 1.5rem;
      line-height: 1.4;
    }

    /* Search Input & Controls */
    .search-container {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .input-glow-focus {
      flex: 1;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 0.8rem 1rem;
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      outline: none;
      transition: var(--transition);
    }

    .input-glow-focus:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
    }

    .btn {
      background: linear-gradient(135deg, var(--accent-cyan), #0891b2);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.8rem 1.5rem;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
      filter: brightness(1.1);
    }

    .btn-secondary {
      background: linear-gradient(135deg, var(--accent-magenta), #c084fc);
    }

    .btn-secondary:hover {
      box-shadow: 0 4px 15px rgba(217, 70, 239, 0.4);
    }

    /* Results */
    .results-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 520px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .result-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      padding: 1.25rem;
      transition: var(--transition);
    }

    .result-card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(30, 41, 59, 0.55);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .card-title-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-meta {
      font-size: 0.75rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .badge-bug { background: rgba(244, 63, 94, 0.15); color: var(--accent-red); border: 1px solid rgba(244, 63, 94, 0.2); }
    .badge-fix { background: rgba(16, 185, 129, 0.15); color: var(--accent-green); border: 1px solid rgba(16, 185, 129, 0.2); }
    .badge-decision { background: rgba(217, 70, 239, 0.15); color: var(--accent-magenta); border: 1px solid rgba(217, 70, 239, 0.2); }
    .badge-pattern { background: rgba(234, 179, 8, 0.15); color: var(--accent-yellow); border: 1px solid rgba(234, 179, 8, 0.2); }
    .badge-lesson { background: rgba(234, 179, 8, 0.15); color: var(--accent-yellow); border: 1px solid rgba(234, 179, 8, 0.2); }
    .badge-anti-pattern { background: rgba(244, 63, 94, 0.2); color: var(--accent-red); border: 1px solid rgba(244, 63, 94, 0.3); }
    .badge-other { background: rgba(148, 163, 184, 0.15); color: var(--text-secondary); border: 1px solid rgba(148, 163, 184, 0.2); }

    .score-badge {
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.2);
      color: var(--accent-cyan);
      font-family: monospace;
      font-size: 0.8rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .card-content {
      font-size: 0.85rem;
      line-height: 1.5;
      color: #cbd5e1;
      white-space: pre-line;
      margin-bottom: 0.75rem;
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tag {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--text-secondary);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 0.4rem;
    }

    select, textarea {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 0.8rem;
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      outline: none;
      transition: var(--transition);
    }

    select:focus, textarea:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    .form-submit-btn {
      width: 100%;
      justify-content: center;
      padding: 0.9rem;
    }

    /* Context viewer styling */
    .context-viewer {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      padding: 1.25rem;
      font-family: monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      color: #e2e8f0;
      max-height: 480px;
      overflow-y: auto;
      white-space: pre-wrap;
      display: none;
    }

    .context-header-block {
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      color: var(--accent-cyan);
    }

    .markdown-rendered h3 {
      color: var(--accent-cyan);
      font-size: 1rem;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid rgba(6, 182, 212, 0.2);
      padding-bottom: 0.25rem;
    }
    .markdown-rendered p {
      margin: 0.5rem 0;
    }
    .markdown-rendered ul {
      margin: 0.5rem 0;
      padding-left: 1.25rem;
    }
    .markdown-rendered li {
      margin-bottom: 0.25rem;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--accent-green);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      transform: translateY(150%);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toast.show {
      transform: translateY(0);
    }

    .toast-success-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent-green);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: #070a13;
      font-weight: bold;
    }

    /* Doc section */
    .doc-section {
      margin-top: 3rem;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.3), rgba(15, 23, 42, 0.3));
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 2.5rem;
    }

    .doc-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      margin-top: 1.5rem;
    }

    .doc-col h4 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--accent-cyan);
      margin-bottom: 0.75rem;
    }

    .doc-col p {
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
      .main-layout { grid-template-columns: 1fr; }
      .doc-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <div class="logo-glow"></div>
        <h1>DevBrain</h1>
      </div>
      <div class="mcp-status">
        <div class="mcp-status-dot"></div>
        <span>MCP REST Engine Connected</span>
      </div>
    </header>

    <!-- Stats Grid -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-label">Total Memories</div>
        <div class="stat-value" id="stat-memories">--</div>
        <div class="stat-sub">📦 Active saved entries</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tracked Projects</div>
        <div class="stat-value" id="stat-projects">--</div>
        <div class="stat-sub">📂 Registered codebases</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Brain Engine</div>
        <div class="stat-value" style="font-size: 1.6rem; line-height: 2.25rem; font-weight:600; color:var(--accent-cyan)">Gemini 2.0</div>
        <div class="stat-sub">🧠 Google Cloud AI Models</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vector Storage</div>
        <div class="stat-value" style="font-size: 1.6rem; line-height: 2.25rem; font-weight:600; color:var(--accent-magenta)">MongoDB Atlas</div>
        <div class="stat-sub">⚡ 3072-dim Vector Search</div>
      </div>
    </div>

    <!-- Main Workspace Split -->
    <div class="main-layout">
      
      <!-- Left Panel: Playground Search & Context -->
      <div class="panel">
        <div class="panel-title">
          <span>DevBrain Search & Synthesis Playground</span>
          <div style="display:flex; gap:0.5rem">
            <button class="btn" id="tab-search" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Search</button>
            <button class="btn btn-secondary" id="tab-context" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">AI Context</button>
          </div>
        </div>
        <p class="panel-subtitle" id="playground-desc">Query your long-term technical memory with MongoDB Atlas Vector Search. Simply type a technical question or bug description below.</p>

        <!-- Search Mode Layout -->
        <div id="search-section">
          <div class="search-container">
            <input type="text" id="search-input" class="input-glow-focus" placeholder="Search bugs, architectural decisions or stack patterns..." />
            <button class="btn" id="search-btn">
              <span>Search</span>
            </button>
          </div>

          <div class="results-grid" id="results-container">
            <div class="empty-state">
              <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <span>No search performed yet. Type a query above to test hybrid technical search.</span>
            </div>
          </div>
        </div>

        <!-- AI Context Mode Layout -->
        <div id="context-section" style="display: none;">
          <div class="search-container">
            <input type="text" id="context-query" class="input-glow-focus" placeholder="Topic filter (optional) e.g., auth, database..." />
            <button class="btn btn-secondary" id="context-btn">
              <span>Generate Context</span>
            </button>
          </div>

          <div class="context-viewer" id="context-raw-container"></div>
          <div class="panel" style="background: rgba(30, 41, 59, 0.2); border-color: rgba(255,255,255,0.03); margin-top: 1rem; display:none" id="context-rendered-panel">
            <div class="stat-label" style="color:var(--accent-magenta)">Synthesized Dev Context (Formatted)</div>
            <div class="markdown-rendered" id="context-rendered-container" style="font-size:0.9rem; line-height:1.6; color:#e2e8f0"></div>
          </div>
          <div class="empty-state" id="context-empty-state">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <span>Generates fully synthesized and prioritized project context using Gemini 2.0 Flash and historical database logs.</span>
          </div>
        </div>

      </div>

      <!-- Right Panel: Save Memory Ingestor -->
      <div class="panel">
        <div class="panel-title">Ingest Technical Knowledge</div>
        <p class="panel-subtitle">Manually seed memories to feed the Vector database. Your AI Agent will automatically read these when answering future queries.</p>
        
        <form id="ingest-form">
          <div class="form-row">
            <div class="form-group">
              <label for="ingest-type">Entry Type</label>
              <select id="ingest-type" required>
                <option value="bug">Bug</option>
                <option value="fix" selected>Fix</option>
                <option value="decision">Decision</option>
                <option value="pattern">Pattern</option>
                <option value="lesson">Lesson</option>
                <option value="stack">Stack</option>
                <option value="anti-pattern">Anti-Pattern</option>
              </select>
            </div>
            <div class="form-group">
              <label for="ingest-category">Category</label>
              <select id="ingest-category" required>
                <option value="auth">auth</option>
                <option value="database" selected>database</option>
                <option value="deployment">deployment</option>
                <option value="build">build</option>
                <option value="config">config</option>
                <option value="network">network</option>
                <option value="performance">performance</option>
                <option value="ui">ui</option>
                <option value="data">data</option>
                <option value="testing">testing</option>
                <option value="security">security</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="ingest-title">Short Title / Subject</label>
            <input type="text" id="ingest-title" class="input-glow-focus" placeholder="e.g. Rate-limit 429 connection failures on startup" required />
          </div>

          <div class="form-group">
            <label for="ingest-content">Full Description & Technical Solution</label>
            <textarea id="ingest-content" placeholder="Describe the problem, root cause and exact technical resolution..." required></textarea>
          </div>

          <div class="form-group">
            <label for="ingest-tags">Tags (comma-separated)</label>
            <input type="text" id="ingest-tags" class="input-glow-focus" placeholder="e.g. mongodb, express, retry-delay, nodejs" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ingest-error">Exact Error Pattern (optional)</label>
              <input type="text" id="ingest-error" class="input-glow-focus" placeholder="e.g. RESOURCE_EXHAUSTED" />
            </div>
            <div class="form-group">
              <label for="ingest-cause">Cause Archetype (optional)</label>
              <input type="text" id="ingest-cause" class="input-glow-focus" placeholder="e.g. environment divergence" />
            </div>
          </div>

          <button type="submit" class="btn form-submit-btn" style="margin-top: 1rem;" id="submit-btn">
            <span>Ingest to DevBrain Database</span>
          </button>
        </form>
      </div>

    </div>

    <!-- Compliant Documentation Section -->
    <div class="doc-section">
      <h3 style="font-family:'Outfit'; font-size:1.4rem; color:var(--text-primary);">Integration & Architecture</h3>
      <div class="doc-grid">
        <div class="doc-col">
          <h4>Google Cloud Run</h4>
          <p>This DevBrain instance runs inside a highly optimized Docker container deployed to Google Cloud Run, serving both as an HTTP JSON REST API for Google Cloud Agent Builder and as an SSE Streamable MCP endpoint on <code>/mcp</code>.</p>
        </div>
        <div class="doc-col">
          <h4>MongoDB Atlas Vector Search</h4>
          <p>Leverages high-dimensional technical embeddings (3072 dimensions) mapped by <code>gemini-embedding-001</code> and stores them natively in MongoDB Atlas. Employs hybrid keyword and vector cosine-similarity indices to achieve lightning-fast retrieval.</p>
        </div>
        <div class="doc-col">
          <h4>Gemini AI Synthesis</h4>
          <p>Integrates Gemini 2.0 Flash to automatically summarize and categorize session recaps, extract deep transferable archetypes, and compress ranked vector matches into actionable context blocks for downstream agents.</p>
        </div>
      </div>
    </div>

  </div>

  <!-- Toast Toast Notification -->
  <div class="toast" id="success-toast">
    <div class="toast-success-icon">✓</div>
    <span id="toast-message">Knowledge Ingested Successfully!</span>
  </div>

  <script>
    // Tab switching
    const tabSearch = document.getElementById('tab-search');
    const tabContext = document.getElementById('tab-context');
    const searchSection = document.getElementById('search-section');
    const contextSection = document.getElementById('context-section');
    const playDesc = document.getElementById('playground-desc');

    tabSearch.addEventListener('click', () => {
      searchSection.style.display = 'block';
      contextSection.style.display = 'none';
      playDesc.innerText = 'Query your long-term technical memory with MongoDB Atlas Vector Search. Simply type a technical question or bug description below.';
    });

    tabContext.addEventListener('click', () => {
      searchSection.style.display = 'none';
      contextSection.style.display = 'block';
      playDesc.innerText = 'Simulate memory synthesis blocks compiled for standard LLM prompt headers. Gemini evaluates your entire project history and produces a ranked, aggregated snapshot.';
    });

    // Render Stats
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('stat-memories').innerText = data.totalEntries ?? 0;
        document.getElementById('stat-projects').innerText = data.totalProjects ?? 0;
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    }

    // Toast show helper
    function showToast(msg) {
      const toast = document.getElementById('success-toast');
      document.getElementById('toast-message').innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // Render Search Results
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');

    async function performSearch() {
      const query = searchInput.value.trim();
      if (!query) return;

      searchBtn.disabled = true;
      searchBtn.innerText = 'Searching...';

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        
        resultsContainer.innerHTML = '';
        const results = data.results ?? [];

        if (results.length === 0) {
          resultsContainer.innerHTML = \`<div class="empty-state">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>No technical matches found. Try another technical term or bug error log.</span>
          </div>\`;
        } else {
          results.forEach(r => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            const badgeClass = 'badge-' + (r.type || 'other');
            const matchScore = r.match || 'Match';

            const tagsHTML = (r.tags || []).map(t => \`<span class="tag">\${t}</span>\`).join('');

            card.innerHTML = \`
              <div class="card-header">
                <div class="card-title-group">
                  <div class="card-title">\${r.title}</div>
                  <div class="card-meta">
                    <span class="badge \${badgeClass}">\${r.type}</span>
                    <span>Project: <b>\${r.project}</b></span>
                  </div>
                </div>
                <div class="score-badge">\${matchScore}</div>
              </div>
              <div class="card-content">\${r.content}</div>
              <div class="card-tags">\${tagsHTML}</div>
            \`;
            resultsContainer.appendChild(card);
          });
        }
      } catch (err) {
        resultsContainer.innerHTML = \`<div class="empty-state" style="color:var(--accent-red)">
          <span>Search encountered an error. Ensure GEMINI_API_KEY is active.</span>
        </div>\`;
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerText = 'Search';
      }
    }

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });

    // Context Generator
    const contextBtn = document.getElementById('context-btn');
    const contextInput = document.getElementById('context-query');
    const contextRaw = document.getElementById('context-raw-container');
    const contextEmpty = document.getElementById('context-empty-state');
    const contextRenderedPanel = document.getElementById('context-rendered-panel');
    const contextRendered = document.getElementById('context-rendered-container');

    function renderMarkdown(md) {
      // simple MD parser for high-end styling
      let html = md
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/## (.*)/g, '<h3>$1</h3>')
        .replace(/• (.*)/g, '<li>$1</li>')
        .replace(/- (.*)/g, '<li>$1</li>')
        .replace(/\`([^\`]+)\`/g, '<code style="background:rgba(255,255,255,0.08); padding:0.15rem 0.3rem; border-radius:4px; font-family:monospace; color:var(--accent-cyan)">$1</code>');
      
      // Wrap lists
      html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1<\/ul>');
      return html;
    }

    contextBtn.addEventListener('click', async () => {
      const q = contextInput.value.trim();
      contextBtn.disabled = true;
      contextBtn.innerText = 'Synthesizing...';

      try {
        const res = await fetch('/api/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        if (!res.ok) throw new Error('Context synthesis failed');
        const data = await res.json();
        
        contextEmpty.style.display = 'none';
        contextRaw.style.display = 'block';
        contextRaw.innerText = '=== MCP DEV_CONTEXT INJECTED ===\\n\\n' + data.text;
        
        contextRenderedPanel.style.display = 'block';
        contextRendered.innerHTML = renderMarkdown(data.text);
      } catch (err) {
        showToast('Error generating AI context');
      } finally {
        contextBtn.disabled = false;
        contextBtn.innerText = 'Generate Context';
      }
    });

    // Ingestion Form Submit
    const ingestForm = document.getElementById('ingest-form');
    const submitBtn = document.getElementById('submit-btn');

    ingestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerText = 'Ingesting...';

      const type = document.getElementById('ingest-type').value;
      const category = document.getElementById('ingest-category').value;
      const title = document.getElementById('ingest-title').value.trim();
      const content = document.getElementById('ingest-content').value.trim();
      const tagsText = document.getElementById('ingest-tags').value.trim();
      const error_pattern = document.getElementById('ingest-error').value.trim();
      const cause_archetype = document.getElementById('ingest-cause').value.trim();

      const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t) : [];

      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type, title, content, tags, category,
            error_pattern: error_pattern || undefined,
            cause_archetype: cause_archetype || undefined
          })
        });

        if (!res.ok) throw new Error('Failed to save memory');
        const data = await res.json();
        
        showToast(\`✓ Ingested Entry: "\${title.slice(0, 30)}..."\`);
        ingestForm.reset();
        await loadStats();
      } catch (err) {
        showToast('Error saving entry: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Ingest to DevBrain Database';
      }
    });

    // On Load
    loadStats();
  </script>
</body>
</html>`;

    const httpServer = createServer(async (req, res) => {
      const url = req.url?.split('?')[0];

      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
        res.end(); return;
      }

      if (req.method === 'GET' && url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML_DASHBOARD);
        return;
      }

      if (req.method === 'GET' && url === '/health') {
        json(res, 200, { status: 'ok', service: 'devbrain-mcp' }); return;
      }

      if (req.method === 'GET' && url === '/openapi.json') {
        json(res, 200, OPENAPI_SPEC); return;
      }

      if (req.method === 'GET' && url === '/api/stats') {
        try {
          const all = await getAllEntriesWithProjects();
          const projects = await getAllProjects();
          const counts: Record<string, number> = { bug: 0, fix: 0, note: 0, decision: 0, pattern: 0, lesson: 0, stack: 0, solution: 0, 'anti-pattern': 0 };
          for (const e of all) { if (e.type in counts) counts[e.type]++; }
          json(res, 200, {
            totalEntries: all.length,
            totalProjects: projects.length,
            counts,
          });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
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
    // stdio mode — local MCP client / agent
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
})();
