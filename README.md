# DevBrain

Persistent developer memory for you and your AI agents. Captures technical knowledge from git commits, lets you save typed notes instantly, and injects ranked context into Gemini and other MCP-compliant agents before they start work — so they already know what broke before, what was decided, and why.

**🚀 Live demo:** **https://devbrain-oujuoveyvq-uc.a.run.app** — dashboard + team feed, with the agent at `POST /agent` and the MCP server at `/mcp`. Runs on **Gemini 2.5 Flash (Vertex AI)** + **MongoDB Atlas Vector Search** on **Google Cloud Run**.

```bash
# Ask the deployed agent (Gemini 2.5 Flash on Vertex AI) anything in your team's memory:
curl -X POST https://devbrain-oujuoveyvq-uc.a.run.app/agent \
  -H "Content-Type: application/json" \
  -d '{"query":"any fixes for mobile safe-area overlap?"}'
```

<img width="923" height="866" alt="image" src="https://github.com/user-attachments/assets/68591649-0049-4e8d-bb72-620ffb604a91" />

---

## How it works

Every project you register gets two things: a git hook that captures knowledge from commits automatically, and an MCP/HTTP server that Google Cloud Agent Builder, Gemini Code Assist, and other MCP clients connect to. When your agent starts a task, it calls `get_context` to load your ranked engineering history. When it fixes a bug, it calls `save_entry`. When you hit a known error pattern, it finds the exact past fix — not just something semantically similar.

The memory compounds. An entry retrieved across multiple projects gets flagged as a cross-project pattern and surfaces in every future context load. An entry retrieved 3+ times gets promoted from `observation` to `confirmed` confidence.

### Shared Knowledge Across Codebases
Every registered project writes to one knowledge base — local by default, or a shared MongoDB Atlas cluster when `MONGODB_URI` is set. Across your own projects this works either way; a *team* sharing collective memory is what pointing several machines at the same Atlas database gives you:
- **The Team Feed**: The web dashboard renders a shared activity timeline of the latest fixes, decisions, and patterns across all registered codebases, each labeled with its project and stack.
- **CLI sibling alerts**: When you load context in the CLI, DevBrain surfaces the most recent entries from your *other* projects (e.g. surfacing a layout fix saved in a mobile repo while you work on a web frontend), so solutions cross repository boundaries instead of being re-derived.

<img width="1315" height="580" alt="Image" src="https://github.com/user-attachments/assets/50542418-3346-45d7-8987-8124762487b4" />
---
<img width="1689" height="707" alt="Image" src="https://github.com/user-attachments/assets/a69b0fdf-be49-4ed1-9e92-76df1406357a" />


## Install

```bash
git clone https://github.com/pushthev1be/devbrain.git
cd devbrain
npm install --ignore-scripts
npm run build --workspace=packages/core
npm run build --workspace=packages/cli
npm run build --workspace=packages/mcp
cd packages/cli && npm link
```

Then run the setup wizard:

```bash
devbrain setup
```

It asks two things — where to keep your memory, and your Gemini credentials — and writes them to `~/.devbrain/.env`. You can re-run it anytime.

### Storage: local by default

**No database required.** With `MONGODB_URI` unset, DevBrain stores everything in `~/.devbrain/db.json` and ranks embeddings in memory. Saving, searching, context and git auto-capture all work with nothing provisioned.

Set `MONGODB_URI` when you want to:
- share one knowledge base across a team or several machines
- use **Atlas Vector Search** server-side instead of in-memory ranking (create a 3072-dim cosine index named `embedding_index` on the `entries` collection)

Switching is just the env var — the two backends are interchangeable at runtime.

### Gemini credentials

Semantic search and auto-capture need Gemini; saving and recalling notes don't. DevBrain runs Gemini on one of two backends: **Vertex AI** (Google Cloud) for hosted/production, or the **Gemini Developer API** (AI Studio) for local dev.

