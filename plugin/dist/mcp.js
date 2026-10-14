#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const omitted1 = require('./lib/omitted-1.js');
const require$$1 = require('http');
const modelcontextprotocolSdk1 = require('./lib/modelcontextprotocol-sdk-1.js');
const modelcontextprotocolSdk2 = require('./lib/modelcontextprotocol-sdk-2.js');
const devbrainMcp1 = require('./lib/devbrain-mcp-1.js');
const nanoid1 = require('./lib/nanoid-1.js');
require('./lib/zod-to-json-schema-1.js');
require('./lib/zod-1.js');
require('node:process');
require('./lib/hono-node-server-1.js');
require('http2');
require('stream');
require('crypto');
require('./lib/ajv-1.js');
require('./lib/fast-deep-equal-1.js');
require('./lib/ajv-2.js');
require('./lib/json-schema-traverse-1.js');
require('./lib/fast-uri-1.js');
require('./lib/ajv-formats-1.js');
require('./lib/devbrain-core-1.js');
require('./lib/devbrain-core-2.js');
require('path');
require('os');
require('fs');
require('./lib/mongodb-4.js');
require('./lib/mongodb-1.js');
require('child_process');
require('./lib/mongodb-5.js');
require('timers/promises');
require('./lib/mongodb-3.js');
require('./lib/mongodb-7.js');
require('timers');
require('process');
require('./lib/mongodb-2.js');
require('zlib');
require('./lib/mongodb-6.js');
require('dns');
require('net');
require('tls');
require('fs/promises');
require('./lib/mongodb-js-saslprep-1.js');
require('url');
require('./lib/mongodb-connection-string-url-1.js');
require('./lib/whatwg-url-1.js');
require('./lib/webidl-conversions-1.js');
require('./lib/tr46-1.js');
require('./lib/punycode-1.js');
require('./lib/tr46-2.js');
require('events');
require('util');
require('./lib/bson-1.js');

