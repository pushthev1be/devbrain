---
description: Review commits and sessions DevBrain has not learned from yet, and save what matters.
argument-hint: [how many]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" backfill)
---

Run the bundled CLI:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" backfill
```

Run it bare to take the default. If $ARGUMENTS gives a count, append it; that
exact command is not pre-approved, so Claude Code asks before running it.

What comes back is unreviewed history — commits and past sessions DevBrain has
stored nothing about. It is raw material, not entries. For each one, decide
whether there is a durable lesson in it: a root cause, a decision and its
reason, a fix whose cause is not obvious from the diff. Save those with
`save_entry`, including the exact error text as `error_pattern` wherever the
commit shows one.

Skip the rest. Most commits are routine and deserve no entry — renames,
formatting, version bumps, work in progress. Saving them is worse than saving
nothing, because every weak entry makes the real ones harder to find.

Report how many you reviewed, how many you saved, and run it again if it says
there is more history left.
