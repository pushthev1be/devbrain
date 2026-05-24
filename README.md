# DevBrain

Persistent developer memory for you and your AI agents. Captures knowledge from git commits, lets you save typed notes instantly, and injects ranked context into Claude before it starts work — so it already knows what broke before, what was decided, and why.

<img width="923" height="866" alt="image" src="https://github.com/user-attachments/assets/68591649-0049-4e8d-bb72-620ffb604a91" />

---

## How it works

Every project you register gets two things: a git hook that captures knowledge from commits automatically, and an MCP server Claude Code connects to. When Claude starts a task it calls `get_context` to load your ranked engineering history. When it fixes a bug it calls `save_entry`. When you hit a known error pattern it finds the exact past fix — not just something semantically similar.

The memory compounds. An entry retrieved across multiple projects gets flagged as a cross-project pattern and surfaces in every future context load. An entry retrieved 3+ times gets promoted from `observation` to `confirmed` confidence.

---

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

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com):

```bash
mkdir -p ~/.devbrain
echo "GEMINI_API_KEY=your_key_here" > ~/.devbrain/.env
```

### Connect to Claude Code




https://github.com/user-attachments/assets/ca8cff35-a53c-4d21-b518-b388f7dbf90e






Add to `~/.claude/mcp.json`:

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

Restart Claude Code. DevBrain tools are now available in every session.

---

## Starting a new project

```bash
cd my-project
devbrain /init
```

Registers the project, detects the stack, installs the git hook. Then prints a block to paste into Claude Code chat. Claude creates `CLAUDE.md` with DevBrain instructions and scans the project — reading README, package.json, config files — saving what it finds as stack, decisions, and patterns. From that point Claude saves knowledge automatically during every session without being asked.

Run `devbrain /recap` after any session to extract and save anything Claude missed.

---

## Claude Code integration

Five MCP tools Claude calls automatically:

| Tool | When Claude uses it |
|------|----------------------|
| `get_context` | Start of any non-trivial task — loads ranked engineering history |
| `search_knowledge` | Before debugging — searches by error text + semantic similarity |
| `save_entry` | After fixing bugs, making decisions, finding patterns |
| `query_entries` | Browse by type/category/recency — "show me all auth decisions" |
| `get_project_summary` | Quick count of what's stored for a project |

CLAUDE.md instructs Claude to call these automatically — you never need to ask.

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
  /prompt       Regenerate Claude Code setup block
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
```

Sections with 2+ entries are synthesized by Gemini into bullet-point insights. The MCP `get_context` tool returns this format directly.

---

## Retrieval

Search uses a two-pass approach: pattern matching on stored `errorPattern` fields first, then semantic cosine similarity on embeddings as fallback. This means pasting an exact error message finds the specific past fix even if the wording differs from how it was saved.

**Ranking formula:**
```
semantic × 0.45 + recency × 0.10 + same-project × 0.10 + same-stack × 0.08
  + usage × 0.05 + confidence × 0.05 + category-match × 0.07
  + pattern-match × 0.05 + cross-project × 0.05
```

The same-project boost only fires when the entry already scores > 0.72 semantically — prevents local noise from outranking better cross-project solutions on a focused query. Without a query (general context load), same-project entries get a higher base score so they rank above entries from unrelated projects.

---

## Knowledge fields

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

## Engineering decisions

**JSON over SQLite** — the project targets Windows-first use where native module compilation is a common failure point. `better-sqlite3` requires node-gyp and Visual Studio build tools. Pure JSON with `readFileSync`/`writeFileSync` has zero native dependencies, works on every platform, and is trivially portable. The DB is a single file at `~/.devbrain/db.json`.

**Gemini over OpenAI** — `gemini-embedding-001` produces 3072-dimension embeddings vs OpenAI's 1536. Higher dimensionality improves retrieval precision for technical content where subtle semantic differences matter. Gemini 2.0 Flash handles extraction and synthesis at lower cost than GPT-4o.

**Two-pass retrieval over pure semantic search** — semantic similarity alone misses cases where the user pastes an exact error message that was saved with different surrounding words. Pattern matching on `errorPattern` runs first as a high-precision pass; semantic search runs as the fallback. This is the difference between finding the exact fix vs finding something vaguely related.

**Stdio MCP over HTTP** — stdio transport requires no port allocation, no auth tokens in config, no process management. Starts with Claude Code, stops with Claude Code. HTTP would add operational complexity for no benefit in this use case.

**Monorepo with npm workspaces** — `core` contains all domain logic and is shared between `cli` and `mcp`. This prevents the two surfaces from drifting — a change to search ranking or entry schema is reflected in both automatically. The alternative (two separate packages) would require manually keeping them in sync.

**No TTL or automatic expiry** — entries don't expire. A bug fix from two years ago is still valid knowledge. The ranking formula deprioritizes old entries via the recency score, but never removes them. The user controls deletion via `/browse`.

**Confidence tiers over arbitrary scoring** — `observation → corroborated → confirmed` maps directly to how knowledge actually becomes reliable: it's observed once, then seen to work again, then proven across multiple retrievals. Tiers also communicate uncertainty to Claude — a `confirmed` fix gets a higher confidence score in ranking.

---

## Storage

Everything is local. The only external calls are to the Gemini API.

```
~/.devbrain/
  db.json          # all projects, entries, and processed commits
  .env             # GEMINI_API_KEY
  setup.json       # first-run onboarding state
  *-export.zip     # exports
```

---

## Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **AI**: Gemini 2.0 Flash (extraction, synthesis) · gemini-embedding-001 (semantic search, 3072-dim)
- **Storage**: Pure JSON — no native dependencies
- **CLI**: inquirer · inquirer-autocomplete-prompt
- **MCP**: `@modelcontextprotocol/sdk` (stdio transport)
- **Monorepo**: npm workspaces (`packages/core` · `packages/cli` · `packages/mcp`)
