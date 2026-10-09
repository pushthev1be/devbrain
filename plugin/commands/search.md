---
description: Search this project's memory for a past fix, bug or decision. Exact error text works best.
argument-hint: <exact error text or a description>
# Searching is read-only, so it is pre-approved. Both names are listed because
# the plugin's own server is namespaced, and a user who also has the CLI
# installed has a project-level `devbrain` server from its .mcp.json.
allowed-tools: mcp__plugin_devbrain_devbrain__search_knowledge, mcp__devbrain__search_knowledge
---

Search DevBrain for: $ARGUMENTS

Call the `search_knowledge` MCP tool. If the text above looks like an error
message, stack trace line or failing command output, pass it verbatim as
`error_pattern` — unmodified, including punctuation and paths, because the
literal form is what matches a stored pattern. Otherwise pass it as the query.

Then report what came back: for each hit, what it was and what the fix or
decision was, with the id. If the results say none of them is a close match,
say plainly that nothing is stored about this rather than presenting a distant
hit as an answer.