devbrainMcp1.distExports.loadGlobalEnv();
function saveConfirmation(type, title, category, causeArchetype, errorPattern) {
  const cat = category && category !== "other" ? ` ${category}` : "";
  const short = devbrainMcp1.distExports.clip(title, 65);
  if (type === "fix") {
    if (causeArchetype) return `Stored recurring${cat} fix archetype: ${causeArchetype.slice(0, 70)}`;
    if (errorPattern) return `Saved new${cat} fix \u2014 error pattern stored for future matching`;
    return `Saved new${cat} fix: ${short}`;
  }
  if (type === "decision") return `Detected architectural decision: ${short}`;
  if (type === "anti-pattern") {
    if (causeArchetype) return `Stored anti-pattern archetype: ${causeArchetype.slice(0, 70)}`;
    return `Stored${cat} anti-pattern to avoid: ${short}`;
  }
  if (type === "bug") {
    if (causeArchetype) return `Stored${cat} bug + root-cause archetype: ${causeArchetype.slice(0, 70)}`;
    return `Stored${cat} bug: ${short}`;
  }
  if (type === "pattern") return `Captured reusable${cat} pattern: ${short}`;
  if (type === "lesson") {
    if (causeArchetype) return `Stored recurring issue archetype: ${causeArchetype.slice(0, 70)}`;
    return `Captured hard-won${cat} lesson: ${short}`;
  }
  if (type === "stack") return `Stack snapshot saved: ${short}`;
  if (type === "solution") return `Saved${cat} solution: ${short}`;
  return `Saved [${type}]${cat ? " \xB7 " + cat.trim() : ""}: ${short}`;
}
async function searchCandidates(queryEmbedding) {
  if (!queryEmbedding.length) return devbrainMcp1.distExports.getAllEntriesWithProjects();
  try {
    const hits = await devbrainMcp1.distExports.vectorSearch(queryEmbedding, { topK: 20 });
    if (hits.length > 0) return hits;
  } catch {
  }
  return devbrainMcp1.distExports.getAllEntriesWithProjects();
}
function createMcpServer() {
  const server = new modelcontextprotocolSdk1.Server(
    { name: "devbrain", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  const CATEGORY_ENUM = ["auth", "database", "deployment", "build", "config", "network", "performance", "ui", "data", "testing", "security", "other"];
  server.setRequestHandler(modelcontextprotocolSdk2.ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_context",
        description: "CALL THIS at the start of any non-trivial task, before reading files or writing code. Returns this project's memory \u2014 what broke before and why, what was decided, what to avoid \u2014 ranked by relevance to the task you describe, plus how much is stored and what has not been reviewed yet.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: 'The task or topic, e.g. "fix auth token expiry" or "database migrations". Omit for a general briefing.'
            },
            project_path: { type: "string", description: "Absolute path to the project. Omit to use the current working directory." }
          }
        }
      },
      {
        name: "search_knowledge",
        description: 'CALL THIS before debugging any error you have not seen before \u2014 put the exact error text in error_pattern to find the past fix for it. Also use it to look up past decisions in an area. With no query, it lists entries by filter instead: "all anti-patterns", "auth decisions from the last 30 days". Every result carries an id \u2014 pass it to save_entry as `supersedes` if the entry turns out to be wrong.',
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "What you are looking for, in plain words. Omit to list by filters only." },
            error_pattern: { type: "string", description: "Exact error message or symptom text \u2014 matched directly, more precise than the query." },
            type: { type: "string", enum: [...devbrainMcp1.distExports.ENTRY_TYPE_NAMES], description: "Only entries of this type." },
            category: { type: "string", enum: CATEGORY_ENUM, description: "Only (or, with a query, prefer) entries in this category." },
            since_days: { type: "number", description: "Only entries created within this many days." },
            project_path: { type: "string", description: "Only entries from this project. Omit to search every project." },
            limit: { type: "number", description: "Max results (default 6 for a search, 20 for a listing; max 50)." }
          }
        }
      },
      {
        name: "save_entry",
        description: "CALL THIS when you fix a bug, make a decision, or learn something non-obvious \u2014 you did the work, so you write the record; DevBrain stores it. Save each distinct item as its own entry, as soon as you know it. For a bug or fix, include error_pattern with the exact error text so the next search finds it. If something DevBrain told you is wrong, save what is actually true and pass the wrong entry's id as `supersedes`: it is retracted in the same call, so it stops being recalled as true.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [...devbrainMcp1.distExports.ENTRY_TYPE_NAMES],
              description: "fix=what broke and how it was fixed \xB7 bug=symptom and cause \xB7 decision=choice and what was rejected \xB7 lesson=looked right, was wrong \xB7 anti-pattern=never do this \xB7 pattern=reusable approach \xB7 stack=version/tool/env fact"
            },
            title: { type: "string", description: 'The symptom or the decision, searchable, under 90 characters. Not "Fixed X".' },
            content: { type: "string", description: "The root cause, then the exact fix \u2014 or for a decision, what was chosen, what was rejected, and why." },
            tags: { type: "array", items: { type: "string" }, description: "A few lowercase words a searcher would type." },
            category: { type: "string", enum: CATEGORY_ENUM, description: "Best-fit problem area." },
            error_pattern: { type: "string", description: "The exact error text, copied verbatim. Include whenever there was one." },
            cause_archetype: { type: "string", description: 'The transferable class of mistake, as a short phrase, e.g. "environment config divergence between local and deploy".' },
            supersedes: { type: "string", description: "id of an entry this corrects (from search_knowledge). It is retracted in the same call." },
            fixes: { type: "string", description: "id of the bug this resolves (from search_knowledge). Use when you have just fixed something DevBrain already recorded \u2014 unlike supersedes, both entries stay true, and this is what records where the bug was closed." },
            project_path: { type: "string", description: "Absolute path to the project. Omit to use the current working directory." }
          },
          required: ["type", "title", "content"]
        }
      }
    ]
  }));
  async function projectAt(path) {
    const cwd = path ?? process.cwd();
    return devbrainMcp1.distExports.getProjectByPath(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd).catch(() => null);
  }
  function renderEntry(e, i, lead) {
    const catLabel = e.category ? ` [${e.category}]` : "";
    return `${i + 1}. [${devbrainMcp1.distExports.normalizeType(e.type)}]${catLabel} ${e.title}
   ${lead}
   id: ${e.id}
` + (e.errorPattern ? `   error: ${e.errorPattern}
` : "") + (e.causeArchetype ? `   root cause: ${e.causeArchetype}
` : "") + `   ${e.content}` + (e.tags.length ? `
   tags: ${e.tags.join(", ")}` : "");
  }
  server.setRequestHandler(modelcontextprotocolSdk2.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      if (name === "get_context") {
        const { query, project_path } = args ?? {};
        const project = await projectAt(project_path);
        const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
        const queryEmbedding = query?.trim() ? await devbrainMcp1.distExports.getEmbedding(query).catch(() => void 0) : void 0;
        const raw = devbrainMcp1.distExports.buildContext(all, project ?? null, queryEmbedding, query);
        const ctx = await devbrainMcp1.distExports.compressContext(raw);
        const body = devbrainMcp1.distExports.formatContext(ctx, query);
        await devbrainMcp1.distExports.bumpRetrievalCounts([
          ...raw.issues,
          ...raw.decisions,
          ...raw.patterns,
          ...raw.antiPatterns,
          ...raw.stacks,
          ...raw.crossProjectPatterns ?? []
        ].map((r) => r.entry.id), project?.id);
        let header = "This project is not registered with DevBrain \u2014 run `devbrain init` in it. Showing knowledge from other projects.\n\n";
        if (project) {
          const mine = all.filter((e) => e.projectId === project.id && !e.supersededBy);
          const counts = devbrainMcp1.distExports.ENTRY_TYPES.map((t) => [t.type, mine.filter((e) => devbrainMcp1.distExports.normalizeType(e.type) === t.type).length]).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`).join(" \xB7 ");
          const unreviewed = (await devbrainMcp1.distExports.filterUnprocessedCommits(devbrainMcp1.distExports.listCommitHashes(project.path)).catch(() => [])).length;
          header = `Project: ${project.name} \xB7 stack: ${project.stack.join(", ") || "unknown"} \xB7 ${mine.length} entries${counts ? ` (${counts})` : ""}
` + (unreviewed ? `${unreviewed} past commits not reviewed yet \u2014 run \`devbrain backfill\` when there is a pause, and save what matters.
` : "") + "\n";
        }
        return { content: [{ type: "text", text: header + body }] };
      }
      if (name === "search_knowledge") {
        const { query, error_pattern, type, category, since_days, project_path, limit } = args ?? {};
        const callerProject = await projectAt();
        const scope = project_path ? await projectAt(project_path) : null;
        const cutoff = since_days ? Date.now() - since_days * 864e5 : 0;
        const keep = (e) => !e.supersededBy && (!type || devbrainMcp1.distExports.normalizeType(e.type) === devbrainMcp1.distExports.normalizeType(type)) && (!cutoff || e.createdAt >= cutoff) && (!scope || e.projectId === scope.id);
        const searchText = [query, error_pattern].filter((s) => s?.trim()).join(" ");
        if (!searchText) {
          const listed = (await devbrainMcp1.distExports.getAllEntriesWithProjects()).filter((e) => keep(e) && (!category || e.category === category)).sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.min(limit ?? 20, 50));
          if (!listed.length) {
            const filters = [type, category, since_days ? `last ${since_days}d` : null, scope?.name].filter(Boolean).join(", ");
            return { content: [{ type: "text", text: `No entries${filters ? ` matching: ${filters}` : ""}.` }] };
          }
          await devbrainMcp1.distExports.bumpRetrievalCounts(listed.map((e) => e.id), callerProject?.id);
          const text2 = listed.map((e, i) => renderEntry(e, i, `${e.project.name} \xB7 ${devbrainMcp1.distExports.timeAgo(e.createdAt)}`)).join("\n\n");
          return { content: [{ type: "text", text: `DevBrain entries (${listed.length}):

${text2}` }] };
        }
        const queryEmbedding = await devbrainMcp1.distExports.getEmbedding(searchText).catch(() => []);
        const candidates = (await searchCandidates(queryEmbedding)).filter(keep);
        const results = devbrainMcp1.distExports.preciseSearch(searchText, queryEmbedding, candidates, {
          // No threshold override: SEMANTIC_THRESHOLD in search.ts is the one
          // calibrated value. This used to pass 0.45, which is below the noise
          // floor of cosine similarity and made every search answer something.
          category,
          topK: Math.min(limit ?? 6, 50),
          projectId: callerProject?.id
        });
        if (!results.length) {
          return { content: [{ type: "text", text: `No matches in DevBrain for: "${searchText}"` }] };
        }
        await devbrainMcp1.distExports.bumpRetrievalCounts(results.map((r) => r.entry.id), callerProject?.id);
        const text = results.map((r, i) => {
          const match = r.matchType === "pattern" ? "pattern match" : devbrainMcp1.distExports.similarityLabel(r.similarity);
          const origin = r.sameProject ? "this project" : `other project: ${r.project.name}`;
          return renderEntry(r.entry, i, `${match} \xB7 ${origin} \xB7 ${devbrainMcp1.distExports.timeAgo(r.entry.createdAt)}`);
        }).join("\n\n");
        const confident = results.some((r) => r.matchType === "pattern" || r.similarity >= devbrainMcp1.distExports.CONFIDENT_MATCH);
        const caveat = confident ? "If any of these is now wrong, save what is true with save_entry and pass its id as supersedes." : "None of these is a close match, so DevBrain may simply have nothing on this. Read the top one before relying on it rather than treating it as prior experience here.";
        return { content: [{ type: "text", text: `DevBrain results for "${searchText}":

${text}

` + caveat }] };
      }
      if (name === "save_entry") {
        const { type, title, content, tags = [], category, error_pattern, cause_archetype, project_path, supersedes, fixes } = args;
        const cwd = project_path ?? process.cwd();
        const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
        let project = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
        if (!project) {
          project = {
            id: nanoid1.nanoid(),
            name: devbrainMcp1.distExports.getProjectName(repoRoot),
            path: repoRoot,
            stack: devbrainMcp1.distExports.detectStack(repoRoot),
            createdAt: Date.now(),
            lastSeen: Date.now()
          };
          await devbrainMcp1.distExports.upsertProject(project);
        }
        const known = supersedes || fixes ? await devbrainMcp1.distExports.getAllEntriesWithProjects() : [];
        const target = supersedes ? known.find((e) => e.id === supersedes) : void 0;
        const closing = fixes ? known.find((e) => e.id === fixes) : void 0;
        if (target?.source) {
          return { content: [{ type: "text", text: `DevBrain: that entry is indexed from ${target.source.file}, which is the source of truth \u2014 a correction here would be reverted on the next index.
Correct it at: ${target.source.heading}, then run \`devbrain index\`.` }] };
        }
        const archetype = cause_archetype ?? await devbrainMcp1.distExports.autoArchetype(title, content, type).catch(() => null) ?? void 0;
        let embedding;
        try {
          embedding = await devbrainMcp1.distExports.getEmbedding(`${title} ${content} ${tags.join(" ")}`);
        } catch {
        }
        const dupe = embedding ? await devbrainMcp1.distExports.findDuplicate(embedding, project.id).catch(() => null) : await devbrainMcp1.distExports.findTextDuplicate(title, project.id).catch(() => null);
        if (dupe && dupe.entry.id !== supersedes && dupe.entry.id !== fixes) {
          return { content: [{ type: "text", text: `DevBrain: already known \u2014 this matches an existing entry, so nothing was added.
Existing: [${devbrainMcp1.distExports.normalizeType(dupe.entry.type)}] ${dupe.entry.title} (id: ${dupe.entry.id})
If yours adds something it lacks, save it with a title that states the new detail. If the existing one is wrong, pass its id as supersedes.` }] };
        }
        const newId = nanoid1.nanoid();
        const session = devbrainMcp1.distExports.activeSession(project.path);
        const origin = session && devbrainMcp1.distExports.takeAsk(session) ? "hook" : "agent";
        await devbrainMcp1.distExports.insertEntry({
          id: newId,
          projectId: project.id,
          // Clip on a word boundary: a title cut mid-token is the first thing anyone reads.
          type,
          title: devbrainMcp1.distExports.clip(title, 120),
          content,
          tags,
          embedding,
          createdAt: Date.now(),
          confidence: "observation",
          ...category ? { category } : {},
          ...error_pattern ? { errorPattern: error_pattern } : {},
          ...archetype ? { causeArchetype: archetype } : {},
          // Stamped from the hook's record of which session owns this project, so
          // a run of entries reads as one episode rather than unrelated rows.
          ...session ? { sessionId: session } : {},
          origin,
          ...closing ? { fixes: closing.id } : {}
        });
        let retracted = "";
        if (supersedes) {
          if (target && !target.supersededBy) {
            await devbrainMcp1.distExports.supersedeEntry(supersedes, newId);
            retracted = `
Retracted: "${devbrainMcp1.distExports.clip(target.title, 70)}" \u2014 it will no longer surface.`;
          } else if (!target) {
            retracted = `
Note: no entry with id ${supersedes}, so nothing was retracted.`;
          }
        }
        let closed = "";
        if (fixes) {
          closed = closing ? `
Closes: "${devbrainMcp1.distExports.clip(closing.title, 70)}" \u2014 both stay, linked.` : `
Note: no entry with id ${fixes}, so nothing was linked.`;
        }
        const confirmation = saveConfirmation(type, title, category, archetype, error_pattern);
        return { content: [{ type: "text", text: `DevBrain: ${confirmation}${retracted}${closed}` }] };
      }
      return { content: [{ type: "text", text: `Unknown tool: ${name}. DevBrain has get_context, search_knowledge and save_entry.` }], isError: true };
    } catch (err) {
      return {
        content: [{ type: "text", text: `DevBrain error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true
      };
    }
  });
  return server;
}
(async () => {
  const DEFAULT_HTTP_PORT = 8080;
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : process.argv.includes("--serve") ? DEFAULT_HTTP_PORT : null;
  if (PORT) {
    let json = function(res, status, data) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    }, readBody = function(req) {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            reject(new Error("Invalid JSON"));
          }
        });
      });
    }, baseUrl = function(req) {
      const override = process.env.DEVBRAIN_PUBLIC_URL?.trim();
      if (override) return override.replace(/\/+$/, "");
      const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? `localhost:${PORT}`);
      const proto = String(req.headers["x-forwarded-proto"] ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0];
      return `${proto}://${host}`;
    };
    const HOST = devbrainMcp1.bindHost();
    const TOKEN = process.env.DEVBRAIN_TOKEN?.trim() || void 0;
    const refusal = devbrainMcp1.startupRefusal({ host: HOST, token: TOKEN });
    if (refusal) {
      console.error(refusal);
      process.exit(1);
    }
    const OPENAPI_SPEC = {
      openapi: "3.0.0",
      info: { title: "DevBrain API", version: "1.0.0", description: "Developer knowledge base \u2014 search past bugs, decisions, and patterns across projects." },
      paths: {
        "/api/search": {
          post: {
            operationId: "searchKnowledge",
            summary: "Search past bugs, fixes, decisions, and patterns",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", required: ["query"], properties: {
                query: { type: "string", description: "Natural language description of the problem" },
                category: { type: "string", enum: ["auth", "database", "deployment", "build", "config", "network", "performance", "ui", "data", "testing", "security", "other"] }
              } } } }
            },
            responses: { "200": { description: "Search results", content: { "application/json": { schema: { type: "object", properties: {
              text: { type: "string", description: "Human-readable search results summary" },
              results: { type: "array", items: { type: "object", properties: {
                type: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
                project: { type: "string" },
                match: { type: "string" }
              } } }
            } } } } } }
          }
        },
        "/api/save": {
          post: {
            operationId: "saveEntry",
            summary: "Save a knowledge entry (bug, fix, decision, pattern, lesson, etc.)",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", required: ["type", "title", "content"], properties: {
                type: { type: "string", enum: [...devbrainMcp1.distExports.ENTRY_TYPE_NAMES] },
                title: { type: "string", description: "One-line summary (max 120 chars)" },
                content: { type: "string", description: "Full explanation or solution" },
                tags: { type: "array", items: { type: "string" } },
                category: { type: "string", enum: ["auth", "database", "deployment", "build", "config", "network", "performance", "ui", "data", "testing", "security", "other"] }
              } } } }
            },
            responses: { "200": { description: "Saved confirmation", content: { "application/json": { schema: { type: "object", properties: {
              text: { type: "string", description: "Confirmation message" },
              saved: { type: "boolean" }
            } } } } } }
          }
        },
        "/api/context": {
          post: {
            operationId: "getContext",
            summary: "Get ranked historical context before starting a task",
            requestBody: {
              required: false,
              content: { "application/json": { schema: { type: "object", properties: {
                query: { type: "string", description: "Optional topic to focus context" }
              } } } }
            },
            responses: { "200": { description: "Ranked context", content: { "application/json": { schema: { type: "object", properties: {
              text: { type: "string", description: "Ranked context as formatted text" },
              context: { type: "string" }
            } } } } } }
          }
        }
      }
    };
    const httpServer = require$$1.createServer(async (req, res) => {
      const rawUrl = req.url?.split("?")[0] ?? "/";
      const trimmed = rawUrl.length > 1 ? rawUrl.replace(/\/+$/, "") : rawUrl;
      const url = trimmed === "/sse" ? "/mcp" : trimmed || "/";
      const refused = devbrainMcp1.checkRequest({ method: req.method, path: url, headers: req.headers }, { host: HOST, token: TOKEN });
      if (refused) {
        json(res, refused.status, { error: refused.error });
        return;
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "GET" && url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(devbrainMcp1.HTML_DASHBOARD);
        return;
      }
      if (req.method === "GET" && url === "/health") {
        json(res, 200, { status: "ok", service: "devbrain-mcp" });
        return;
      }
      if (req.method === "GET" && url === "/api/health") {
        try {
          const storage = devbrainMcp1.distExports.describeStorage();
          await devbrainMcp1.distExports.getAllProjects();
          json(res, 200, { status: "ok", storage: storage.kind, gemini: devbrainMcp1.distExports.hasGeminiCreds() });
        } catch (err) {
          json(res, 503, { status: "error", error: String(err) });
        }
        return;
      }
      if (req.method === "GET" && url === "/openapi.json") {
        json(res, 200, { ...OPENAPI_SPEC, servers: [{ url: baseUrl(req) }] });
        return;
      }
      if (req.method === "GET" && url === "/api/projects") {
        try {
          const [projects, entries] = await Promise.all([devbrainMcp1.distExports.getAllProjects(), devbrainMcp1.distExports.getAllEntriesWithProjects()]);
          const rows = projects.map((p) => {
            const d = devbrainMcp1.distExports.buildDossier(p, entries);
            return {
              id: p.id,
              name: p.name,
              path: p.path,
              stack: p.stack,
              total: d.total,
              lastEntryAt: d.lastEntryAt,
              sections: d.sections.map((s) => ({ section: s.section, heading: s.heading, count: s.entries.length }))
            };
          }).sort((a, b) => (b.lastEntryAt ?? 0) - (a.lastEntryAt ?? 0));
          json(res, 200, { projects: rows });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (req.method === "GET" && url === "/api/project") {
        try {
          const id = new URL(req.url ?? "", "http://x").searchParams.get("id");
          if (!id) {
            json(res, 400, { error: "id is required" });
            return;
          }
          const project = (await devbrainMcp1.distExports.getAllProjects()).find((p) => p.id === id);
          if (!project) {
            json(res, 404, { error: "project not found" });
            return;
          }
          const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
          const dossier = devbrainMcp1.distExports.buildDossier(project, all);
          json(res, 200, {
            project: dossier.project,
            total: dossier.total,
            lastEntryAt: dossier.lastEntryAt,
            supersededCount: dossier.supersededCount,
            // Whether any of this has ever caught a real failure, which is the
            // only evidence the store is worth keeping.
            use: devbrainMcp1.distExports.measureUse(all.filter((e) => e.projectId === project.id)),
            sections: dossier.sections.map((s) => ({
              section: s.section,
              heading: s.heading,
              blurb: s.blurb,
              entries: s.entries.map((e) => ({
                id: e.id,
                type: devbrainMcp1.distExports.normalizeType(e.type),
                title: e.title,
                content: e.content,
                tags: e.tags,
                category: e.category,
                createdAt: e.createdAt,
                timeAgo: devbrainMcp1.distExports.timeAgo(e.createdAt),
                confidence: e.confidence,
                errorPattern: e.errorPattern,
                causeArchetype: e.causeArchetype,
                supersededBy: e.supersededBy,
                seenInProjects: e.seenInProjects?.length ?? 0,
                // Needed by the dashboard filters: how often this has been used,
                // and whether it was captured from work or indexed from a file.
                retrievalCount: e.retrievalCount ?? 0,
                // Failures caught, and corrections made — kept apart from
                // retrievalCount, which counts being shown rather than helping.
                recallCount: e.recallCount ?? 0,
                revisionCount: e.revisionCount ?? 0,
                sourceFile: e.source?.file,
                // How this was captured, and what each recall actually matched.
                // An entry indexed from a file is `indexed` whether or not it
                // was written before the field existed, so an older store does
                // not read as a wall of unknowns.
                origin: e.origin ?? (e.source ? "indexed" : void 0),
                recalls: e.recalls ?? [],
                lastRecalledAt: e.lastRecalledAt
              }))
            }))
          });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (req.method === "GET" && url === "/api/stats") {
        try {
          const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
          const projects = await devbrainMcp1.distExports.getAllProjects();
          const counts = { bug: 0, fix: 0, note: 0, decision: 0, pattern: 0, lesson: 0, stack: 0, solution: 0, "anti-pattern": 0 };
          for (const e of all) {
            if (e.type in counts) counts[e.type]++;
          }
          json(res, 200, {
            totalEntries: all.length,
            totalProjects: projects.length,
            counts
          });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/api/feed" && req.method === "GET") {
        try {
          const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
          const active = all.filter((e) => !e.supersededBy).sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
          const mapped = active.map((e) => ({
            id: e.id,
            type: e.type,
            category: e.category,
            title: e.title,
            content: e.content,
            tags: e.tags,
            createdAt: e.createdAt,
            timeAgo: devbrainMcp1.distExports.timeAgo(e.createdAt),
            confidence: e.confidence,
            project: {
              name: e.project.name,
              stack: e.project.stack
            }
          }));
          json(res, 200, { feed: mapped });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url.startsWith("/api/graph") && req.method === "GET") {
        try {
          const id = new URL(req.url ?? "", "http://x").searchParams.get("id");
          if (!id) {
            json(res, 400, { error: "id is required" });
            return;
          }
          const all = (await devbrainMcp1.distExports.getAllEntriesWithProjects()).filter((e) => e.projectId === id);
          const graph = devbrainMcp1.distExports.buildGraph(devbrainMcp1.distExports.graphSubset(all));
          const counts = {};
          for (const e of graph.edges) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
          json(res, 200, {
            ...graph,
            counts,
            total: all.length,
            shown: graph.nodes.length,
            // What the inferred edges had to work with. Without this, "no
            // connections" is indistinguishable from "nothing to connect them
            // by yet", and only the second one is true today.
            fields: {
              sessionId: all.filter((e) => e.sessionId).length,
              errorPattern: all.filter((e) => e.errorPattern).length,
              causeArchetype: all.filter((e) => e.causeArchetype).length,
              fixes: all.filter((e) => e.fixes).length
            }
          });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/api/decisions" && req.method === "GET") {
        try {
          const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
          const decisions = all.filter((e) => e.type === "decision").sort((a, b) => b.createdAt - a.createdAt);
          const mapped = decisions.map((e) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            content: e.content,
            category: e.category,
            tags: e.tags,
            createdAt: e.createdAt,
            timeAgo: devbrainMcp1.distExports.timeAgo(e.createdAt),
            confidence: e.confidence,
            supersededBy: e.supersededBy ?? null,
            lastRetrievedAt: e.lastRetrievedAt ?? null,
            retrievalCount: e.retrievalCount ?? 0,
            causeArchetype: e.causeArchetype ?? null,
            project: { id: e.project.id, name: e.project.name, stack: e.project.stack }
          }));
          json(res, 200, { decisions: mapped });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (req.method === "POST" && req.url?.match(/^\/api\/decisions\/([^/]+)\/supersede$/)) {
        try {
          const oldId = req.url.match(/^\/api\/decisions\/([^/]+)\/supersede$/)[1];
          const { reason } = await readBody(req);
          const newId = nanoid1.nanoid();
          await devbrainMcp1.distExports.insertEntry({
            id: newId,
            projectId: "agent-builder",
            type: "decision",
            title: `[Superseded] ${reason?.slice(0, 100) ?? "Manually overridden via dashboard"}`,
            content: reason ?? "Manually marked as superseded via DevBrain dashboard.",
            tags: ["superseded"],
            createdAt: Date.now(),
            confidence: "observation",
            origin: "manual"
          });
          await devbrainMcp1.distExports.supersedeEntry(oldId, newId);
          json(res, 200, { ok: true, oldId, newId });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/api/search" && req.method === "POST") {
        try {
          const { query, category, error_pattern } = await readBody(req);
          if (!query) {
            json(res, 400, { error: "query is required" });
            return;
          }
          const searchText = error_pattern ? `${query} ${error_pattern}` : query;
          const queryEmbedding = await devbrainMcp1.distExports.getEmbedding(searchText).catch(() => []);
          const candidates = await searchCandidates(queryEmbedding);
          const results = devbrainMcp1.distExports.preciseSearch(searchText, queryEmbedding, candidates, { category, topK: 6 });
          await devbrainMcp1.distExports.bumpRetrievalCounts(results.map((r) => r.entry.id));
          const mapped = results.map((r) => ({
            type: r.entry.type,
            title: r.entry.title,
            content: r.entry.content,
            tags: r.entry.tags,
            project: r.project.name,
            match: devbrainMcp1.distExports.similarityLabel(r.similarity),
            matchType: r.matchType,
            createdAt: r.entry.createdAt
          }));
          const text = mapped.length === 0 ? `No results found for "${query}"` : mapped.map((r, i) => `${i + 1}. [${r.type}] ${r.title}
   ${r.match} \xB7 ${r.project}
   ${r.content}`).join("\n\n");
          json(res, 200, { text, results: mapped });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/api/save" && req.method === "POST") {
        try {
          const { type, title, content, tags = [], category, error_pattern, cause_archetype, project_id } = await readBody(req);
          if (!type || !title || !content) {
            json(res, 400, { error: "type, title, content are required" });
            return;
          }
          let targetId = project_id;
          if (targetId) {
            const known = (await devbrainMcp1.distExports.getAllProjects()).find((p) => p.id === targetId);
            if (!known) {
              json(res, 400, { error: `unknown project_id: ${targetId}` });
              return;
            }
            await devbrainMcp1.distExports.upsertProject({ ...known, lastSeen: Date.now() });
          } else {
            targetId = "unfiled";
            const existing = await devbrainMcp1.distExports.getProjectByPath("unfiled");
            await devbrainMcp1.distExports.upsertProject(existing ? { ...existing, lastSeen: Date.now() } : { id: "unfiled", name: "Unfiled", path: "unfiled", stack: [], createdAt: Date.now(), lastSeen: Date.now() });
          }
          let embedding;
          try {
            embedding = await devbrainMcp1.distExports.getEmbedding(`${title} ${content} ${tags.join(" ")}`);
          } catch {
          }
          await devbrainMcp1.distExports.insertEntry({
            id: nanoid1.nanoid(),
            projectId: targetId,
            type,
            title: title.slice(0, 120),
            content,
            tags,
            embedding,
            createdAt: Date.now(),
            confidence: "observation",
            // Typed into the dashboard by a person, whatever else is open.
            origin: "manual",
            ...category ? { category } : {},
            ...error_pattern ? { errorPattern: error_pattern } : {},
            ...cause_archetype ? { causeArchetype: cause_archetype } : {}
          });
          const confirmation = saveConfirmation(type, title, category, cause_archetype, error_pattern);
          json(res, 200, { text: confirmation, saved: true, type, title: title.slice(0, 80) });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/api/context" && req.method === "POST") {
        try {
          const { query } = await readBody(req);
          const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
          let queryEmbedding;
          if (query?.trim()) {
            try {
              queryEmbedding = await devbrainMcp1.distExports.getEmbedding(query);
            } catch {
            }
          }
          const raw = devbrainMcp1.distExports.buildContext(all, null, queryEmbedding);
          const ctx = await devbrainMcp1.distExports.compressContext(raw);
          const text = devbrainMcp1.distExports.formatContext(ctx, query);
          json(res, 200, { text, context: text });
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
        return;
      }
      if (url === "/agent" && req.method === "POST") {
        if (devbrainMcp1.distExports.isNoAiBuild()) {
          json(res, 501, {
            error: "The agent is not in this build of DevBrain. It needs Google ADK and Gemini, which are left out so the plugin fits the directory size limit. The dashboard, search and the MCP tools all work. Run the full build from source for the agent."
          });
          return;
        }
        try {
          const { query } = await readBody(req);
          if (!query?.trim()) {
            json(res, 400, { error: "query is required" });
            return;
          }
          const mcpUrl = `http://localhost:${PORT}/mcp`;
          const runAgent = omitted1.requireTheADKAgentRoute().runAgent;
          const response = await runAgent(query, mcpUrl, TOKEN);
          json(res, 200, { response, powered_by: "Google ADK + Gemini 2.5 Flash (Vertex AI) + DevBrain MCP" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = msg.includes("429") || msg.includes("quota") ? 429 : 500;
          json(res, status, { error: msg });
        }
        return;
      }
      if (url === "/mcp") {
        try {
          const rh = req.rawHeaders;
          let acceptIdx = -1;
          for (let i = 0; i < rh.length; i += 2) {
            if (rh[i].toLowerCase() === "accept") {
              acceptIdx = i;
              break;
            }
          }
          const cur = acceptIdx !== -1 ? rh[acceptIdx + 1] : "";
          if (!cur.includes("application/json") || !cur.includes("text/event-stream")) {
            if (acceptIdx !== -1) rh[acceptIdx + 1] = "application/json, text/event-stream";
            else rh.push("Accept", "application/json, text/event-stream");
          }
          const mcpServer = createMcpServer();
          const mcpTransport = new modelcontextprotocolSdk1.StreamableHTTPServerTransport({ sessionIdGenerator: void 0 });
          await mcpServer.connect(mcpTransport);
          await mcpTransport.handleRequest(req, res);
        } catch (err) {
          console.error("MCP transport error:", err);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end("MCP error");
          }
        }
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });
    httpServer.listen(PORT, HOST, () => {
      console.log(`DevBrain dashboard  http://localhost:${PORT}`);
      console.log(`DevBrain MCP        http://localhost:${PORT}/mcp`);
    });
  } else {
    const mcpServer = createMcpServer();
    const transport = new modelcontextprotocolSdk1.StdioServerTransport();
    await mcpServer.connect(transport);
  }
})();

exports.createMcpServer = createMcpServer;