For local dev, get a free key at [aistudio.google.com](https://aistudio.google.com):

```bash
mkdir -p ~/.devbrain
echo "GEMINI_API_KEY=your_key_here" > ~/.devbrain/.env
```

To run on Google Cloud AI instead, see [Running on Vertex AI](#running-on-vertex-ai-google-cloud) below. To try DevBrain with no credentials at all, see [Mock Mode](#running-offline-mock-mode).

### Running Offline (Mock Mode)

To run DevBrain completely offline for development, testing, or recording demonstrations without requiring an active Gemini API key, enable **Mock Mode** in your environment:
- **Bash / Git Bash**: `export DEVBRAIN_MOCK="true"`
- **PowerShell**: `$env:DEVBRAIN_MOCK="true"`

This intercepts Gemini API calls and returns pre-computed high-fidelity synthetic vectors and technical memory mockups.

### Connect to your AI Agent or MCP Client

To run the MCP server locally using standard stdio transport, add this server block to your client configurations:

```json
{
  "mcpServers": {
    "devbrain": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/devbrain/packages/mcp/dist/index.js"]
    }
  }
}
```

For hosted developer teams, DevBrain is optimized for cloud deployment and supports Streamable HTTP (SSE) transport natively.

---

## Running on Vertex AI (Google Cloud)

In production DevBrain runs Gemini — both reasoning (`gemini-2.5-flash`) and embeddings (`gemini-embedding-001`, 3072-dim) — on **Vertex AI**, Google Cloud's managed AI platform. The ADK agent ([`packages/mcp/src/agent.ts`](packages/mcp/src/agent.ts)) and the core extraction/embedding pipeline ([`packages/core/src/gemini.ts`](packages/core/src/gemini.ts)) both honor the same backend switch, so a single set of environment variables moves the whole system onto Google Cloud AI.

**1. Enable the API and grant access** (one-time, on a billing-enabled project):

```bash
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT
# Grant the runtime identity (Cloud Run service account) access to Vertex AI:
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member="serviceAccount:YOUR_RUNTIME_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

**2. Set the backend env vars** (on Cloud Run, or locally):

```bash
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT
GOOGLE_CLOUD_LOCATION=global   # AI-Studio-origin projects serve Gemini chat via `global`
MONGODB_URI=...                # your Atlas connection string
```

> **Model/location note:** `gemini-2.5-flash` is the default chat model and is served from the `global` location on Vertex (regional locations like `us-central1` also work for embeddings). On projects created through Google AI Studio (`gen-lang-client-*`), `gemini-2.0-flash` is unavailable on Vertex — use `gemini-2.5-flash`. Override with `GEMINI_MODEL` if needed.

**3. Authentication is automatic.** On Cloud Run, Gemini calls authenticate via the attached service account through Application Default Credentials (ADC) — no API key or key file. To test the Vertex path locally:

```bash
gcloud auth application-default login
```

When `GOOGLE_GENAI_USE_VERTEXAI` is unset or `false`, DevBrain falls back to the Gemini Developer API using `GEMINI_API_KEY` — convenient for offline/local work. Either way the model IDs and 3072-dim embedding schema are identical, so your MongoDB Atlas Vector Search index is unchanged across backends.

> Deploy: `gcloud run deploy` builds the included [`Dockerfile`](Dockerfile) and serves the MCP SSE endpoint on `:8080`. Set the four env vars above on the service.

---

## Starting a new project

```bash
cd my-project
devbrain init
devbrain backfill        # import knowledge from commits you already made
```

`init` registers the project, detects the tech stack, installs the post-commit git hook, and creates `DEV_CONTEXT.md`.

### Don't start from empty

The git hook only sees commits made from now on, so a freshly initialised project has nothing to recall. `devbrain backfill` reads commits that already happened — one Gemini extraction each — so `devbrain context` is useful on day one instead of in three weeks.

```bash
devbrain backfill        # last 20 commits (default)
devbrain backfill 100    # go further back
```

Entries are dated by their original commit, so history reads in the right order. Processed commits are recorded, so the command is safe to re-run: it resumes where it stopped and skips what it already imported. If Gemini rate-limits mid-run, it stops cleanly and tells you to re-run.

`DEV_CONTEXT.md` provides prompt-level guidelines directing your AI agents (Gemini, Agent Builder, or terminal assistants) to automatically fetch technical history using `get_context` and log new learnings using `save_entry`. From that point on, your agent updates your project memory autonomously as you code.

Run `devbrain /recap` after any coding session to extract and save anything your agent missed.

---

## AI Agent Integration & MCP Tools

Five MCP tools your agent calls automatically:

| Tool | When your agent uses it |
|------|----------------------|
| `get_context` | Start of any non-trivial task — loads ranked engineering history |
| `search_knowledge` | Before debugging — searches by error text + semantic similarity |
| `save_entry` | After fixing bugs, making decisions, finding patterns |
| `query_entries` | Browse by type/category/recency — "show me all auth decisions" |
| `get_project_summary` | Quick count of what's stored for a project |

`DEV_CONTEXT.md` instructs the agent to invoke these tools automatically — you never need to prompt manually.

---

## Interactive REPL

```bash
devbrain
```

```
────────────────────────────────────────────────────────────────────────────────
devbrain  ❯ /
────────────────────────────────────────────────────────────────────────────────
❯ /search       Semantic search across all projects
  /context      Inject ranked context for AI agents
  /browse       Scroll through all saved entries
  /save         Save entry  (bug: fix: stack: decision: anti-pattern: ...)
  /recap        AI-extract + save knowledge from a session
  /backfill     Import knowledge from past commits
  /prompt       Regenerate agent DEV_CONTEXT.md setup block
  /summary      Project name, stack and recent entries
  /export       Export knowledge to zip file
  /open         Open ~/.devbrain in file explorer
  /init         Register project + install git hook
```

---

## Quick saves

Type a prefix at the prompt — saved immediately, no AI call:

```
bug: JWT token expires in production but not locally
fix: set TOKEN_EXPIRY=86400 in the prod .env
decision: use JSON storage over SQLite — no native compilation on Windows
anti-pattern: never access req.user without auth middleware — silent 401 becomes runtime crash
pattern: always run npm install --ignore-scripts on Windows
stack: React, TypeScript, Vite, TailwindCSS, Node.js
```

Devbrain checks for near-duplicate entries at save time (>86% embedding similarity) and warns before saving a duplicate. For decisions, it checks if you're superseding an existing one and marks the old entry as superseded.

---

## Context output

```
# DevBrain Context — my-project — "auth"

## Cross-Project Patterns
- Missing auth middleware on protected routes [×3 projects]
  archetype: missing guard middleware causes silent runtime failure at request time

## Past Issues & Fixes
• JWT expiry diverges between local and production — set TOKEN_EXPIRY explicitly in prod .env
• Refresh token race condition resolved by serializing concurrent requests

## Architecture Decisions
- Stateless JWT over Redis sessions — stateless, works across microservices without shared cache

## Anti-Patterns (avoid these)
- Never access req.user before requireAuth middleware — fails silently in some Express versions

## Patterns & Lessons
- Always verify TOKEN_EXPIRY is consistent across all environments including Docker

## Tech Stack
React · TypeScript · Node.js · Express · MongoDB

📢 Team Updates (from Sibling Projects)
  • [fix] Fix safe-area overlap and remove backdrop blurs from mobile navigation overlays (oracle-odds-ai · 2d ago)
    → Removed backdrop filters in favor of solid high-opacity backgrounds to resolve rendering overhead and...
  • [fix] Fix z-index nesting trap and mobile contrast issues in React+Tailwind layout (oracle-odds-ai · 2d ago)
    → Resolved layout overlap and modal blocking issues on mobile viewports by moving fixed-overlay modals...
```

Sections with 2+ entries are synthesized by Gemini into bullet-point insights. The MCP `get_context` tool returns this format directly.

---

## Technical Retrieval Ranking

Search uses a two-pass approach: pattern matching on stored `errorPattern` fields first, then semantic cosine similarity on embeddings as fallback. This means pasting an exact error message finds the specific past fix even if the wording differs from how it was saved.

**Ranking formula:**
```
semantic × 0.45 + recency × 0.10 + same-project × 0.10 + same-stack × 0.08
  + usage × 0.05 + confidence × 0.05 + category-match × 0.07
  + pattern-match × 0.05 + cross-project × 0.05
```

The same-project boost only fires when the entry already scores > 0.72 semantically — prevents local noise from outranking better cross-project solutions on a focused query. Without a query (general context load), same-project entries get a higher base score so they rank above entries from unrelated projects.

---

## Knowledge Fields

Every entry stores:

| Field | Purpose |
|-------|---------|
| `type` | `bug` `fix` `decision` `pattern` `lesson` `anti-pattern` `stack` `note` `solution` |
| `category` | `auth` `database` `deployment` `build` `config` `network` `performance` `ui` `data` `testing` `security` `other` |
| `errorPattern` | Exact error text — enables direct pattern matching, bypasses semantic threshold |
| `causeArchetype` | Abstract root cause transferable across projects — e.g. "missing guard middleware causes silent runtime failure" |
| `confidence` | `observation` → `corroborated` (retrieved 2×) → `confirmed` (retrieved 3×) |
| `seenInProjects` | Project IDs that have retrieved this entry — 2+ triggers cross-project promotion |
| `supersededBy` | ID of replacement entry — superseded decisions shown separately, not in main context |

---

## Auto-capture from git

After `devbrain /init`, a post-commit hook runs after every commit. Gemini extracts the problem, solution, tags, category, error pattern, and cause archetype from the diff and commit message. If rate-limited, the commit is left unprocessed and retried next time — no knowledge is lost.

---

## Engineering & Architectural Decisions

**MongoDB Atlas for Cloud Scaling & Stored Vectors** — Employs a robust hosted MongoDB Atlas database for technical vector searches. High-dimensional technical embeddings (3072 dimensions) are matched against `$vectorSearch` cosine-similarity indexes directly in the cloud. For offline development, testing, and demo recording, `DEVBRAIN_MOCK=true` intercepts all Gemini calls with deterministic mock vectors and extractions — no API key or network required.

**Gemini on Vertex AI & High-Dimensional Embeddings** — Both reasoning and embeddings run on **Vertex AI**, Google Cloud's managed AI platform, via the unified `@google/genai` SDK and Application Default Credentials (no API keys in production). `gemini-embedding-001` produces 3072-dimension embeddings — higher dimensionality improves retrieval precision for technical content where subtle semantic differences matter — and `gemini-2.5-flash` handles knowledge extraction and context synthesis in real time. A single env switch (`GOOGLE_GENAI_USE_VERTEXAI`) falls back to the Gemini Developer API for offline/local dev without changing model IDs or the embedding schema.

**High-Fidelity Offline Mock Mode (`DEVBRAIN_MOCK=true`)** — Integrates a comprehensive simulation engine that intercepts all Gemini LLM and embedding API calls. When enabled, it dynamically serves realistic mock extractions, classifications, and project recaps. This enables offline development, CI/CD testing, and rate-limit-free video demonstrations without requiring active API keys.

**Stateless SSE HTTP Request Isolation** — Re-architected the MCP SSE server endpoint to dynamically spin up an isolated, fresh MCP `Server` and `StreamableHTTPServerTransport` instance per incoming connection. This eliminates session cross-talk, memory leaks, and state pollution typical of stateless standard HTTP servers handling concurrent agent requests.

**Two-pass retrieval over pure semantic search** — semantic similarity alone misses cases where the user pastes an exact error message that was saved with different surrounding words. Pattern matching on `errorPattern` runs first as a high-precision pass; semantic search runs as the fallback. This is the difference between finding the exact fix vs finding something vaguely related.

**Dual-Transport MCP: stdio and SSE Cloud Run** — DevBrain is built for standard local workflows via stdio transport, and easily scales to team-wide cloud deployments via a containerized SSE HTTP server. Deploying to Google Cloud Run enables instant cross-project access for hosted agent builders (such as Google Cloud Agent Builder) and serves a highly polished, responsive, VS Code-inspired dark theme developer dashboard.

**Monorepo with npm workspaces** — `core` contains all domain logic and is shared between `cli` and `mcp`. This prevents the two surfaces from drifting — a change to search ranking or entry schema is reflected in both automatically.

**Confidence tiers over arbitrary scoring** — `observation → corroborated → confirmed` maps directly to how knowledge actually becomes reliable: it's observed once, then seen to work again, then proven across multiple retrievals.

**Shared Cross-Project Feed & CLI alerts** — A centralized `/api/feed` endpoint returns the most recent entries across every registered project, rendered as a timeline in the dashboard; the CLI mirrors this by surfacing recent entries from sibling projects during context loads. Because all projects share one Atlas database, a team connected to the same `MONGODB_URI` accumulates a single collective engineering memory — solutions surface across repository boundaries instead of being re-solved in each silo.


---

## Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **AI Backend**: Gemini on **Vertex AI** (Google Cloud) — `gemini-2.5-flash` (extraction, synthesis) · `gemini-embedding-001` (semantic search, 3072-dim). Falls back to the Gemini Developer API for local dev.
- **Agent**: Google ADK (`@google/adk`) `LlmAgent` consuming the DevBrain + MongoDB MCP servers
- **Database**: MongoDB Atlas (Vector Search indices)
- **Deployment**: Google Cloud Run (SSE HTTP server transport, ADC auth to Vertex AI)
- **CLI**: inquirer · inquirer-autocomplete-prompt
- **MCP**: `@modelcontextprotocol/sdk` (stdio & HTTP transport modes)
- **Monorepo**: npm workspaces (`packages/core` · `packages/cli` · `packages/mcp`)
