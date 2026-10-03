# devbrain-live

A Claude Code [mod](https://code.claude.com/docs/en/plugins/mods/overview) that pins one line under the prompt saying what memory actually did this session:

```
DevBrain · 2 saved · 1 already known · 1 recalled
```

## Why

DevBrain's hooks all speak to the *agent*: the briefing goes into its context, the save prompt goes to it, the recall after a failing command goes to it. None of it is addressed to the person watching, so from the outside a session looks identical whether memory is working or doing nothing at all. That is how this project went write-only for two days without anyone noticing.

This is the dial on the outside of the box. It reads `DevBrain · watching` while nothing has happened yet, so a loaded mod never looks like a broken one.

- **saved** — entries recorded this session, through the `save_entry` MCP tool or `devbrain note`
- **already known** — saves DevBrain rejected as near-duplicates. Counted separately so the line doesn't read as a failure, and doesn't inflate the saved count
- **recalled** — past fixes DevBrain volunteered after a failing command

It also toasts each save as it happens, and adds `/devbrain-session`, which lists the titles.

The mod only watches. Every hook passes its event straight through, so it cannot change what Claude does.

## Use it

```bash
claude --plugin-dir ./mods/devbrain-live
```

To keep it, copy the directory somewhere of your own, or add it to a marketplace. Run `claude plugin test` in this directory for the tests.

## Limits

- **recalled** is read from `~/.devbrain/sessions/<session id>.json`, which DevBrain's `PostToolUse` hook writes. Without `devbrain hooks install` there is nothing to read, and the count stays at 0.
- The counts are per session and reset when the module reloads — including every time you save a file in it while developing.
- Tested against Claude Code v2.1.287, which is the first version with mods.
