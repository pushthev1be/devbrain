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
  autoArchetype, recapSession, supersedeEntry,
  ENTRY_TYPES, ENTRY_TYPE_NAMES, normalizeType,
  buildDossier, describeStorage, findDuplicate,
  startSession, endSession, getAbandonedSession, describeAbandonedSession,
} from '@devbrain/core';
import type { EntryCategory } from '@devbrain/core';
import type { Entry } from '@devbrain/core';
import { nanoid } from 'nanoid';
import { mongoMcpFind } from './mongoMcp';
import { runAgent } from './agent';
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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'task_start',
      description:
        'CALL THIS FIRST at the beginning of every coding task, before reading files or writing code. ' +
        'Loads ranked project memory — past bugs, decisions, patterns, and anti-patterns — scoped to your task. ' +
        'Returns what broke before, what was decided, and what to avoid. This is your briefing.',
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'One-line description of the task you are about to start (e.g. "fix auth token expiry bug", "add dark mode to settings page")',
          },
          project_path: {
            type: 'string',
            description: 'Absolute path to the project directory. Omit to use the current working directory.',
          },
        },
        required: ['description'],
      },
    },
    {
      name: 'task_end',
      description:
        'CALL THIS when you finish a task — after the fix is applied, the feature is done, or the decision is made. ' +
        'Pass a plain-text summary of what you did: what the problem was, what you changed, and why. ' +
        'DevBrain extracts and stores all knowledge automatically — you do not need to classify anything. ' +
        'Even a short summary ("fixed JWT expiry by setting TOKEN_EXPIRY=86400 in prod .env") is enough.',
      inputSchema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Plain-text account of what you did this session: problem encountered, changes made, decisions taken, things to avoid next time.',
          },
          project_path: {
            type: 'string',
            description: 'Absolute path to the project directory. Omit to use the current working directory.',
          },
        },
        required: ['summary'],
      },
    },
    {
      name: 'save_entry',
      description:
        'CALL THIS after fixing a bug, making an architectural decision, or discovering a pattern worth keeping. ' +
        'Do not wait until end of session — save immediately while context is fresh. ' +
        'For bugs and fixes, include error_pattern (exact error text) so future searches find this instantly. ' +
        'DevBrain will auto-generate the cause_archetype if you omit it.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [...ENTRY_TYPE_NAMES],
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
            description: 'The exact error message, exception text, or specific symptom. Used for direct pattern matching — include whenever an error text exists.',
          },
          cause_archetype: {
            type: 'string',
            description: 'The abstract root-cause pattern transferable across projects. Omit and DevBrain will generate it automatically.',
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
        'CALL THIS before debugging any error you have not seen before. ' +
        'Paste the exact error message into error_pattern — this bypasses semantic search and finds the exact past fix. ' +
        'Also call this when starting work on any feature area (auth, payments, database) to surface relevant past decisions.',
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
            description: 'Exact error message or symptom text — enables direct pattern matching, higher precision than semantic search',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_project_summary',
      description: 'Get a count of stored knowledge for a project — useful for confirming DevBrain is tracking this codebase and seeing what categories have been captured.',
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
        'CALL THIS FIRST before writing any code or making any decisions. ' +
        'Returns what broke before, what was decided, and what to avoid — ranked by relevance to your current task. ' +
        'Pass a query to focus it (e.g. "auth", "database migrations"). Omit for a full project briefing. ' +
        'Prefer task_start for new tasks — use get_context for mid-task lookups on a specific topic.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Topic to focus the context (e.g. "auth", "database migrations", "deployment"). Omit for general project context.',
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
        'Browse DevBrain entries by type, category, project, or recency — no search query needed. ' +
        'Use when you want a specific slice: all anti-patterns, all auth decisions, all bugs from the last 30 days. ' +
        'Complements search_knowledge (semantic) and get_context (ranked blend).',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [...ENTRY_TYPE_NAMES],
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
    {
      name: 'query_knowledge_db',
      description:
        'Query the DevBrain MongoDB knowledge base directly. ' +
        'Use for analytics, audits, or when you need exact document-level access rather than semantic search.',
      inputSchema: {
        type: 'object',
        properties: {
          collection: {
            type: 'string',
            enum: ['entries', 'projects'],
            description: 'Collection to query (default: entries)',
          },
          type: {
            type: 'string',
            enum: [...ENTRY_TYPE_NAMES],
            description: 'Filter by entry type.',
          },
          category: {
            type: 'string',
            enum: ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'],
            description: 'Filter by problem category.',
          },
          since_days: {
            type: 'number',
            description: 'Only return entries created within this many days.',
          },
          limit: {
            type: 'number',
            description: 'Max documents to return (default 10, max 25).',
          },
        },
      },
    },
  ],
}));



