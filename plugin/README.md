<img src="assets/logo.svg" alt="" width="56" height="56">

# DevBrain

Persistent memory for your coding agent. It writes down what it fixes and decides
as it works, and reads it back before the next task — so the next session already
knows what broke before, what was decided, and why.

Nothing is sent anywhere. Memory is a JSON file at `~/.devbrain/db.json` on your
own machine, and this build contains no model at all.

## What you get

Three tools the agent calls itself:

| Tool | When it fires |
|---|---|
| `get_context` | Starting a non-trivial task — ranked history for it |
| `search_knowledge` | Before debugging an error, on the exact error text |
| `save_entry` | After fixing, deciding or learning something non-obvious |

Three commands you run:

- `/devbrain:search <error>` — search memory, exact error text works best
- `/devbrain:backfill` — review commits DevBrain has not learned from yet
- `/devbrain:dashboard` — everything saved, as a browsable graph on localhost

And five triggers, so reading memory is not something anyone has to remember:
the session opens with a briefing, a problem you describe is matched before work
starts, a failing command is matched against past fixes unasked, and at the end
of a turn that resolved something you are asked to record it.

## Install

```
/plugin marketplace add pushthev1be/Devbrain-memory-Claudeplugin
/plugin install devbrain@devbrain
```

Capitalisation matters in that first line: enter the repository exactly as it is
spelled, or the marketplace will not resolve.

There is no setup step. The first session in a repository registers it with its
detected stack.

Two optional values, both safe to leave blank. **MongoDB connection string** —
set it to share one memory across machines or a team; empty keeps everything in
the local file. **Dashboard token** — only needed to reach the dashboard from
another machine; left empty it answers on localhost only and needs no token.

## What this build leaves out

This plugin matches on wording and on exact error text. It does **not** do
semantic search, because the embedding client and the agent runtime together came
to 14.5 MB and the directory refuses any plugin file over 5 MiB.

What that costs, measured on a real store: a query paraphrasing a stored entry in
different words matched 4 of 5 with embeddings and 0 of 5 without. A literal error
message still matches, which is the route that fires when a command fails. For
semantic search, install the `devbrain` CLI from source — it shares the same
`~/.devbrain` store, so both see the same entries.

The HTTP agent route is also absent for the same reason, and answers `501` saying
so. The dashboard, search, backfill and all three tools work.

## Where memory lives

`~/.devbrain/db.json`, with a lock file beside it so parallel sessions cannot
lose each other's writes, and `~/.devbrain/sessions/` for per-session cursors.
Nothing is written inside the plugin directory, which moves on every update.

Secrets are scrubbed before anything is stored and again before any text leaves
for a model, with narrow rules on purpose — a generic "long random string" would
eat the commit hashes and UUIDs that make an error findable.

## Source

This repository holds the built plugin: two bundled JavaScript files, the hooks,
the skill, the commands and these docs. It deliberately has no `package.json`,
because a plugin root with one makes Claude Code install Node dependencies, and
for the source repository's npm workspace that fails on Windows with
`EPERM: operation not permitted, symlink`.

The readable source — TypeScript across three packages, 536 tests — is at
**https://github.com/pushthev1be/devbrain**, and `plugin/dist/*.js` here is built
from it with `npm run bundle`. Issues and pull requests belong there.

MIT licensed. See [LICENSE](LICENSE) and [PRIVACY.md](PRIVACY.md).
