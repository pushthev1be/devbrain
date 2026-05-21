#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

      return {
        content: [{ type: 'text', text: `Saved [${type}] to DevBrain: ${title.slice(0, 80)}` }],
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

      const raw  = buildContext(all, project ?? null, queryEmbedding);
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
          if (proj && e.projectId !== proj.projectId) return false;
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

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