server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── task_start ────────────────────────────────────────────────────────────────
    if (name === 'task_start') {
      const { description, project_path } = args as { description: string; project_path?: string };
      const cwd      = project_path ?? process.cwd();
      const repoRoot = getRepoRoot(cwd) ?? cwd;
      const project  = await getProjectByPath(repoRoot);
      const all      = await getAllEntriesWithProjects();

      let queryEmbedding: number[] | undefined;
      try { queryEmbedding = await getEmbedding(description); } catch {}

      const raw  = buildContext(all, project ?? null, queryEmbedding, description);
      const ctx  = await compressContext(raw);
      const text = formatContext(ctx, description);

      const retrievedIds = [
        ...raw.issues, ...raw.decisions, ...raw.patterns, ...raw.antiPatterns, ...raw.stacks,
        ...(raw.crossProjectPatterns ?? []),
      ].map(r => r.entry.id);
      await bumpRetrievalCounts(retrievedIds, project?.id);

      const projectLine = project
        ? `Project: ${project.name} · stack: ${project.stack.join(', ') || 'unknown'}\n\n`
        : '';

      // If the previous session was never closed by task_end, whatever was learned
      // in it went unrecorded. Nothing used to notice. Say so here, where an agent
      // is already reading, and ask for the recap before the new work buries it.
      let unrecapped = '';
      if (project) {
        const abandoned = await getAbandonedSession(project.id).catch(() => null);
        const note = describeAbandonedSession(abandoned);
        if (note) {
          unrecapped =
            `UNRECORDED WORK: ${note}\n` +
            `Before starting, call task_end with a summary of that earlier work if you know what it was. ` +
            `If you do not, say so to the user and continue.\n\n`;
        }
        await startSession(project.id, description).catch(() => {});
      }

      return {
        content: [{ type: 'text', text: `${unrecapped}${projectLine}${text}` }],
      };
    }

    // ── task_end ──────────────────────────────────────────────────────────────────
    if (name === 'task_end') {
      const { summary, project_path } = args as { summary: string; project_path?: string };
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

      // Extract structured knowledge entries from the session summary
      let extracted: Awaited<ReturnType<typeof recapSession>> = [];
      try { extracted = await recapSession(summary); } catch {}

      if (extracted.length === 0) {
        return { content: [{ type: 'text', text: 'DevBrain: session summary recorded. No distinct knowledge entries extracted.' }] };
      }

      const saved: string[] = [];
      let duplicates = 0;
      for (const e of extracted) {
        // Auto-generate archetype if missing
        const archetype = e.causeArchetype ?? (await autoArchetype(e.title, e.content, e.type).catch(() => null)) ?? undefined;
        let embedding: number[] | undefined;
        try { embedding = await getEmbedding(`${e.title} ${e.content} ${e.tags.join(' ')}`); } catch {}

        // A recap restates things already saved during the session. Without this
        // every session ended by duplicating its own mid-session saves.
        if (embedding && await findDuplicate(embedding, project.id).catch(() => null)) {
          duplicates++;
          continue;
        }

        await insertEntry({
          id: nanoid(), projectId: project.id,
          type: e.type, title: e.title.slice(0, 120), content: e.content,
          tags: e.tags, embedding, createdAt: Date.now(), confidence: 'observation',
          ...(e.category     ? { category: e.category }         : {}),
          ...(e.errorPattern ? { errorPattern: e.errorPattern }  : {}),
          ...(archetype      ? { causeArchetype: archetype }     : {}),
        });
        saved.push(`  [${e.type}] ${e.title.slice(0, 80)}`);
      }

      // The session is recorded, so it no longer counts as abandoned.
      await endSession(project.id).catch(() => {});

      const dupeNote = duplicates ? `\n(${duplicates} already known, not duplicated)` : '';
      return {
        content: [{
          type: 'text',
          text: saved.length
            ? `DevBrain: saved ${saved.length} knowledge entr${saved.length === 1 ? 'y' : 'ies'} from this session:\n${saved.join('\n')}${dupeNote}`
            : `DevBrain: session recorded. Everything in it was already saved.${dupeNote}`,
        }],
      };
    }

    // ── save_entry ────────────────────────────────────────────────────────────────
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

      // Auto-generate archetype when the agent doesn't supply one
      const archetype = cause_archetype
        ?? (await autoArchetype(title, content, type).catch(() => null))
        ?? undefined;

      let embedding: number[] | undefined;
      try { embedding = await getEmbedding(`${title} ${content} ${tags.join(' ')}`); } catch {}

      // Agents save the same insight repeatedly across a long task. The hook and
      // backfill have always deduplicated; this path — the one agents use most —
      // did not, so it was the largest remaining source of near-identical entries.
      if (embedding) {
        const dupe = await findDuplicate(embedding, project.id).catch(() => null);
        if (dupe) {
          return {
            content: [{ type: 'text', text:
              `DevBrain: already known — this matches an existing entry, so nothing was added.\n` +
              `Existing: [${normalizeType(dupe.entry.type)}] ${dupe.entry.title}\n` +
              `If your version adds something the existing entry lacks, save it with a title that states the new detail.` }],
          };
        }
      }

      await insertEntry({
        id: nanoid(), projectId: project.id,
        type, title: title.slice(0, 120), content, tags,
        embedding, createdAt: Date.now(), confidence: 'observation',
        ...(category   ? { category }                    : {}),
        ...(error_pattern ? { errorPattern: error_pattern } : {}),
        ...(archetype  ? { causeArchetype: archetype }   : {}),
      });

      const confirmation = saveConfirmation(type, title, category, archetype, error_pattern);
      return {
        content: [{ type: 'text', text: `DevBrain: ${confirmation}` }],
      };
    }

    // â”€â”€ search_knowledge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (name === 'search_knowledge') {
      const { query, category, error_pattern } = args as {
        query: string; category?: EntryCategory; error_pattern?: string;
      };
      const searchText     = error_pattern ? `${query} ${error_pattern}` : query;
      const queryEmbedding = await getEmbedding(searchText);

      // Atlas Vector Search — fast ANN retrieval, then re-rank with preciseSearch.
      const candidates = await searchCandidates(queryEmbedding);

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

    // â”€â”€ get_project_summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ get_context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ query_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // ── query_knowledge_db ──────────────────────────────────────────────────────
    if (name === 'query_knowledge_db') {
      const { collection = 'entries', type, category, since_days, limit = 10 } = (args ?? {}) as {
        collection?: string; type?: string; category?: string;
        since_days?: number; limit?: number;
      };

      const filter: Record<string, unknown> = {};
      if (type)       filter['type']     = type;
      if (category)   filter['category'] = category;
      if (since_days) filter['createdAt'] = { $gte: Date.now() - since_days * 86_400_000 };

      const { documents, summary } = await mongoMcpFind(collection, {
        filter: Object.keys(filter).length ? filter : undefined,
        projection: { embedding: 0 },
        limit: Math.min(limit, 25),
        sort: { createdAt: -1 },
      });

      if (documents.length === 0) {
        return { content: [{ type: 'text', text: `MongoDB MCP: no documents found in ${collection}` }] };
      }

      const rows = documents.map((d, i) => {
        const doc = d as Record<string, unknown>;
        const title    = String(doc.title    ?? '');
        const entryType = String(doc.type    ?? '');
        const cat      = String(doc.category ?? '');
        const content  = String(doc.content  ?? '').slice(0, 150);
        const ts       = typeof doc.createdAt === 'number' ? timeAgo(doc.createdAt) : '';
        return `${i + 1}. [${entryType}]${cat ? ' [' + cat + ']' : ''} ${title}\n   ${ts}\n   ${content}`;
      }).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `MongoDB MCP • ${summary}\n\n${rows}`,
        }],
      };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };

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
        json(res, 200, OPENAPI_SPEC); return;
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
          const queryEmbedding = await getEmbedding(searchText);
          const candidates = await searchCandidates(queryEmbedding);
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
      console.log(`DevBrain MCP server listening on port ${PORT}`);
    });
  } else {
    // stdio mode — local MCP client / agent
    const mcpServer = createMcpServer();
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }
})();
