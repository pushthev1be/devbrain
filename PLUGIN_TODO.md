# Shipping DevBrain as a Claude Code plugin

What stands between "works on this machine" and "someone else can install it."
Ordered: the first section blocks distribution, the second makes it work, the
third is polish.

Everything here was verified against the code on 2026-10-08, not recalled.

---

## What `devbrain init` does today

The plugin has to absorb all of this, because a plugin install runs no commands.

| # | What it does | Who does it after |
|---|---|---|
| 1 | Registers the project — `upsertProject` with the detected stack | SessionStart hook, automatically |
| 2 | Removes the dead `devbrain capture` post-commit hook, and sweeps every other registered repo for it | keep in the CLI; one-off cleanup |
| 3 | Counts unreviewed commits | already in the session briefing |
| 4 | Installs 5 hooks into `.claude/settings.local.json` | the plugin's own `hooks/hooks.json` |
| 5 | Writes / refreshes `DEV_CONTEXT.md` in the repo | a skill, shipped with the plugin |
| 6 | Indexes `CLAUDE.md` / `AGENTS.md` if present | keep as `devbrain index`, offered in the briefing |
| 7 | Prints MCP config for the user to paste | the plugin's `.mcp.json` |

Two things fall out of that table:

- **Nothing is left for the user to run.** Registration moves into SessionStart,
  so there is no `init` step at all in the plugin path.
- **Step 7 is currently broken anyway.** It tells users to run
  `npx -y @devbrain/mcp`, and that package is not published — `npm view
  @devbrain/mcp` returns 404. Anyone who followed that instruction got nothing.

---

## Blocking — do not distribute without these

- [ ] **Bind the dashboard to localhost.** `--serve` listens on `0.0.0.0` with
      `Access-Control-Allow-Origin: *`, and `POST /api/save` and
      `/api/decisions/:id/supersede` need no auth. While it runs, any web page
      the user visits and any host on their LAN can read or write their memory.
      Default to `127.0.0.1`; `0.0.0.0` only behind an explicit flag or when
      `PORT` is set by Cloud Run. Drop the wildcard CORS header. Require a token
      on write routes.
- [ ] **Redact secrets before storing or embedding.** Error text routinely
      carries tokens, connection strings and keys, and DevBrain stores it *and
      sends it to Gemini to embed*. Acceptable with your own key on your own
      machine; not acceptable shipped to other people. Scrub on the way in —
      `recallForFailure`, `save_entry`, and the Stop hook's quoted evidence.
- [ ] **Lock `db.json`.** Two sessions writing the local store at once lose
      updates. More likely once people run several repos in parallel, which is
      the normal case for this tool.

## Packaging

- [ ] **Bundle `cli` and `mcp` with esbuild into single files and commit them.**
      Installing a plugin copies the repo and runs neither `npm install` nor
      `tsc`. `dist/` is currently gitignored and 0 built files are tracked, so a
      plugin built from the repo as-is installs with nothing to run.
- [ ] **Add the plugin manifest** — `.claude-plugin/plugin.json` at the repo
      root, alongside the existing `mods/devbrain-live` one.
- [ ] **Point hooks at the bundle**: `hooks/hooks.json` running
      `node ${CLAUDE_PLUGIN_ROOT}/dist/cli.js hook <event>` for all five events
      (`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`,
      `Stop`), rather than the bare `devbrain` command that only exists after
      `npm link`.
- [ ] **Ship `.mcp.json`** pointing at `${CLAUDE_PLUGIN_ROOT}/dist/mcp.js`, so
      the three tools register on install with nothing to paste.
- [ ] **Turn `DEV_CONTEXT.md` into a skill.** 59 lines telling an agent how to
      read and write memory, currently copied into every repo. A skill is loaded
      on demand and updates with the plugin instead of going stale per repo.
- [ ] **Register the project on SessionStart** when the repo is not known yet,
      replacing step 1 of `init`. The plugin path has no natural moment to run a
      setup command.
- [ ] **Keep the CLI working.** `search`, `backfill`, `index`, `--serve` and the
      REPL stay useful; they just stop being required.

## Then

- [ ] **Fix the dead `npx -y @devbrain/mcp` instruction** in `init`'s output —
      either publish the package or print the plugin install line instead.
- [ ] **Wire the two dashboard stubs**: Edit, and Promote to all projects. Both
      currently say "not wired up yet"; Promote is what the Global scope needs.
- [ ] **Fix the ranking bug**: `patternScore` is weighted 0.45 against
      semantic's 0.30, so on a plain-English query — where the pattern term
      degenerates into title word overlap — the best semantic hit can land at
      rank 3 and be dropped by the top-2 cap. Measured, with a reproduction.
- [ ] **Write `supersedes` on insert.** Only the reverse pointer
      `supersededBy` is stored; the forward field is dead, and the graph reads
      both directions to work around it.
- [ ] **Stop offering generic lines as error patterns.** The Stop hook has
      offered `Traceback (most recent call last):` and benchmark table rows —
      the same class already fixed for `Exit code 1`.
- [ ] **Open the PR.** 54 commits ahead of `main`, so the repo's landing page
      still shows the old README with wrong numbers and screenshots of a
      dashboard that no longer exists.
- [ ] **Redeploy or retire the hosted demo.** It answers on `/` and `/agent`,
      404s on `/api/*`, and its database is unreachable.
