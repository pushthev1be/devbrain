# Privacy

DevBrain is developer memory that runs on your own machine. This page says
exactly what it reads, what it keeps, where that lives, and what leaves — and
what it does not do, because for a tool that reads your coding sessions that is
the part worth being specific about.

Last reviewed: 2026-10-09.

## The short version

- Memory is a file on your computer: `~/.devbrain/db.json`
- The plugin build contains **no model**. There is nothing in it to send text to
- **No telemetry, no analytics, no usage reporting.** None. There is no code in
  DevBrain that reports anything about you anywhere
- The only service DevBrain will ever talk to is a database **you** configure,
  and it is optional
- Secrets are stripped before anything is written down

## What DevBrain reads

| Path | Why |
|---|---|
| `~/.claude/projects/<project>/*.jsonl` | Your Claude Code session transcripts. Read to work out whether a stretch of work resolved something, and to show your agent what it just did when asking it to record a lesson |
| `~/.claude/settings.json` | Only to check whether DevBrain's hooks are installed |
| `~/.devbrain/` | Its own memory, config and session cursors |
| Your git history, via `git log` in the repository you are working in | `devbrain backfill` offers past commits for your agent to learn from |

The transcript reading is the most sensitive thing here, so to be plain about
it: DevBrain parses those files locally to decide when to prompt your agent, and
to build the digest it shows your agent. In the plugin build that text is never
sent anywhere, because there is nowhere for it to go.

## What DevBrain writes, and where

Everything lives under `~/.devbrain/`:

- `db.json` — your entries and projects, with a lock file beside it so two
  sessions cannot overwrite each other
- `sessions/` — a small cursor per session, so the same entry is not shown twice
- `.env` — your own configuration, if you used the CLI's setup
- `capture.log` — a local record of when DevBrain asked for something or handed
  something over

Nothing is written inside the plugin's own directory, which is replaced on every
update. Nothing is written outside your home directory.

**Entry content is written by your coding agent, not by DevBrain.** An entry
holds what your agent chose to record: a title, a description of a cause and a
fix, and usually the exact error text. If your agent includes something from
your code or your session in that description, it is stored, because that is the
point — it is the thing you want back next week. Everything stored is readable
and editable: it is a JSON file you own, and `/devbrain:dashboard` shows you all
of it.

## Secrets are removed before storage

Error messages are where credentials leak. A failed request prints the bearer
token; a crashed config loader dumps the `.env` line. DevBrain scrubs text at the
point it is stored, and again before any text would leave for a model, covering
private key blocks, Anthropic, OpenAI, GitHub, GitLab, AWS, Google, Stripe,
Slack and npm tokens, JWTs, credentials inside URLs, `Authorization` headers and
`SECRET=`-style assignments.

The rules are deliberately narrow. A generic "long random string" rule would eat
the commit hashes and UUIDs that make an error findable, and a guard keeps
`password: string` in a quoted code sample intact. So treat it as a safety net
against the common accident, not as a guarantee: if you deliberately paste a
credential into an entry, it will be stored.

## What leaves your machine

In the plugin build, nothing — unless you turn one of these on yourself:

- **A MongoDB connection string.** Optional, and empty by default. Set it and
  your entries are stored in a database you control instead of the local file,
  which is how a team shares one memory. DevBrain does not host a database and
  Anthropic never sees it
- **The dashboard.** `/devbrain:dashboard` binds to `127.0.0.1` and refuses
  requests that do not come from your own machine. Exposing it beyond localhost
  requires you to set both a host and a token, and without the token the server
  refuses to start rather than serving what is stored

The full build, installed from source as the `devbrain` CLI, can additionally use
Google Gemini for search by meaning. That is opt-in, needs a key you supply, and
sends the query and entry text to Google under
[their terms](https://ai.google.dev/gemini-api/terms) — scrubbed first. The
plugin in Anthropic's directory does not include it.

## What DevBrain never does

- Report usage, errors or metrics to us or anyone else
- Send your code, transcripts or entries to a service you did not configure
- Read files outside the repository you are working in and `~/.devbrain` and
  `~/.claude` as listed above
- Require an account, a login or a network connection

## Deleting it

Your memory is one file. `rm -rf ~/.devbrain` removes everything DevBrain has
ever stored. Uninstalling the plugin removes the plugin; it does not touch your
memory, so that an uninstall does not silently lose months of notes.

## Contact

Questions or a problem with any of the above:
https://github.com/pushthev1be/devbrain/issues
