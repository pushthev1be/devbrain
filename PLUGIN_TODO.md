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
      and a test that fails if they have (same discipline as `npm run icons`).

      **Only the test existed when this was first ticked, and the half that was
      missing is the half that matters.** A test that *detects* drift still
      requires someone to remember `npm run bundle`; nothing in the repo invoked
      it but a person typing it. Over one session that failure fired three times
      — edit a source, run the suite, watch the staleness test fail, bundle by
      hand. Each of those was a workaround, not a fix, and it took DevBrain's own
      step-back prompt to say so.

      Now `build` ends with `npm run bundle`, because the bundles are build
      output, and `pretest` runs it too, so `npm test` and CI cannot see a bundle
      older than the source. 3.4s against a 30s suite. Verified by reproducing
      the stale state deliberately — touch a source so the bundle is provably
      older, then `npm test` with no manual step: it rebundled and all 513
      passed.

      `npx vitest run` still bypasses npm scripts and can therefore still be
      stale. That is what the test is for, and it is the thing I was doing.

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

## Submitting to Anthropic's directory

Audited against the pre-submission checklist and the component support table on
2026-10-09, not recalled.

- [x] **The one hard stop: a file over 5 MiB.** `plugin/dist/mcp.js` was 14.54 MB,
      so validation never produced a report at all — "Repository too large to
      validate", no findings. Almost none of it was DevBrain: `@google/adk` is
      0.34 MB itself and brings `@mikro-orm/core`, `@google-cloud/storage`,
      `@grpc/grpc-js`, `protobufjs` and `esprima`. It backs only HTTP
      `POST /agent`, which no plugin component calls.

      | bundle | size |
      |---|---|
      | both included | 14.54 MB — over |
      | without the ADK agent route | 3.91 MB |
      | without ADK and Gemini | **2.35 MB** |

      Both omitted, as asked. Now `cli.js` 3.10 MB and `mcp.js` 2.35 MB, and a
      test fails if either passes 5 MiB again.

      Stubbed, not marked `external`: external leaves a real `require` that throws
      MODULE_NOT_FOUND, and every `getEmbedding` call site catches, so the whole
      semantic path would go quiet with nothing to say why — the gcp-metadata
      mistake exactly. `isNoAiBuild()` short-circuits above each stub, `/agent`
      answers 501 with the reason, and tests pin the flag, the stub message and
      the absence of the Gemini client.

      **The cost, measured and documented rather than buried:** a paraphrased
      query matched 0 of 5 stored entries where the semantic route matched 4 of 5.
      Literal error text still matches, which is the route that fires when a
      command fails. The skill and `plugin/README.md` both say so, and point at
      the CLI for semantic search over the same `~/.devbrain` store.
- [x] **README in the plugin folder.** The directory reads the folder holding
      `.claude-plugin/plugin.json`, which is `plugin/`, so the 3,967-word README at
      the repo root was invisible and the check blocks on it. `plugin/README.md` is
      504 words outside code blocks, against a 40-word minimum.
- [x] **Cowork would have had no tools.** Cowork ignores an MCP server whose
      `${user_config.*}` reference has no default and never prompts for values, so
      the skill and commands would have loaded there with nothing behind them.
      `mongodb_uri` and `dashboard_token` now carry `"default": ""`.
- [x] **The Gemini key prompt is gone**, with its `env` entry — a
      `${user_config.KEY}` naming an option the manifest no longer declares is a
      validation error, and prompting for a key this build cannot use is a lie.
- [ ] **Move the plugin to its own repository.** Two findings share one fix. The
      validator holds "scripts the validator couldn't follow" because the plugin
      folder is a subfolder and the hooks run `node dist/cli.js`, a non-shell file;
      the documented remedy is to keep the plugin at the root of its own
      repository. That is also where the subfolder came from — `package.json` at the
      plugin root made Claude Code install Node dependencies and fail on Windows
      with `EPERM: operation not permitted, symlink`. Its own repo is at a root
      *and* has no `package.json`.
