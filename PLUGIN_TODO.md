# Shipping DevBrain as a Claude Code plugin

Verified against the code and against the plugin reference on 2026-10-08, not
recalled. Ordered: what is done, then the packaging work in the order it has to
happen, then what can follow.

---

## Done

The three things that blocked distributing it at all are closed and verified by
request rather than by reading:

- **Secrets never enter memory.** `redact.ts` scrubs at the storage boundary and
  again before any text leaves for a model. Narrow rules on purpose — a generic
  "long random string" would eat the commit hashes and UUIDs that make an error
  findable — plus a `looksLikeCode` guard so `password: string` in quoted code
  survives intact.
- **The dashboard is off the network.** `httpGuard.ts` binds loopback unless
  `DEVBRAIN_HOST` or Cloud Run says otherwise, requires the Host header to name
  loopback, refuses cross-origin outright, and refuses to start exposed without
  `DEVBRAIN_TOKEN`. Measured: cross-origin 403, `Host: evil` 403, no CORS
  header, none/wrong/right token 401/401/200, page shell open.
- **Parallel sessions no longer lose saves.** An O_EXCL lock around
  reload-mutate-write, stale-broken after ten seconds, with a Windows retry on
  the rename.

485 tests.

---

## What `devbrain init` does, and who takes each job

A plugin install copies the repo and runs no commands, so every one of these has
to land somewhere else.

| # | `init` does | After |
|---|---|---|
| 1 | Registers the project with its detected stack | SessionStart hook, automatically |
| 2 | Removes the dead `devbrain capture` git hook, sweeping other repos | stays in the CLI — one-off cleanup |
| 3 | Counts unreviewed commits | already in the session briefing |
| 4 | Writes 5 hooks into `.claude/settings.local.json` | the plugin's `hooks/hooks.json` |
| 5 | Writes `DEV_CONTEXT.md` into the repo | a skill under `skills/` |
| 6 | Indexes `CLAUDE.md` / `AGENTS.md` | stays as `devbrain index`, offered in the briefing |
| 7 | Prints MCP config to paste | the plugin's `.mcp.json` |

Once 1, 4, 5 and 7 move, **there is no `init` step left** — nothing for a user to
run after installing.

---

## The plan

### 1. Bundle, and commit the bundles

Installing a plugin runs neither `npm install` nor `tsc`, and `dist/` is
gitignored with 0 built files tracked — so a plugin built from the repo as-is
installs with nothing to run.

- [ ] esbuild `cli` and `mcp` to single files at `dist/cli.js` and `dist/mcp.js`,
      platform `node`, externalising nothing that matters at runtime
- [ ] un-ignore those two paths specifically, not `dist/` as a whole
- [ ] a `prepare`-style script so the bundles cannot drift from source silently,
      and a test that fails if they have (same discipline as `npm run icons`)

### 2. Manifest and components

Everything goes at the plugin root; only `plugin.json` lives in
`.claude-plugin/`.

- [ ] `.claude-plugin/plugin.json` — `name: "devbrain"` (kebab-case; names
      starting `claude-`/`anthropic-` are rejected, `devbrain` is clear)
- [ ] `hooks/hooks.json` — the event map wrapped in a top-level `"hooks"` key. A
      file without that wrapper does not load. All five events:
      `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`,
      `Stop`
- [ ] **Use exec form with `args`**, not shell form. `${CLAUDE_PLUGIN_ROOT}`
      resolves in both `command` and `args`, and exec form keeps a path with
      spaces as one argument — which matters immediately here, since the
      development path is `C:\Users\PUSH.DESKTOP-3JDAULT\…`
- [ ] `.mcp.json` at the plugin root — `command: "node"`,
      `args: ["${CLAUDE_PLUGIN_ROOT}/dist/mcp.js"]`
- [ ] `skills/devbrain/SKILL.md` replacing the 59-line `DEV_CONTEXT.md` copied
      into every repo. A skill updates with the plugin instead of going stale per
      repo. Note a `CLAUDE.md` at the plugin root is *not* loaded as context and
      raises a validation warning — the skill is the only correct home
- [ ] `commands/` for `/devbrain:search`, `/devbrain:backfill`, `/devbrain:dashboard`
- [ ] **Do not add a `bin/` directory.** Files there join the Bash tool's PATH,
      but claude.ai and Cowork refuse to install a plugin that has one — it would
      cut off the distribution channel that matters most

### 3. Configuration through `userConfig`

This replaces `devbrain setup` and `~/.devbrain/.env`, and is better than both:
Claude Code prompts on enable, and `sensitive: true` values go to the platform's
secure credential store rather than `settings.json`.

- [ ] `gemini_api_key` — `sensitive: true`, optional (keyword search works
      without it)
- [ ] `mongodb_uri` — `sensitive: true`, optional; unset means the local JSON store
- [ ] `dashboard_token` — `sensitive: true`, optional; only needed to expose the
      dashboard beyond loopback
- [ ] Reference them as `${user_config.KEY}` in the MCP server's `env`. Hooks
      read `CLAUDE_PLUGIN_OPTION_<KEY>` from their environment instead —
      shell-form hook commands *reject* `${user_config.*}`, which is another
      reason to use exec form
- [ ] Keep `~/.devbrain/.env` working as a fallback, so an existing CLI install
      is not broken by the plugin arriving

### 4. Register on SessionStart

- [ ] When the repo is not a known project, register it then — replacing job 1 of
      `init`. There is no natural moment to run a setup command in the plugin
      path, and the hook already runs at exactly the right time
- [ ] Decide deliberately where the store lives. `${CLAUDE_PLUGIN_DATA}`
      (`~/.claude/plugins/data/<id>/`) survives plugin updates and is the
      documented home for plugin state — but `~/.devbrain/db.json` is shared with
      the CLI and already holds everyone's data. Recommendation: keep
      `~/.devbrain/`, and never write to `${CLAUDE_PLUGIN_ROOT}`, which moves on
      every update

### 5. Validate and publish

- [ ] `claude plugin validate .` — the authoritative check; `--strict` in CI so
      warnings fail
- [ ] Fix the dead instruction in `init`'s output: it tells users to run
      `npx -y @devbrain/mcp`, and that package 404s. Either publish, or print the
      plugin install line
- [ ] Marketplace entry, then `/plugin marketplace add pushthev1be/devbrain`
      and `/plugin install devbrain` as the documented install

---

## After

- [ ] **Ranking bug**: `patternScore` is weighted 0.45 against semantic's 0.30,
      so on a plain-English query — where the pattern term degenerates into title
      word overlap — the best semantic hit can land at rank 3 and be dropped by
      the top-2 cap. Reproduced and measured.
- [ ] **Dashboard stubs**: Edit, and Promote to all projects. Promote is what the
      Global scope needs.
- [ ] **Write `supersedes` on insert.** Only `supersededBy` is stored; the
      forward field is dead and the graph reads both directions to work around it.
- [ ] **Stop offering generic lines as error patterns** — `Traceback (most recent
      call last):`, benchmark table rows. Same class already fixed for
      `Exit code 1`.
- [ ] **Open the PR.** 55 commits ahead of `main`, so the repo's landing page
      still shows the old README.
- [ ] **Redeploy or retire the hosted demo.** It answers on `/` and `/agent`,
      404s on `/api/*`, and its database is unreachable.
