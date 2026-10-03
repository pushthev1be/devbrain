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
  autoArchetype, supersedeEntry,
  ENTRY_TYPES, ENTRY_TYPE_NAMES, normalizeType,
  buildDossier, describeStorage, findDuplicate, findTextDuplicate, clip,
  filterUnprocessedCommits, listCommitHashes,
} from '@devbrain/core';
import type { EntryCategory } from '@devbrain/core';
import type { Entry } from '@devbrain/core';
import { nanoid } from 'nanoid';
// NOT imported at the top level. ./agent pulls in @google/adk, which takes ~2.2s
// to load — 85% of this server's startup. Over stdio that delay ran before the
// handshake could be answered, so MCP clients reported CONNECT_TIMEOUT and never
// loaded any tools. runAgent is only used by the HTTP /agent route, so it is
// required at the point of use instead.
type RunAgent = typeof import('./agent').runAgent;
import { HTML_DASHBOARD } from './dashboard';

// Load config from ~/.devbrain/.env (GEMINI_API_KEY, Vertex AI vars, MONGODB_URI, …).
// Loaded unconditionally; real environment variables take precedence, comments skipped.
const envPath = join(homedir(), '.devbrain', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^﻿/, '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    const key = k?.trim();
    if (key && v.length && process.env[key] === undefined) process.env[key] = v.join('=').trim();
  }
}

function saveConfirmation(
  type: string, title: string,
  category?: string, causeArchetype?: string, errorPattern?: string
): string {
  const cat   = category && category !== 'other' ? ` ${category}` : '';
  const short = clip(title, 65);

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

/**
 * Candidate entries for a search, from Atlas Vector Search when it is available
 * and a full scan otherwise.
 *
 * The previous version only fell back inside a `catch`. But `$vectorSearch`
 * against a deployment with no such index does not throw — it returns zero
 * documents. So the fallback never ran, `candidates` stayed empty, and every
 * search answered "No results found" regardless of what was stored. An empty
 * result is treated as "no index" here, which costs one extra query in the rare
 * case where a query genuinely matches nothing.
 */
async function searchCandidates(queryEmbedding: number[]) {
  // No embedding to search with: every entry is a candidate for keyword ranking.
  if (!queryEmbedding.length) return getAllEntriesWithProjects();
  try {
    const hits = await vectorSearch(queryEmbedding, { topK: 20 });
    if (hits.length > 0) return hits;
  } catch {
    // No vector index, or the deployment does not support $vectorSearch.
  }
  return getAllEntriesWithProjects();
}

export function createMcpServer() {

const server = new Server(
  { name: 'devbrain', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// Three tools, one per thing an agent does with memory: read the briefing,
// look something up, write something down. They used to be nine, several of
// which did the same job by another name (task_start/get_context,
// query_entries/query_knowledge_db/search_knowledge, task_end/supersede_entry/
// save_entry), and an agent choosing among nine near-synonyms often chose none.
const CATEGORY_ENUM = ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_context',
      description:
        'CALL THIS at the start of any non-trivial task, before reading files or writing code. ' +
        'Returns this project\'s memory — what broke before and why, what was decided, what to avoid — ' +
        'ranked by relevance to the task you describe, plus how much is stored and what has not been reviewed yet.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The task or topic, e.g. "fix auth token expiry" or "database migrations". Omit for a general briefing.',
          },
          project_path: { type: 'string', description: 'Absolute path to the project. Omit to use the current working directory.' },
        },
      },
    },
    {
      name: 'search_knowledge',
      description:
        'CALL THIS before debugging any error you have not seen before — put the exact error text in error_pattern ' +
        'to find the past fix for it. Also use it to look up past decisions in an area. ' +
        'With no query, it lists entries by filter instead: "all anti-patterns", "auth decisions from the last 30 days". ' +
        'Every result carries an id — pass it to save_entry as `supersedes` if the entry turns out to be wrong.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What you are looking for, in plain words. Omit to list by filters only.' },
          error_pattern: { type: 'string', description: 'Exact error message or symptom text — matched directly, more precise than the query.' },
          type: { type: 'string', enum: [...ENTRY_TYPE_NAMES], description: 'Only entries of this type.' },
          category: { type: 'string', enum: CATEGORY_ENUM, description: 'Only (or, with a query, prefer) entries in this category.' },
          since_days: { type: 'number', description: 'Only entries created within this many days.' },
          project_path: { type: 'string', description: 'Only entries from this project. Omit to search every project.' },
          limit: { type: 'number', description: 'Max results (default 6 for a search, 20 for a listing; max 50).' },
        },
      },
    },
    {
      name: 'save_entry',
      description:
        'CALL THIS when you fix a bug, make a decision, or learn something non-obvious — you did the work, so you write the record; ' +
        'DevBrain stores it. Save each distinct item as its own entry, as soon as you know it. ' +
        'For a bug or fix, include error_pattern with the exact error text so the next search finds it. ' +
        'If something DevBrain told you is wrong, save what is actually true and pass the wrong entry\'s id as `supersedes`: ' +
        'it is retracted in the same call, so it stops being recalled as true.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [...ENTRY_TYPE_NAMES],
            description: 'fix=what broke and how it was fixed · bug=symptom and cause · decision=choice and what was rejected · lesson=looked right, was wrong · anti-pattern=never do this · pattern=reusable approach · stack=version/tool/env fact',
          },
          title: { type: 'string', description: 'The symptom or the decision, searchable, under 90 characters. Not "Fixed X".' },
          content: { type: 'string', description: 'The root cause, then the exact fix — or for a decision, what was chosen, what was rejected, and why.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'A few lowercase words a searcher would type.' },
          category: { type: 'string', enum: CATEGORY_ENUM, description: 'Best-fit problem area.' },
          error_pattern: { type: 'string', description: 'The exact error text, copied verbatim. Include whenever there was one.' },
          cause_archetype: { type: 'string', description: 'The transferable class of mistake, as a short phrase, e.g. "environment config divergence between local and deploy".' },
          supersedes: { type: 'string', description: 'id of an entry this corrects (from search_knowledge). It is retracted in the same call.' },
          project_path: { type: 'string', description: 'Absolute path to the project. Omit to use the current working directory.' },
        },
        required: ['type', 'title', 'content'],
      },
    },
  ],
}));

