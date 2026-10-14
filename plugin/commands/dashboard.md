---
description: Open the DevBrain dashboard — everything saved, as a browsable graph.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/mcp.js" --serve)
---

Start the dashboard **in the background** — it is a server and never exits, so
a foreground run would hang until the tool times out:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/mcp.js" --serve
```

Then tell the user it is at http://localhost:8080.

If a dashboard is already running, the new process says the port is in use and
exits on its own. The running one is at the same address, so the answer is the
same: http://localhost:8080. Do not start it a second time.

It binds loopback only, so it is reachable from this machine and nowhere else,
and needs no token for that. Reaching it from another machine means setting
both `DEVBRAIN_HOST` and a `DEVBRAIN_TOKEN`; without the token the server
refuses to start on a non-loopback address rather than exposing what is stored.