- [ ] **Two reviewer holds that remain by design.** `cli.js` and `mcp.js` are over
      the 256 KiB non-image limit, and "commit readable source instead of compiled,
      packed, or minified code" is held for a reviewer. Committed bundles are
      load-bearing: a plugin install runs neither `npm install` nor `tsc`. Not
      blocking, but a human reads each version.
- [x] **A privacy statement.** Not required to submit — the directory takes
      `plugin/README.md` as the listing description — but a reviewer looking at a
      tool that reads session transcripts will look for one, and there was nothing
      to point at. `PRIVACY.md` (870 words), with `privacyPolicyUrl` and
      `supportUrl` set in the manifest.

      Every claim in it was checked against the code before being written, not
      after: no telemetry or analytics identifiers anywhere in the sources, no
      outbound request of DevBrain's own (the one `fetch` is the dashboard's own
      browser script calling localhost), and the only home-directory reads are
      `~/.devbrain` and `~/.claude`. `privacy.test.ts` pins those three, and the
      guards were verified by injecting a violation and watching them fail by
      name — a privacy page is a promise in prose, so it goes stale silently.

      The URL resolves once this branch is on `main`, same as the install line.
- [ ] **Submit.** Needs a paid claude.ai plan, from claude.ai/directory/manage. The
      portal runs checks the CLI does not, so a clean local run is not a guarantee.

Passing already: name `devbrain` (lowercase, no reserved word, nothing that reads
as official) · `version`, `description`, `author`, `license` set · repo 5.0 MiB
zipped against 50 · 105 tracked files against 10,000 · 11 files in the plugin folder
against 512 · no `.DS_Store`/`Thumbs.db`/`desktop.ini` · no symlinks, submodules or
`.gitattributes` · no `package.json` or lockfile in the plugin folder, which avoids
the lockfile-install hold · MCP server started as `node` with plain
`${CLAUDE_PLUGIN_ROOT}` arguments · no `npx`/`uvx` launchers anywhere · every
credential through `userConfig` with `sensitive: true` · `hooks.json` valid, real
events only, not declared in `plugin.json` · skill and command front matter parse
with `description` as text.

---

## After

- [x] **`.env` keys read at module load are missed.** `import` statements hoist
      above the `loadGlobalEnv()` call, so any `process.env` read at a core
      module's top level happens before the file is loaded. That is
      `GEMINI_MODEL`, `GEMINI_EMBED_MODEL` and `DEVBRAIN_AI_TIMEOUT_MS` in
      `gemini.ts` — all advanced overrides that `devbrain setup` never writes, so
      nothing in the documented path is affected. The keys that matter are read
      lazily inside functions and do work. Fix by reading them at the point of
      use, not by moving the call. Done that way: `textModel()`,
      `embedModel()` and `geminiTimeoutMs()`. The last was an exported const and
      is now an exported function — nothing outside `gemini.ts` imported it. Two
      tests set the variable *after* the import and assert it takes effect,
      which is the thing that was broken.
- [x] **Ranking bug**: `patternScore` is weighted 0.45 against semantic's 0.30,
      so on a plain-English query — where the pattern term degenerates into title
      word overlap — the best semantic hit can land at rank 3 and be dropped by
      the top-2 cap. Reproduced and measured. Two changes, both principled rather
      than tuned:

      1. `patternOverlap`'s word-overlap branch filtered only words of two
         characters or less, so "the", "not", "when", "with" and "that" all
         counted as overlap. It now uses the same content-word test as the
         keyword index.
      2. Error-text overlap and title overlap are weighted apart instead of
         `max(error, title * 0.6) * 0.45`. Title overlap is a lexical signal, so
         it is paid BM25's 0.15; real error-text overlap keeps 0.45, which is
         what `devbrain search "<exact error>"` runs on.

      Measured over the real 222-entry store, 16 paraphrased queries written to
      avoid the entries' own wording plus 8 out-of-corpus controls:

      | | rank 1 | top 2 | top 3 | controls fired |
      |---|---|---|---|---|
      | before | 9/16 | 11/16 | 13/16 | 0/8 |
      | stopwords only | 11/16 | 11/16 | 12/16 | 0/8 |
      | both | **11/16** | **12/16** | 12/16 | **0/8** |

      The reported case went from rank 3 to rank 2, which is the one that
      matters: unprompted recall takes the top two. One case moved the other way,
      3 to 4 — a Supabase RLS query whose top five are all genuinely related
      security entries inside a 0.022 band, which is a cluster of neighbours
      rather than the same defect.

      Gating is deliberately untouched. `patternScore` still reports the combined
      value, so `recallForFailure`'s threshold and the "pattern match" label
      behave exactly as before and the controls stayed silent. Only order changed.

      Left alone on purpose: in nearly every remaining miss the correct entry has
      the **highest semantic score** and loses on BM25, which suggests the
      0.30/0.15/0.15 balance is wrong. That is a bigger claim than 16 cases can
      carry, and chasing it here would be fitting my own benchmark. It needs its
      own measured study.