/** The project at a path (or the working directory), if registered. */
async function projectAt(path?: string) {
  const cwd = path ?? process.cwd();
  return getProjectByPath(getRepoRoot(cwd) ?? cwd).catch(() => null);
}

/** One entry as an agent should read it, id included so it can be corrected. */
function renderEntry(e: Entry & { project: { name: string } }, i: number, lead: string): string {
  const catLabel = e.category ? ` [${e.category}]` : '';
  return (
    `${i + 1}. [${normalizeType(e.type)}]${catLabel} ${e.title}\n` +
    `   ${lead}\n` +
    `   id: ${e.id}\n` +
    (e.errorPattern ? `   error: ${e.errorPattern}\n` : '') +
    (e.causeArchetype ? `   root cause: ${e.causeArchetype}\n` : '') +
    `   ${e.content}` +
    (e.tags.length ? `\n   tags: ${e.tags.join(', ')}` : '')
  );
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── get_context ───────────────────────────────────────────────────────────
    if (name === 'get_context') {
      const { query, project_path } = ((args ?? {}) as { query?: string; project_path?: string });
      const project = await projectAt(project_path);
      const all     = await getAllEntriesWithProjects();

      // Optional: with an AI service, rank semantically; without, by keywords.
      const queryEmbedding = query?.trim() ? await getEmbedding(query).catch(() => undefined) : undefined;

      const raw  = buildContext(all, project ?? null, queryEmbedding, query);
      const ctx  = await compressContext(raw);
      const body = formatContext(ctx, query);

      await bumpRetrievalCounts([
        ...raw.issues, ...raw.decisions, ...raw.patterns, ...raw.antiPatterns, ...raw.stacks,
        ...(raw.crossProjectPatterns ?? []),
      ].map(r => r.entry.id), project?.id);

      // What get_project_summary used to answer separately: is this project
      // tracked, how much is known, and is there history nobody has reviewed.
      let header = 'This project is not registered with DevBrain — run `devbrain init` in it. Showing knowledge from other projects.\n\n';
      if (project) {
        const mine = all.filter(e => e.projectId === project.id && !e.supersededBy);
        const counts = ENTRY_TYPES
          .map(t => [t.type, mine.filter(e => normalizeType(e.type) === t.type).length] as const)
          .filter(([, n]) => n > 0)
          .map(([t, n]) => `${n} ${t}`)
          .join(' · ');
        const unreviewed = (await filterUnprocessedCommits(listCommitHashes(project.path)).catch(() => [])).length;
        header =
          `Project: ${project.name} · stack: ${project.stack.join(', ') || 'unknown'} · ${mine.length} entries${counts ? ` (${counts})` : ''}\n` +
          (unreviewed ? `${unreviewed} past commits not reviewed yet — run \`devbrain backfill\` when there is a pause, and save what matters.\n` : '') +
          '\n';
      }
      return { content: [{ type: 'text', text: header + body }] };
    }

    // ── search_knowledge ──────────────────────────────────────────────────────
    if (name === 'search_knowledge') {
      const { query, error_pattern, type, category, since_days, project_path, limit } = (args ?? {}) as {
        query?: string; error_pattern?: string; type?: string; category?: EntryCategory;
        since_days?: number; project_path?: string; limit?: number;
      };
      const callerProject = await projectAt();
      const scope = project_path ? await projectAt(project_path) : null;
      const cutoff = since_days ? Date.now() - since_days * 86_400_000 : 0;
      const keep = (e: Entry) =>
        !e.supersededBy &&
        (!type || normalizeType(e.type) === normalizeType(type)) &&
        (!cutoff || e.createdAt >= cutoff) &&
        (!scope || e.projectId === scope.id);

      const searchText = [query, error_pattern].filter(s => s?.trim()).join(' ');

      // No query: a filtered listing, newest first (what query_entries did).
      if (!searchText) {
        const listed = (await getAllEntriesWithProjects())
          .filter(e => keep(e) && (!category || e.category === category))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, Math.min(limit ?? 20, 50));
        if (!listed.length) {
          const filters = [type, category, since_days ? `last ${since_days}d` : null, scope?.name].filter(Boolean).join(', ');
          return { content: [{ type: 'text', text: `No entries${filters ? ` matching: ${filters}` : ''}.` }] };
        }
        await bumpRetrievalCounts(listed.map(e => e.id), callerProject?.id);
        const text = listed.map((e, i) => renderEntry(e, i, `${e.project.name} · ${timeAgo(e.createdAt)}`)).join('\n\n');
        return { content: [{ type: 'text', text: `DevBrain entries (${listed.length}):\n\n${text}` }] };
      }

      // A search. Empty embedding without an AI service: keywords rank instead.
      const queryEmbedding = await getEmbedding(searchText).catch(() => [] as number[]);
      const candidates = (await searchCandidates(queryEmbedding)).filter(keep);
      const results = preciseSearch(searchText, queryEmbedding, candidates, {
        // No threshold override: SEMANTIC_THRESHOLD in search.ts is the one
        // calibrated value. This used to pass 0.45, which is below the noise
        // floor of cosine similarity and made every search answer something.
        category, topK: Math.min(limit ?? 6, 50), projectId: callerProject?.id,
      });
      if (!results.length) {
        return { content: [{ type: 'text', text: `No matches in DevBrain for: "${searchText}"` }] };
      }
      await bumpRetrievalCounts(results.map(r => r.entry.id), callerProject?.id);

      const text = results.map((r, i) => {
        const match  = r.matchType === 'pattern' ? 'pattern match' : similarityLabel(r.similarity);
        const origin = r.sameProject ? 'this project' : `other project: ${r.project.name}`;
        return renderEntry(r.entry as Entry & { project: { name: string } }, i, `${match} · ${origin} · ${timeAgo(r.entry.createdAt)}`);
      }).join('\n\n');
      return { content: [{ type: 'text', text:
        `DevBrain results for "${searchText}":\n\n${text}\n\n` +
        `If any of these is now wrong, save what is true with save_entry and pass its id as supersedes.` }] };
    }

    // ── save_entry ────────────────────────────────────────────────────────────
    if (name === 'save_entry') {
      const { type, title, content, tags = [], category, error_pattern, cause_archetype, project_path, supersedes } = args as {
        type: Entry['type']; title: string; content: string;
        tags?: string[]; category?: EntryCategory; error_pattern?: string; cause_archetype?: string;
        project_path?: string; supersedes?: string;
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

      // A correction: check the target first, so nothing is saved if it cannot apply.
      const target = supersedes ? (await getAllEntriesWithProjects()).find(e => e.id === supersedes) : undefined;
      if (target?.source) {
        // Derived from a file, which stays the source of truth: retracting it
        // here would be undone by the next `devbrain index`.
        return { content: [{ type: 'text', text:
          `DevBrain: that entry is indexed from ${target.source.file}, which is the source of truth — ` +
          `a correction here would be reverted on the next index.\n` +
          `Correct it at: ${target.source.heading}, then run \`devbrain index\`.` }] };
      }

      // Optional: an AI-written archetype when the agent gave none.
      const archetype = cause_archetype
        ?? (await autoArchetype(title, content, type).catch(() => null))
        ?? undefined;

      let embedding: number[] | undefined;
      try { embedding = await getEmbedding(`${title} ${content} ${tags.join(' ')}`); } catch {}

      // Agents restate the same insight across a long task. Embeddings when there
      // are any, titles otherwise. The entry being corrected is naturally similar
      // to its correction, so it never counts as the duplicate.
      const dupe = embedding
        ? await findDuplicate(embedding, project.id).catch(() => null)
        : await findTextDuplicate(title, project.id).catch(() => null);
      if (dupe && dupe.entry.id !== supersedes) {
        return { content: [{ type: 'text', text:
          `DevBrain: already known — this matches an existing entry, so nothing was added.\n` +
          `Existing: [${normalizeType(dupe.entry.type)}] ${dupe.entry.title} (id: ${dupe.entry.id})\n` +
          `If yours adds something it lacks, save it with a title that states the new detail. ` +
          `If the existing one is wrong, pass its id as supersedes.` }] };
      }

      const newId = nanoid();
      await insertEntry({
        id: newId, projectId: project.id,
        // Clip on a word boundary: a title cut mid-token is the first thing anyone reads.
        type, title: clip(title, 120), content, tags,
        embedding, createdAt: Date.now(), confidence: 'observation',
        ...(category      ? { category }                      : {}),
        ...(error_pattern ? { errorPattern: error_pattern }   : {}),
        ...(archetype     ? { causeArchetype: archetype }     : {}),
      });

      // Retract in the same call that records the correction, so the wrong
      // entry cannot go on being recalled next to the right one.
      let retracted = '';
      if (supersedes) {
        if (target && !target.supersededBy) {
          await supersedeEntry(supersedes, newId);
          retracted = `\nRetracted: "${clip(target.title, 70)}" — it will no longer surface.`;
        } else if (!target) {
          retracted = `\nNote: no entry with id ${supersedes}, so nothing was retracted.`;
        }
      }

      const confirmation = saveConfirmation(type, title, category, archetype, error_pattern);
      return { content: [{ type: 'text', text: `DevBrain: ${confirmation}${retracted}` }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}. DevBrain has get_context, search_knowledge and save_entry.` }], isError: true };

  } catch (err) {
    return {
      content: [{ type: 'text', text: `DevBrain error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});


  return server;
}

