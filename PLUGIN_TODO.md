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

508 tests.

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

- [x] esbuild `cli` and `mcp` to single files at `plugin/dist/cli.js` and
      `plugin/dist/mcp.js` (at `dist/` until step 5 moved the plugin root),
      platform `node`, externalising nothing that matters at runtime
- [x] un-ignore those two paths specifically, not `dist/` as a whole
- [x] a `prepare`-style script so the bundles cannot drift from source silently,
      and a test that fails if they have (same discipline as `npm run icons`)

### 2. Manifest and components

Everything goes at the plugin root; only `plugin.json` lives in
`.claude-plugin/`.

- [x] `.claude-plugin/plugin.json` — `name: "devbrain"` (kebab-case; names
      starting `claude-`/`anthropic-` are rejected, `devbrain` is clear)
- [x] `hooks/hooks.json` — the event map wrapped in a top-level `"hooks"` key. A
      file without that wrapper does not load. All five events:
      `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`,
      `Stop`
- [x] **Use exec form with `args`**, not shell form. `${CLAUDE_PLUGIN_ROOT}`
      resolves in both `command` and `args`, and exec form keeps a path with
      spaces as one argument — which matters immediately here, since the
      development path is `C:\Users\PUSH.DESKTOP-3JDAULT\…`
- [x] The MCP server, declared **inline in `plugin.json`** rather than in
      `.mcp.json` — `command: "node"`,
      `args: ["${CLAUDE_PLUGIN_ROOT}/dist/mcp.js"]`. The `.mcp.json` already at
      the repo root points at `packages/mcp/dist` for `npm run dev`, and both
      load: the plugin's server is namespaced `plugin_devbrain_devbrain`, the
      project's stays `devbrain`. They do **not** replace each other — the
      reference's "a server declared later replaces an earlier one" is about two
      declarations *within one plugin*, and a session with the plugin loaded here
      lists both. Harmless, and only ever visible in this repo, since a user
      installing the plugin has no `.mcp.json` of their own
- [x] `skills/devbrain/SKILL.md` replacing the 59-line `DEV_CONTEXT.md` copied
      into every repo. A skill updates with the plugin instead of going stale per
      repo. Note a `CLAUDE.md` at the plugin root is *not* loaded as context and
      raises a validation warning — the skill is the only correct home. The CLI
      keeps writing `DEV_CONTEXT.md` for people who installed it that way, so
      someone with both gets the same guidance twice; worth collapsing later,
      not worth breaking the CLI path for now
- [x] `commands/` for `/devbrain:search`, `/devbrain:backfill`, `/devbrain:dashboard`.
      All three hand the work to the agent rather than running it inline with
      `` !`…` ``: the dashboard is a server that never exits, backfill's output
      has to be read and acted on, and interpolating an error message into a
      shell string breaks on the first quote in a stack trace. `search` lists
      the read-only tool in `allowed-tools` so it does not prompt
- [x] **Do not add a `bin/` directory.** Files there join the Bash tool's PATH,
      but claude.ai and Cowork refuse to install a plugin that has one — it would
      cut off the distribution channel that matters most

### 3. Configuration through `userConfig`

This replaces `devbrain setup` and `~/.devbrain/.env`, and is better than both:
Claude Code prompts on enable, and `sensitive: true` values go to the platform's
secure credential store rather than `settings.json`.

- [x] `gemini_api_key` — `sensitive: true`, optional (keyword search works
      without it)
- [x] `mongodb_uri` — `sensitive: true`, optional; unset means the local JSON store
- [x] `dashboard_token` — `sensitive: true`, optional; only needed to expose the
      dashboard beyond loopback
- [x] Reference them as `${user_config.KEY}` in the MCP server's `env`. Hooks
      read `CLAUDE_PLUGIN_OPTION_<KEY>` from their environment instead —
      shell-form hook commands *reject* `${user_config.*}`, which is another
      reason to use exec form
- [x] Keep `~/.devbrain/.env` working as a fallback, so an existing CLI install
      is not broken by the plugin arriving. **This was broken, and the break was
      silent.** An optional `userConfig` value the user leaves blank — the default,
      and what the field's own description recommends — substitutes as an empty
      string, not as nothing. Both env loaders guarded with
      `process.env[key] === undefined`, so `""` counted as "set deliberately",
      `~/.devbrain/.env` was never read, and `db.ts`'s own `!uri.trim()` then
      quietly chose local JSON. The plugin installed, connected, answered every
      call and knew nothing, with no error anywhere. Reproduced directly:
      `MONGODB_URI="" devbrain search "Illegal return statement"` printed
      *No matches found* where the same search without the variable found the
      entry. Fixed in one place — `core/src/env.ts`, which both entry points now
      call — by treating an empty or whitespace value as absent, with tests on
      that case. Verified afterwards through the plugin's own server: 1 match,
      with its id

