---
description: Open the DevBrain dashboard — everything saved, as a browsable graph.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/dist/mcp.js" --serve), Bash(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health)
---

Start the dashboard, if it is not already up.

First check whether something already answers on port 8080:

```
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health
```

If that prints 200, it is already running — just give the user
http://localhost:8080 and stop. Do not start a second one; the port is already
taken and the new process would exit with EADDRINUSE.

Otherwise start it **in the background** — it is a server and never exits, so a
foreground run would hang until the tool times out:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/mcp.js" --serve
```

Then tell the user it is at http://localhost:8080.

It binds loopback only, so it is reachable from this machine and nowhere else,
and needs no token for that. Reaching it from another machine means setting
both `DEVBRAIN_HOST` and a `DEVBRAIN_TOKEN`; without the token the server
refuses to start on a non-loopback address rather than exposing what is stored.
