---
description: Review commits and sessions DevBrain has not learned from yet, and save what matters.
argument-hint: [how many]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" backfill*)
---

Run the bundled CLI:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" backfill
```

Append a count if one was given in $ARGUMENTS; otherwise run it bare and take
the default.

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
