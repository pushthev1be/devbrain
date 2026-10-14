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
/plugin marketplace add pushthev1be/devbrain
/plugin install devbrain@devbrain
```

`pushthev1be/Devbrain-memory-Claudeplugin` works in the first line too: it is
where the built plugin lives, and the source repository's marketplace points
there.

There is no setup step. The first session in a repository registers it with its
detected stack.

Installing ends with "2 userConfig options not yet set". Both are optional, and
leaving them blank is the normal setup. **MongoDB connection string**: set it to
share one memory across machines or a team; empty keeps everything in the local
file. **Dashboard token**: only needed to reach the dashboard from another
machine; left empty it answers on localhost only and needs no token.

## What this build leaves out

This plugin matches on words and on exact error text, not on meaning. It
leaves out the embedding client, because with the agent runtime it came to
14.5 MB, and a plugin in the directory has to stay readable and within its file
limits.

What that means in practice:

- **A failing command** is matched on its error text. This route is unchanged:
  the exact error is what a failure produces.
- **A request you type** is matched when most of its words are in a stored entry,
  or when the entry's title says much the same thing. Measured against 105
  entries, it found 12 of 18 requests worded differently from the entry they
  were about, and stayed silent on all 20 requests about nothing stored. A
  request that shares few words with the entry is missed; with embeddings, the
  CLI finds those by meaning.
- **`search_knowledge` and `get_context`** rank by wording, and leave out
  entries that share too little of it with the query.

For matching by meaning, install the `devbrain` CLI from source. It shares the
same `~/.devbrain` store, so both see the same entries.

The HTTP agent route and the CLI's interactive terminal UI are also left out;
the route answers `501` saying so. The dashboard, search, backfill and all three
tools work.

## Where memory lives

`~/.devbrain/db.json`, with a lock file beside it so parallel sessions cannot
lose each other's writes, and `~/.devbrain/sessions/` for per-session cursors.
Nothing is written inside the plugin directory, which moves on every update.

Secrets are scrubbed before anything is stored and again before any text leaves
for a model, with narrow rules on purpose — a generic "long random string" would
eat the commit hashes and UUIDs that make an error findable.

## Source

This repository holds the built plugin: the bundled JavaScript in `dist/` (two
entry files and the readable chunks they share, each under 256 KiB), the hooks,
the skill, the commands and these docs. It deliberately has no `package.json`,
because a plugin root with one makes Claude Code install Node dependencies, and
for the source repository's npm workspace that fails on Windows with
`EPERM: operation not permitted, symlink`.

The readable source, TypeScript across three packages with its tests, is at
**https://github.com/pushthev1be/devbrain**, and `dist/` here is built
from it with `npm run bundle`. Issues and pull requests belong there.

MIT licensed. See [LICENSE](LICENSE) and [PRIVACY.md](PRIVACY.md).