- [ ] **Semantic against lexical weighting**, per the note above: the correct
      entry is usually the closest embedding and still loses on word overlap.
      Needs a larger query set than the 16 used for the ranking fix, and the
      harness to be committed rather than thrown away.
- [ ] **Dashboard stubs**: Edit, and Promote to all projects. Promote is what the
      Global scope needs.
- [x] **Write `supersedes` on insert.** ~~Only `supersededBy` is stored; the
      forward field is dead and the graph reads both directions to work around
      it.~~ **This was wrong, and nothing needed changing.** `supersedeEntry`
      writes both directions already — verified by running it against an
      isolated store rather than by reading: the retracted entry came back with
      `supersededBy`, and the correction with `supersedes` and
      `revisionCount: 1`, on the local and the Mongo path alike. The insert also
      precedes the call in `save_entry`, so the replacement exists to be
      stamped.

      What is true is the observation that produced the claim: of 223 entries, 8
      have `supersededBy` and 0 have `supersedes`. Those 8 were retracted by a
      one-off script that set the field directly — the one the "retracting eight
      noise entries" lesson records — so they never went through
      `supersedeEntry`. Reading both directions in `graph.ts` is therefore
      correct and must stay; removing it would drop every historical retraction
      from the graph. Its comment said the forward write did not exist, and has
      been corrected.

      Not done, and deliberately: backfilling `supersedes` onto those 8. It
      would make the data uniform, but it is a migration over someone's store to
      fix nothing — the graph already reads both directions.
- [x] **Stop offering generic lines as error patterns** — `Traceback (most recent
      call last):`, benchmark table rows. Same class already fixed for
      `Exit code 1`. `isGenericFailureLine` now also rejects the Python header
      (the real error is a traceback's *last* line, not its first), bare
      `Error`/`error:`, `Build failed`, `Test(s) failed`, `command failed with
      exit code N`, and any line carrying two ` | ` separators — a printed table
      row is output *about* failures, not one, and a pattern taken from a
      benchmark's own output matches that benchmark on every later run.

      Every addition is anchored to the whole line, so the informative lines
      stay: `ValueError: invalid literal for int()`, `Error: connect
      ECONNREFUSED 127.0.0.1:5432`, `error TS2305: ...` and `Build failed:
      missing module left-pad` are all still offered, and the tests assert that
      in both directions.
- [ ] **Open the PR.** 55 commits ahead of `main`, so the repo's landing page
      still shows the old README.
- [x] **Redeploy or retire the hosted demo.** It answers on `/` and `/agent`,
      404s on `/api/*`, and its database is unreachable. **Retired from the
      docs.** The README's "Live demo" banner and the `curl .../agent` example
      are gone, replaced by a note saying so and pointing at the plugin install
      — a half-working instance is worse than none, because what it showed was
      not what the repo does. The claim that Gemini is needed by "the hosted
      agent" now reads "the `/agent` route, if you deploy one".

      The deployment itself is untouched: that is infrastructure, and taking it
      down is the owner's call, not a documentation change. Cloud Run support
      stays — the Dockerfile and the HTTP transport are tested.