(async () => {
  // Serving HTTP is opt-in. Cloud Run injects PORT; `--serve` is the local
  // equivalent and defaults to the port the Dockerfile exposes, so the
  // dashboard is at http://localhost:8080 without anyone having to know that.
  //
  // It stays opt-in because the default launch is a stdio MCP server, one per
  // agent session: binding a port on every launch would make the second
  // session die with EADDRINUSE.
  const DEFAULT_HTTP_PORT = 8080;
  const PORT = process.env.PORT
    ? parseInt(process.env.PORT)
    : (process.argv.includes('--serve') ? DEFAULT_HTTP_PORT : null);

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

    // Whoever is serving this request is the server to advertise. Hardcoding one
    // deployment's URL meant every copy of DevBrain published a spec pointing at
    // that one host, which outlived its database and answered every call with a
    // DNS failure. DEVBRAIN_PUBLIC_URL overrides for a proxy that rewrites Host.
    function baseUrl(req: import('http').IncomingMessage): string {
      const override = process.env.DEVBRAIN_PUBLIC_URL?.trim();
      if (override) return override.replace(/\/+$/, '');
      const host  = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? `localhost:${PORT}`);
      const proto = String(req.headers['x-forwarded-proto'] ?? (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0];
      return `${proto}://${host}`;
    }

    const OPENAPI_SPEC = {
      openapi: '3.0.0',
      info: { title: 'DevBrain API', version: '1.0.0', description: 'Developer knowledge base — search past bugs, decisions, and patterns across projects.' },
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
                type: { type: 'string', enum: [...ENTRY_TYPE_NAMES] },
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

    // â”€â”€â”€ DEVBRAIN DASHBOARD HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Dashboard markup lives in dashboard.ts so its script can be parsed by tests.
const httpServer = createServer(async (req, res) => {
      // Normalise the path before routing. Exact string matching meant
      // "/mcp/" 404'd while "/mcp" worked, and an MCP client given a URL with a
      // trailing slash reports only "No MCP endpoint was found at the URL
      // provided" — which reads as a broken deployment rather than a typo.
      // "/sse" is accepted as an alias because the transport was documented
      // under that name.
      const rawUrl = req.url?.split('?')[0] ?? '/';
      const trimmed = rawUrl.length > 1 ? rawUrl.replace(/\/+$/, '') : rawUrl;
      const url = trimmed === '/sse' ? '/mcp' : (trimmed || '/');

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

      // Backs the dashboard's status badge. It reports the storage backend that
      // is actually configured and proves the database answers — the badge used
      // to read a hardcoded "connected" next to a hardcoded "MongoDB Atlas".
      if (req.method === 'GET' && url === '/api/health') {
        try {
          const storage = describeStorage();
          await getAllProjects();
          json(res, 200, { status: 'ok', storage: storage.kind });
        } catch (err) {
          json(res, 503, { status: 'error', error: String(err) });
        }
        return;
      }

      if (req.method === 'GET' && url === '/openapi.json') {
        json(res, 200, { ...OPENAPI_SPEC, servers: [{ url: baseUrl(req) }] }); return;
      }

      // ── projects ────────────────────────────────────────────────────────────
      // The dashboard is organised around projects, so it needs the list and the
      // full per-project record. Both reuse the same dossier builder the CLI uses,
      // so terminal and browser cannot disagree about what a project contains.
      if (req.method === 'GET' && url === '/api/projects') {
        try {
          const [projects, entries] = await Promise.all([getAllProjects(), getAllEntriesWithProjects()]);
          const rows = projects.map(p => {
            const d = buildDossier(p, entries);
            return {
              id: p.id, name: p.name, path: p.path, stack: p.stack,
              total: d.total, lastEntryAt: d.lastEntryAt,
              sections: d.sections.map(s => ({ section: s.section, heading: s.heading, count: s.entries.length })),
            };
          }).sort((a, b) => (b.lastEntryAt ?? 0) - (a.lastEntryAt ?? 0));
          json(res, 200, { projects: rows });
        } catch (err) { json(res, 500, { error: String(err) }); }
        return;
      }

      if (req.method === 'GET' && url === '/api/project') {
        try {
          const id = new URL(req.url ?? '', 'http://x').searchParams.get('id');
          if (!id) { json(res, 400, { error: 'id is required' }); return; }
          const project = (await getAllProjects()).find(p => p.id === id);
          if (!project) { json(res, 404, { error: 'project not found' }); return; }
          const dossier = buildDossier(project, await getAllEntriesWithProjects());
          json(res, 200, {
            project: dossier.project,
            total: dossier.total,
            lastEntryAt: dossier.lastEntryAt,
            supersededCount: dossier.supersededCount,
            sections: dossier.sections.map(s => ({
              section: s.section, heading: s.heading, blurb: s.blurb,
              entries: s.entries.map(e => ({
                id: e.id, type: normalizeType(e.type), title: e.title, content: e.content,
                tags: e.tags, category: e.category, createdAt: e.createdAt,
                timeAgo: timeAgo(e.createdAt), confidence: e.confidence,
                errorPattern: e.errorPattern, causeArchetype: e.causeArchetype,
                supersededBy: e.supersededBy,
                seenInProjects: e.seenInProjects?.length ?? 0,
                // Needed by the dashboard filters: how often this has been used,
                // and whether it was captured from work or indexed from a file.
                retrievalCount: e.retrievalCount ?? 0,
                sourceFile: e.source?.file,
              })),
            })),
          });
        } catch (err) { json(res, 500, { error: String(err) }); }
        return;
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

      if (url === '/api/feed' && req.method === 'GET') {
        try {
          const all = await getAllEntriesWithProjects();
          const active = all
            .filter(e => !e.supersededBy)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 15);
          const mapped = active.map(e => ({
            id: e.id,
            type: e.type,
            category: e.category,
            title: e.title,
            content: e.content,
            tags: e.tags,
            createdAt: e.createdAt,
            timeAgo: timeAgo(e.createdAt),
            confidence: e.confidence,
            project: {
              name: e.project.name,
              stack: e.project.stack,
            },
          }));
          json(res, 200, { feed: mapped });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }

      // ── /api/decisions — active decisions for human curation ──────────────────
      if (url === '/api/decisions' && req.method === 'GET') {
        try {
          const all = await getAllEntriesWithProjects();
          const decisions = all
            .filter(e => e.type === 'decision')
            .sort((a, b) => b.createdAt - a.createdAt);
          const mapped = decisions.map(e => ({
            id: e.id,
            type: e.type,
            title: e.title,
            content: e.content,
            category: e.category,
            tags: e.tags,
            createdAt: e.createdAt,
            timeAgo: timeAgo(e.createdAt),
            confidence: e.confidence,
            supersededBy: e.supersededBy ?? null,
            lastRetrievedAt: e.lastRetrievedAt ?? null,
            retrievalCount: e.retrievalCount ?? 0,
            causeArchetype: e.causeArchetype ?? null,
            project: { id: e.project.id, name: e.project.name, stack: e.project.stack },
          }));
          json(res, 200, { decisions: mapped });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }

      // ── /api/decisions/:id/supersede — mark a decision as superseded ──────────
      if (req.method === 'POST' && req.url?.match(/^\/api\/decisions\/([^/]+)\/supersede$/)) {
        try {
          const oldId = req.url.match(/^\/api\/decisions\/([^/]+)\/supersede$/)![1];
          const { reason } = await readBody(req) as { reason?: string };
          // Create a replacement note so supersededBy points to a real entry
          const newId = nanoid();
          await insertEntry({
            id: newId, projectId: 'agent-builder',
            type: 'decision', title: `[Superseded] ${reason?.slice(0, 100) ?? 'Manually overridden via dashboard'}`,
            content: reason ?? 'Manually marked as superseded via DevBrain dashboard.',
            tags: ['superseded'], createdAt: Date.now(), confidence: 'observation',
          });
          await supersedeEntry(oldId, newId);
          json(res, 200, { ok: true, oldId, newId });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }

      // ── REST API for Agent Builder ────────────────────────────────────────────
      if (url === '/api/search' && req.method === 'POST') {
        try {
          const { query, category, error_pattern } = await readBody(req) as { query: string; category?: EntryCategory; error_pattern?: string };
          if (!query) { json(res, 400, { error: 'query is required' }); return; }
          const searchText = error_pattern ? `${query} ${error_pattern}` : query;
          const queryEmbedding = await getEmbedding(searchText).catch(() => [] as number[]);
          const candidates = await searchCandidates(queryEmbedding);
          const results = preciseSearch(searchText, queryEmbedding, candidates, { category, topK: 6 });
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
          const { type, title, content, tags = [], category, error_pattern, cause_archetype, project_id } = await readBody(req) as {
            type: Entry['type']; title: string; content: string;
            tags?: string[]; category?: EntryCategory; error_pattern?: string; cause_archetype?: string;
            project_id?: string;
          };
          if (!type || !title || !content) { json(res, 400, { error: 'type, title, content are required' }); return; }

          // Save into the project the caller names. This used to be hardcoded to a
          // synthetic "Agent Builder" project, so anything saved from the dashboard
          // was filed under a repo that does not exist and never appeared in its
          // real project's memory.
          let targetId = project_id;
          if (targetId) {
            const known = (await getAllProjects()).find(p => p.id === targetId);
            if (!known) { json(res, 400, { error: `unknown project_id: ${targetId}` }); return; }
            await upsertProject({ ...known, lastSeen: Date.now() });
          } else {
            // No project named: fall back to a clearly-labelled inbox rather than
            // silently attaching the entry to an unrelated project.
            targetId = 'unfiled';
            const existing = await getProjectByPath('unfiled');
            await upsertProject(existing
              ? { ...existing, lastSeen: Date.now() }
              : { id: 'unfiled', name: 'Unfiled', path: 'unfiled', stack: [], createdAt: Date.now(), lastSeen: Date.now() });
          }

          let embedding: number[] | undefined;
          try { embedding = await getEmbedding(`${title} ${content} ${tags.join(' ')}`); } catch {}
          await insertEntry({
            id: nanoid(), projectId: targetId, type,
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

      if (url === '/agent' && req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
        res.end(); return;
      }

      if (url === '/agent' && req.method === 'POST') {
        try {
          const { query } = await readBody(req) as { query: string };
          if (!query?.trim()) { json(res, 400, { error: 'query is required' }); return; }
          const mcpUrl = `http://localhost:${PORT}/mcp`;
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const runAgent: RunAgent = require('./agent').runAgent;
          const response = await runAgent(query, mcpUrl);
          json(res, 200, { response, powered_by: 'Google ADK + Gemini 2.5 Flash (Vertex AI) + DevBrain MCP' });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = msg.includes('429') || msg.includes('quota') ? 429 : 500;
          json(res, status, { error: msg });
        }
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
          // SDK stateless mode requires a fresh transport and server instance per request
          const mcpServer = createMcpServer();
          const mcpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
          await mcpServer.connect(mcpTransport);
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
      console.log(`DevBrain dashboard  http://localhost:${PORT}`);
      console.log(`DevBrain MCP        http://localhost:${PORT}/mcp`);
    });
  } else {
    // stdio mode — local MCP client / agent
    const mcpServer = createMcpServer();
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }
})();