### 4. Register on SessionStart

- [x] When the repo is not a known project, register it then — replacing job 1 of
      `init`. There is no natural moment to run a setup command in the plugin
      path, and the hook already runs at exactly the right time. **Every hook was
      bailing on `if (!project) return`**, so in any repo nobody had run `init`
      in — which is every repo, for someone who only installed the plugin — the
      whole thing loaded and did nothing. Guarded by `looksLikeProject`: a git
      repo, or a directory with a detected stack. A session started in a home or
      Downloads folder registers nothing, because nobody would come back there
      looking for it. The first session also says so once, since
      `formatSessionBriefing` correctly returns null when nothing is stored, and
      a project registered automatically has nothing stored by definition.
      Verified against a throwaway HOME: git repo → registered with its stack and
      the message; second session → silent; bare directory → nothing
- [x] Decide deliberately where the store lives. `${CLAUDE_PLUGIN_DATA}`
      (`~/.claude/plugins/data/<id>/`) survives plugin updates and is the
      documented home for plugin state — but `~/.devbrain/db.json` is shared with
      the CLI and already holds everyone's data. **Decided: `~/.devbrain/`**, so
      the plugin and the CLI read one memory rather than two, and installing the
      plugin next to an existing CLI shows the entries that are already there
      instead of an empty store. `${CLAUDE_PLUGIN_DATA}` would be a second,
      invisible one. Checked rather than assumed: every write is
      `join(homedir(), '.devbrain', …)` — `db.json`, `db.json.lock`, `.env`,
      `sessions/` — and nothing is anchored to `__dirname` or the plugin root,
      which moves on every update

### 5. Validate and publish

- [x] `claude plugin validate .` — the authoritative check; `--strict` in CI so
      warnings fail. Passes, including `--strict`. It only reads the manifest,
      though: it says nothing about whether `hooks/hooks.json`, the skill or the
      commands load. For that, `claude --plugin-dir .` in a session is the real
      check, and it is what found the empty-string defect above
- [x] Fix the dead instruction in `init`'s output: it tells users to run
      `npx -y @devbrain/mcp`, and that package 404s. Either publish, or print the
      plugin install line. Prints the plugin install line — nothing is published,
      and `devbrain-workspace` is `private: true`, so the plugin is the only
      install that exists
- [x] Marketplace entry, then `/plugin marketplace add pushthev1be/devbrain`
      and `/plugin install devbrain@devbrain` as the documented install.
      `.claude-plugin/marketplace.json` at the repo root, plugin source
      `./plugin`.

      **The plugin root had to move out of the repo root.** Installing from the
      repo root failed outright on Windows:

          EPERM: operation not permitted, symlink '..\..\packages\core'
            -> ...\plugins\cache\temp_local_...\node_modules\@devbrain\core

      A plugin root holding a `package.json` makes Claude Code install the
      plugin's Node dependencies, and for an npm workspace root that means
      recreating the `packages/*` symlinks — which needs privileges a normal
      Windows user does not have. Confirmed both ways: the same files staged into
      a directory with no `package.json` installed first time. So `hooks/`,
      `commands/`, `skills/`, `.claude-plugin/plugin.json` and the bundles now
      live under `plugin/`, away from `package.json`.

      It also fixed what the install carried. From the repo root the plugin was
      the whole repository — sources, tests, `node_modules`. Installed now: 20 MB
      and seven directories, nothing else.

      Verified as a user, not by reading: `marketplace add` → `install` →
      `plugin details` reports 4 commands/skills, 5 hooks, 1 MCP server, ~216
      always-on tokens → `/devbrain:search` in a plain session (no
      `--plugin-dir`) returned the right entry with its id. Then uninstalled, so
      nothing was left installed on the machine that tested it.

      **Not live until this branch is on `main`.** `marketplace add
      pushthev1be/devbrain` fetches the default branch, and the README and
      `marketplace.json` land there together — so opening the PR below is what
      makes the documented install true

---

## After

- [ ] **`.env` keys read at module load are missed.** `import` statements hoist
      above the `loadGlobalEnv()` call, so any `process.env` read at a core
      module's top level happens before the file is loaded. That is
      `GEMINI_MODEL`, `GEMINI_EMBED_MODEL` and `DEVBRAIN_AI_TIMEOUT_MS` in
      `gemini.ts` — all advanced overrides that `devbrain setup` never writes, so
      nothing in the documented path is affected. The keys that matter are read
      lazily inside functions and do work. Fix by reading them at the point of
      use, not by moving the call.
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
