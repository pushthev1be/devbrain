#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const require$$0$1 = require('child_process');
const omitted1 = require('./lib/omitted-1.js');
const require$$1 = require('path');
const require$$0 = require('fs');
const devbrainMcp1 = require('./lib/devbrain-mcp-1.js');
const nanoid1 = require('./lib/nanoid-1.js');
const require$$2 = require('os');
const devbrainCli1 = require('./lib/devbrain-cli-1.js');

const PLUGIN_BUILD = true;
devbrainMcp1.distExports.usePluginSettings();
const devbrainDir = require$$1.join(require$$2.homedir(), ".devbrain");
const setupPath = require$$1.join(devbrainDir, "setup.json");
function isOnboarded() {
  try {
    return require$$0.existsSync(setupPath) && JSON.parse(require$$0.readFileSync(setupPath, "utf-8")).onboarded === true;
  } catch {
    return false;
  }
}
function markOnboarded() {
  if (!require$$0.existsSync(devbrainDir)) require$$0.mkdirSync(devbrainDir, { recursive: true });
  require$$0.writeFileSync(setupPath, JSON.stringify({ onboarded: true, setupAt: Date.now() }), "utf-8");
}
devbrainMcp1.distExports.globalEnvPath();
function explainError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/No Gemini credentials|GOOGLE_CLOUD_PROJECT is not set/i.test(msg))
    return `No Gemini credentials \u2014 run ${devbrainCli1.CYAN}devbrain setup${devbrainCli1.RESET} to add a key.`;
  if (/bad auth|[Aa]uthentication failed/.test(msg))
    return `The database rejected the credentials in MONGODB_URI \u2014 check the username and password.`;
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|querySrv|[Ss]erver selection/.test(msg))
    return `Can't reach the database \u2014 check MONGODB_URI and your network connection.`;
  return msg;
}
function reportError(err, label = "Error") {
  console.error(`
  ${devbrainCli1.RED}${label}:${devbrainCli1.RESET} ${explainError(err)}
`);
  if (process.env.DEVBRAIN_DEBUG && err instanceof Error && err.stack) {
    console.error(`${devbrainCli1.DIM}${err.stack}${devbrainCli1.RESET}
`);
  }
}
function dim(text) {
  return `${devbrainCli1.DIM}${text}${devbrainCli1.RESET}`;
}
function bold(text) {
  return `${devbrainCli1.BOLD}${text}${devbrainCli1.RESET}`;
}
function typeCode(type) {
  switch (type) {
    case "bug":
      return devbrainCli1.RED;
    case "fix":
    case "solution":
      return devbrainCli1.GREEN;
    case "stack":
      return devbrainCli1.CYAN;
    case "decision":
      return devbrainCli1.MAGENTA;
    case "pattern":
    case "lesson":
      return devbrainCli1.YELLOW;
    case "anti-pattern":
      return "\x1B[91m";
    case "image":
      return "\x1B[35m";
    default:
      return devbrainCli1.BLUE;
  }
}
function openPath(target) {
  const { execFile } = require$$0$1;
  const opener = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
  execFile(opener, [target], () => {
  });
}
function typeDot(type) {
  return `${typeCode(type)}\u25CF${devbrainCli1.RESET}`;
}
function spin(text) {
  const frames = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${devbrainCli1.CYAN}${frames[i++ % frames.length]}${devbrainCli1.RESET} ${text}`);
  }, 80);
  return {
    succeed: (msg) => {
      clearInterval(id);
      process.stdout.write(`\r${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} ${msg}
`);
    },
    fail: (msg) => {
      clearInterval(id);
      process.stdout.write(`\r${devbrainCli1.RED}\u2717${devbrainCli1.RESET} ${msg}
`);
    },
    stop: () => {
      clearInterval(id);
      process.stdout.write("\r\x1B[K");
    }
  };
}
async function refreshStack(project) {
  try {
    const stack = devbrainMcp1.distExports.detectStack(project.path);
    if (!stack.length) return;
    const same = stack.length === project.stack.length && stack.every((s, i) => s === project.stack[i]);
    if (same) return;
    await devbrainMcp1.distExports.upsertProject({ ...project, stack });
  } catch {
  }
}
async function printProjectContext() {
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  const project = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
  console.log(devbrainCli1.BANNER);
  if (!project) {
    console.log(`  ${devbrainCli1.YELLOW}No project tracked here.${devbrainCli1.RESET} Select ${devbrainCli1.CYAN}Init project${devbrainCli1.RESET} to start.
`);
    return;
  }
  await refreshStack(project);
  await devbrainMcp1.distExports.upsertProject({ ...project, lastSeen: Date.now() });
  const entries = await devbrainMcp1.distExports.getEntriesByProject(project.id);
  const bugs = entries.filter((e) => e.type === "bug").length;
  const fixes = entries.filter((e) => e.type === "fix").length;
  const notes = entries.filter((e) => e.type === "note").length;
  const hooksOn = agentHooksInstalled(repoRoot);
  console.log(`  ${bold("Project")}  ${project.name}`);
  console.log(`  ${bold("Stack")}    ${project.stack.join(", ") || "Unknown"}`);
  console.log(`  ${bold("Hooks")}    ${hooksOn ? `${devbrainCli1.GREEN}\u2713 Claude Code${devbrainCli1.RESET}` : `${devbrainCli1.YELLOW}\u2717 not installed${devbrainCli1.RESET}  ${devbrainCli1.DIM}devbrain hooks install${devbrainCli1.RESET}`}`);
  console.log(`  ${bold("Memory")}   ${entries.length} entries  ${dim(`${bugs} bugs \xB7 ${fixes} fixes \xB7 ${notes} notes`)}  ${dim(`\xB7 ${devbrainMcp1.distExports.describeStorage().kind === "local" ? "local" : "MongoDB"}`)}`);
  if (entries.length > 0) {
    console.log(`
  ${devbrainCli1.CYAN}Recent knowledge${devbrainCli1.RESET}`);
    entries.slice(0, 4).forEach((e) => {
      const dot = typeDot(e.type);
      const title = e.title.length > 72 ? e.title.slice(0, 72) + "\u2026" : e.title;
      console.log(`  ${dot} ${title}  ${dim(devbrainMcp1.distExports.timeAgo(e.createdAt))}`);
    });
  }
  console.log();
}
const DEVCONTEXT_BEGIN = "<!-- devbrain:begin \u2014 generated by `devbrain init`; edits inside are overwritten -->";
const DEVCONTEXT_END = "<!-- devbrain:end -->";
function replaceDevbrainBlock(doc, block) {
  const begin = doc.indexOf(DEVCONTEXT_BEGIN);
  if (begin !== -1) {
    const end = doc.indexOf(DEVCONTEXT_END, begin);
    if (end !== -1) {
      const tail = doc.slice(end + DEVCONTEXT_END.length);
      return doc.slice(0, begin) + block.trimEnd() + (tail.trim() ? tail : "\n");
    }
  }
  const legacy = doc.indexOf("## DevBrain Memory");
  if (legacy === -1) return null;
  const head = doc.slice(0, legacy).trimEnd();
  return (head ? `${head}

` : "") + block;
}
async function handleInit() {
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  let unreviewed = 0;
  const s = spin("Detecting project...");
  try {
    const stack = devbrainMcp1.distExports.detectStack(repoRoot);
    const name = devbrainMcp1.distExports.getProjectName(repoRoot);
    const merge = await devbrainMcp1.distExports.mergeDuplicateProjects(repoRoot);
    const existing = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
    const isNew = !existing;
    await devbrainMcp1.distExports.upsertProject({
      id: existing?.id ?? nanoid1.nanoid(),
      name,
      path: repoRoot,
      stack,
      createdAt: existing?.createdAt ?? Date.now(),
      lastSeen: Date.now()
    });
    s.succeed(`Registered: ${devbrainCli1.BOLD}${name}${devbrainCli1.RESET}`);
    console.log(`  Stack: ${stack.join(", ") || "Unknown"}`);
    for (const m of merge?.merged ?? []) {
      console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Merged an earlier record of this repo from ${m.project.path} (${m.entries} entries)`);
    }
    if (devbrainMcp1.distExports.isGitRepo(repoRoot)) {
      if (devbrainMcp1.distExports.removeGitHook(repoRoot)) {
        console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Removed the old post-commit hook \u2014 your agent reviews commits now`);
      }
      const alsoCleaned = await cleanStaleGitHooks(repoRoot);
      if (alsoCleaned.length) {
        console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Removed the same dead hook from ${alsoCleaned.join(", ")}`);
      }
      unreviewed = (await unreviewedCommits(repoRoot)).length;
    } else {
      console.log(`  ${devbrainCli1.YELLOW}\u26A0${devbrainCli1.RESET}  Not a git repo \u2014 knowledge comes from agent sessions and notes`);
    }
    try {
      const path = agentSettingsPath(repoRoot, false);
      writeAgentSettings(path, devbrainMcp1.distExports.withDevbrainHooks(readAgentSettings(path)));
      console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Claude Code hooks installed \u2014 sessions start briefed, and your agent is asked to record what it fixes`);
    } catch (err) {
      console.log(`  ${devbrainCli1.YELLOW}\u26A0${devbrainCli1.RESET}  Could not install Claude Code hooks: ${explainError(err)}`);
    }
    const devContextMdPath = require$$1.join(repoRoot, "DEV_CONTEXT.md");
    const devbrainBlock = [
      DEVCONTEXT_BEGIN,
      "## DevBrain Memory",
      "",
      "> DevBrain is an **installed CLI tool** (`devbrain` npm package). DO NOT reimplement",
      "> or recreate it. Run `devbrain --help` to verify. All commands below are real shell",
      "> commands \u2014 invoke them with Bash/PowerShell, do not write code that mimics them.",
      "",
      `Project: ${name}  |  Stack: ${stack.join(", ") || "Unknown"}`,
      "",
      "### Before every task",
      "```",
      "# Load what broke before, what was decided, what to avoid:",
      'devbrain context "<the task>"            # MCP: get_context',
      "",
      "# Before debugging \u2014 search with the EXACT error text:",
      'devbrain search "<exact error message>"  # MCP: search_knowledge',
      "```",
      "",
      "### You write the record \u2014 DevBrain stores it",
      "",
      "DevBrain runs no model of its own: you did the work, so you write the entry.",
      "Do not wait to be asked. Save as soon as you think any of these:",
      "",
      '- "That was non-obvious \u2014 I would not have known that without digging"',
      '- "This fix took longer than it should have \u2014 future me should know this"',
      '- "This behavior is counterintuitive \u2014 it looks like X but actually does Y"',
      '- "We decided against the obvious approach \u2014 here is why"',
      '- "This error message is misleading \u2014 the real cause is something else"',
      '- "This works in dev but will break in production for this exact reason"',
      "",
      "```",
      "# MCP: save_entry (type, title, content, error_pattern). Or from the shell:",
      'devbrain note "fix: <symptom> \u2014 <root cause, then the exact fix>"',
      'devbrain note "decision: <what was chosen> \u2014 <what was rejected, and why>"',
      'devbrain note "lesson: <what looked right> \u2014 <why it was wrong>"',
      'devbrain note "anti-pattern: <what never to do> \u2014 <the consequence>"',
      "```",
      "",
      "### What makes a good entry",
      '- **Title**: the symptom or the decision, specific and searchable ("JWT expiry fails in prod", not "auth bug")',
      "- **Content**: the root cause, then the exact fix \u2014 not just the fix",
      "- **Error pattern**: the exact error message, verbatim, whenever there is one",
      "- **Wrong entry?** Save what is true with `save_entry` and pass the wrong entry's id as `supersedes`",
      "",
      "### What DevBrain does for you (Claude Code, with `devbrain hooks install`)",
      "",
      "- At session start, this project's memory is put in your context.",
      "- When a shell command fails and memory holds the same error, the past fix is handed to you",
      "  unasked. You do not have to remember to search \u2014 but searching still finds more.",
      "- When a stretch of work fixes or decides something and you saved nothing,",
      "  DevBrain asks you to record it before you finish. Saving earlier means it never has to ask.",
      "- If it mentions unreviewed commits, run `devbrain backfill` when there is a pause,",
      "  save what matters from it, and repeat until it says history is fully reviewed.",
      "",
      "### Rules",
      "- Run `devbrain context` before any non-trivial task.",
      "- Run `devbrain search` before debugging an error you have not seen before.",
      "- If you had to think to solve it, save it.",
      "- **Never reimplement devbrain** \u2014 run `devbrain --help` to confirm it is installed.",
      "",
      DEVCONTEXT_END,
      ""
    ].join("\n");
    if (!require$$0.existsSync(devContextMdPath)) {
      require$$0.writeFileSync(devContextMdPath, devbrainBlock, "utf-8");
      console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Created DEV_CONTEXT.md \u2014 AI Agent will call DevBrain automatically`);
    } else {
      const existing2 = require$$0.readFileSync(devContextMdPath, "utf-8");
      const updated = replaceDevbrainBlock(existing2, devbrainBlock);
      if (updated === null) {
        require$$0.writeFileSync(devContextMdPath, existing2.trimEnd() + "\n\n" + devbrainBlock, "utf-8");
        console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Updated DEV_CONTEXT.md \u2014 DevBrain block appended`);
      } else if (updated === existing2) {
        console.log(`  ${devbrainCli1.DIM}DEV_CONTEXT.md already up to date${devbrainCli1.RESET}`);
      } else {
        require$$0.writeFileSync(devContextMdPath, updated, "utf-8");
        console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Refreshed DEV_CONTEXT.md \u2014 DevBrain instructions updated`);
      }
    }
    if (DEFAULT_SOURCE_FILES.some((f) => require$$0.existsSync(require$$1.join(repoRoot, f)))) {
      await handleIndex().catch((err) => {
        console.log(`  ${devbrainCli1.YELLOW}\u26A0${devbrainCli1.RESET}  Could not index: ${explainError(err)}`);
      });
    }
    const W2 = Math.min(process.stdout.columns || 80, 80);
    const bar2 = `${devbrainCli1.DIM}${"\u2500".repeat(W2)}${devbrainCli1.RESET}`;
    console.log(bar2);
    console.log(`
  ${devbrainCli1.BOLD}${devbrainCli1.CYAN}Give your agent the memory tools${devbrainCli1.RESET}  ${devbrainCli1.DIM}(one-time, per machine)${devbrainCli1.RESET}
`);
    console.log(`  The hooks above brief each session and ask the agent to record what it`);
    console.log(`  fixes. The three tools \u2014 get_context, search_knowledge, save_entry \u2014 come`);
    console.log(`  from the plugin. In Claude Code:
`);
    console.log(`    ${devbrainCli1.CYAN}/plugin marketplace add pushthev1be/devbrain${devbrainCli1.RESET}`);
    console.log(`    ${devbrainCli1.CYAN}/plugin install devbrain@devbrain${devbrainCli1.RESET}
`);
    console.log(`  ${devbrainCli1.DIM}It brings its own hooks, so you can skip ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain init${devbrainCli1.RESET}${devbrainCli1.DIM} in your other repos.${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}For any other MCP host, point it at a clone:${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}{"command": "node", "args": ["<clone>/plugin/dist/mcp.js"]}${devbrainCli1.RESET}
`);
    console.log(bar2);
    console.log();
    if (unreviewed > 0) {
      console.log(`  ${devbrainCli1.BOLD}Next:${devbrainCli1.RESET} ${unreviewed} past commit${unreviewed === 1 ? "" : "s"} to learn from. Ask your coding agent:`);
      console.log(`  ${devbrainCli1.CYAN}"run devbrain backfill and save what matters"${devbrainCli1.RESET}
`);
    }
  } catch (err) {
    s.fail("Init failed");
    reportError(err);
  }
}
const BACKFILL_SCAN = 200;
const BACKFILL_COMMITS_DEFAULT = 8;
const BACKFILL_SESSIONS = 2;
const LIVE_SESSION_MS = 10 * 60 * 1e3;
async function unreviewedCommits(repoRoot) {
  if (!devbrainMcp1.distExports.isGitRepo(repoRoot)) return [];
  return devbrainMcp1.distExports.filterUnprocessedCommits(devbrainMcp1.distExports.listCommitHashes(repoRoot, BACKFILL_SCAN)).catch(() => []);
}
async function cleanStaleGitHooks(skip) {
  const cleaned = [];
  for (const p of await devbrainMcp1.distExports.getAllProjects().catch(() => [])) {
    if (skip !== void 0 && devbrainMcp1.distExports.sameProjectPath(p.path, skip)) continue;
    try {
      if (devbrainMcp1.distExports.removeGitHook(p.path)) cleaned.push(p.name);
    } catch {
    }
  }
  return cleaned;
}
function pastSessions(repoRoot) {
  const now = Date.now();
  return transcriptsFor(repoRoot).filter((f) => now - require$$0.statSync(f).mtimeMs > LIVE_SESSION_MS);
}
async function handleBackfill(args) {
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(process.cwd()) ?? process.cwd();
  const project = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
  if (!project) {
    console.log(`
  ${devbrainCli1.YELLOW}Not a DevBrain project:${devbrainCli1.RESET} ${repoRoot}`);
    console.log(`  ${devbrainCli1.DIM}Run ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain init${devbrainCli1.RESET}${devbrainCli1.DIM} here first.${devbrainCli1.RESET}
`);
    return;
  }
  const countArg = args.find((a) => /^\d+$/.test(a));
  const limit = countArg ? Math.max(1, Math.min(Number(countArg), 50)) : BACKFILL_COMMITS_DEFAULT;
  const preview = args.includes("--print");
  const forAgent = preview || !process.stdout.isTTY;
  const pending = await unreviewedCommits(repoRoot);
  const sessions = pastSessions(repoRoot);
  if (!forAgent) {
    const open = sessions.filter((f) => devbrainMcp1.distExports.nextSessionChunk(require$$0.readFileSync(f, "utf-8"), devbrainMcp1.distExports.readCursor(require$$1.basename(f, ".jsonl")).line).digest).length;
    console.log(`
  ${devbrainCli1.BOLD}Unreviewed history${devbrainCli1.RESET} ${devbrainCli1.DIM}\u2014 ${project.name}${devbrainCli1.RESET}`);
    console.log(`  ${pending.length} commit${pending.length === 1 ? "" : "s"}${pending.length >= BACKFILL_SCAN ? "+" : ""} \xB7 ${open} earlier agent session${open === 1 ? "" : "s"}
`);
    if (!pending.length && !open) {
      console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Everything has been reviewed.
`);
      return;
    }
    console.log(`  This is reading material for your coding agent \u2014 it writes the entries,`);
    console.log(`  DevBrain only stores them. Ask it:
`);
    console.log(`    ${devbrainCli1.CYAN}"run devbrain backfill and save what matters"${devbrainCli1.RESET}
`);
    console.log(`  ${devbrainCli1.DIM}To read a batch yourself without marking it reviewed: ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain backfill --print${devbrainCli1.RESET}
`);
    return;
  }
  let budget = devbrainMcp1.distExports.BACKFILL_BATCH_BUDGET;
  const commits = [];
  for (const hash of pending) {
    if (commits.length >= limit) break;
    const commit = devbrainMcp1.distExports.getCommit(repoRoot, hash);
    if (!commit) continue;
    const size = devbrainMcp1.distExports.commitExcerpt(commit).length;
    if (commits.length && size > budget) break;
    commits.push(commit);
    budget -= size;
  }
  const chunks = [];
  let sessionsLeft = 0;
  for (const file of sessions) {
    const sessionId = require$$1.basename(file, ".jsonl");
    const from = devbrainMcp1.distExports.readCursor(sessionId).line;
    const chunk = devbrainMcp1.distExports.nextSessionChunk(require$$0.readFileSync(file, "utf-8"), from);
    if (!chunk.digest) {
      if (!preview && chunk.toLine !== from) devbrainMcp1.distExports.writeCursor(sessionId, chunk.toLine);
      continue;
    }
    if (chunks.length >= BACKFILL_SESSIONS || chunk.digest.length > budget) {
      sessionsLeft++;
      continue;
    }
    chunks.push({ sessionId, digest: chunk.digest, toLine: chunk.toLine, file });
    budget -= chunk.digest.length;
  }
  for (const c of chunks) {
    if (devbrainMcp1.distExports.nextSessionChunk(require$$0.readFileSync(c.file, "utf-8"), c.toLine).digest) sessionsLeft++;
  }
  if (!commits.length && !chunks.length) {
    console.log("DevBrain: nothing left to review \u2014 history is fully reviewed.");
    return;
  }
  console.log(devbrainMcp1.distExports.formatBackfillBatch({
    project: project.name,
    commits,
    sessions: chunks,
    remainingCommits: pending.length - commits.length,
    remainingSessions: sessionsLeft,
    markedReviewed: !preview
  }));
  if (preview) return;
  for (const c of commits) await devbrainMcp1.distExports.markCommitProcessed(c.hash, project.id);
  for (const c of chunks) devbrainMcp1.distExports.writeCursor(c.sessionId, c.toLine);
}
const captureLogPath = require$$1.join(devbrainDir, "capture.log");
function captureLog(message) {
  try {
    require$$0.mkdirSync(devbrainDir, { recursive: true });
    require$$0.appendFileSync(captureLogPath, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`, "utf-8");
  } catch {
  }
}
function agentSettingsPath(repoRoot, global) {
  return global ? require$$1.join(require$$2.homedir(), ".claude", "settings.json") : require$$1.join(repoRoot, ".claude", "settings.local.json");
}
function readAgentSettings(path) {
  if (!require$$0.existsSync(path)) return {};
  const raw = require$$0.readFileSync(path, "utf-8").replace(/^﻿/, "").trim();
  return raw ? JSON.parse(raw) : {};
}
function writeAgentSettings(path, settings) {
  require$$0.mkdirSync(require$$1.dirname(path), { recursive: true });
  require$$0.writeFileSync(path, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}
function readHookInput() {
  if (process.stdin.isTTY) return Promise.resolve({});
  return Promise.race([
    readStdin(),
    // unref: once stdin has ended, a pending safety timer must not keep the
    // process — and so the agent — waiting out its full two seconds.
    new Promise((resolve) => setTimeout(() => resolve(""), 2e3).unref())
  ]).then((text) => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  });
}
async function handleHook(event) {
  try {
    const input = await readHookInput();
    const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
    if (event === "session-start") {
      const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
      if (typeof input.session_id === "string") devbrainMcp1.distExports.markActiveSession(repoRoot, input.session_id);
      const merge = await devbrainMcp1.distExports.mergeDuplicateProjects(repoRoot).catch(() => null);
      if (merge) {
        captureLog(`merged ${merge.merged.length} duplicate record(s) of ${merge.into.name}: ` + merge.merged.map((m) => `${m.project.path} (${m.entries} entries)`).join(", "));
      }
      let project2 = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
      if (!project2) {
        const stack = devbrainMcp1.distExports.detectStack(repoRoot);
        if (!devbrainMcp1.distExports.looksLikeProject({ isGitRepo: devbrainMcp1.distExports.isGitRepo(repoRoot), stack })) return;
        project2 = {
          id: nanoid1.nanoid(),
          name: devbrainMcp1.distExports.getProjectName(repoRoot),
          path: repoRoot,
          stack,
          createdAt: Date.now(),
          lastSeen: Date.now()
        };
        await devbrainMcp1.distExports.upsertProject(project2);
        captureLog(`registered ${project2.name} from the session-start hook`);
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: devbrainMcp1.distExports.formatFirstSession(project2)
          }
        }));
        return;
      }
      await refreshStack(project2);
      const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
      const shown = devbrainMcp1.distExports.briefingEntries(all, project2.id);
      const skipped = all.filter((e) => devbrainMcp1.distExports.isAlreadyInAgentContext(e, project2.id));
      const briefing = devbrainMcp1.distExports.formatSessionBriefing(devbrainMcp1.distExports.buildContext(shown, project2), {
        unreviewedCommits: (await unreviewedCommits(repoRoot)).length,
        ...skipped.length ? { indexedFromFile: { file: skipped[0].source.file, count: skipped.length } } : {}
      });
      if (!briefing) return;
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: briefing }
      }));
      return;
    }
    if (event === "user-prompt") {
      const prompt2 = typeof input.prompt === "string" ? input.prompt : "";
      if (!devbrainMcp1.distExports.isWorthLookingUp(prompt2)) return;
      const sessionId2 = typeof input.session_id === "string" ? input.session_id : "";
      const project2 = await devbrainMcp1.distExports.getProjectByPath(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd);
      if (!project2) return;
      const embedding = await devbrainMcp1.distExports.getEmbedding(prompt2).catch(() => []);
      const hits = devbrainMcp1.distExports.recallForFailure(prompt2, await devbrainMcp1.distExports.getAllEntriesWithProjects(), {
        projectId: project2.id,
        embedding,
        // A request is a description, not an error string, so without an
        // embedding it is matched on its wording as well.
        byWording: true,
        // Never the same entry twice in one session. A briefing that repeats
        // itself every message is one the agent learns to skim past.
        exclude: sessionId2 ? devbrainMcp1.distExports.readCursor(sessionId2).surfaced ?? [] : []
      });
      if (!hits.length) return;
      if (sessionId2) devbrainMcp1.distExports.markSurfaced(sessionId2, hits.map((h) => h.entry.id));
      const ids = hits.map((h) => h.entry.id);
      await devbrainMcp1.distExports.bumpRetrievalCounts(ids, project2.id).catch(() => {
      });
      await devbrainMcp1.distExports.bumpRecallCounts(ids, { query: prompt2, sessionId: sessionId2 }).catch(() => {
      });
      captureLog(`${project2.name} ${sessionId2.slice(0, 8)}: prompt recall, ${hits.length} for "${devbrainMcp1.distExports.clip(prompt2, 60)}"`);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: devbrainMcp1.distExports.formatRecallForAgent(prompt2, hits, { of: "request" }) ?? ""
        }
      }));
      return;
    }
    if (event === "post-tool") {
      const toolName = typeof input.tool_name === "string" ? input.tool_name : "";
      if (devbrainMcp1.distExports.isFileTool(toolName)) return;
      const failedCall = input.hook_event_name === "PostToolUseFailure";
      if (failedCall && input.is_interrupt === true) return;
      const output = toolOutputText(input);
      const command = String(input.tool_input?.command ?? "");
      if (!devbrainMcp1.distExports.looksLikeError(output, failedCall) || devbrainMcp1.distExports.isReadOnlyCommand(command) || devbrainMcp1.distExports.isEchoedOutput(output, command)) return;
      const failure = extractFailure(output);
      if (!failure) return;
      const sessionId2 = typeof input.session_id === "string" ? input.session_id : "";
      const project2 = await devbrainMcp1.distExports.getProjectByPath(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd);
      if (!project2) return;
      const queryEmbedding = await devbrainMcp1.distExports.getEmbedding(failure).catch(() => []);
      const hits = devbrainMcp1.distExports.recallForFailure(failure, await devbrainMcp1.distExports.getAllEntriesWithProjects(), {
        projectId: project2.id,
        embedding: queryEmbedding,
        // Pushing the same past fix after every retry of a flaky command would
        // teach the agent to tune the whole channel out.
        exclude: sessionId2 ? devbrainMcp1.distExports.readCursor(sessionId2).surfaced ?? [] : []
      });
      const message = devbrainMcp1.distExports.formatRecallForAgent(failure, hits);
      if (!message) return;
      if (sessionId2) devbrainMcp1.distExports.markSurfaced(sessionId2, hits.map((h) => h.entry.id));
      const recalled = hits.map((h) => h.entry.id);
      await devbrainMcp1.distExports.bumpRetrievalCounts(recalled, project2.id).catch(() => {
      });
      await devbrainMcp1.distExports.bumpRecallCounts(recalled, { query: failure, sessionId: sessionId2 }).catch(() => {
      });
      captureLog(`${project2.name} ${sessionId2.slice(0, 8)}: recalled ${hits.length} for "${devbrainMcp1.distExports.clip(failure, 60)}"`);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: failedCall ? "PostToolUseFailure" : "PostToolUse",
          additionalContext: message
        }
      }));
      return;
    }
    if (event !== "stop") return;
    if (input.stop_hook_active === true) return;
    const transcript = input.transcript_path;
    const sessionId = input.session_id;
    if (typeof transcript !== "string" || typeof sessionId !== "string" || !require$$0.existsSync(transcript)) return;
    devbrainMcp1.distExports.markActiveSession(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd, sessionId);
    const cursor = devbrainMcp1.distExports.readCursor(sessionId);
    const review = devbrainMcp1.distExports.reviewTurn(require$$0.readFileSync(transcript, "utf-8"), cursor.line, { warned: cursor.warned ?? [] });
    const advance = () => devbrainMcp1.distExports.writeCursor(sessionId, review.cursor);
    if (review.action === "step-back") {
      const project2 = await devbrainMcp1.distExports.getProjectByPath(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd);
      let related = [];
      if (project2) {
        const failing = review.signals.find((s) => s.kind === "repeated-failure");
        if (failing) {
          const hits = devbrainMcp1.distExports.recallForFailure(failing.subject, await devbrainMcp1.distExports.getAllEntriesWithProjects(), {
            projectId: project2.id,
            topK: 2
          });
          related = hits.map((h) => `[${devbrainMcp1.distExports.normalizeType(h.entry.type)}] ${h.entry.title} (id: ${h.entry.id})`);
          if (hits.length) await devbrainMcp1.distExports.bumpRecallCounts(hits.map((h) => h.entry.id), { query: failing.subject, sessionId }).catch(() => {
          });
        }
      }
      devbrainMcp1.distExports.markWarned(sessionId, review.suppress ?? review.signals.map((s) => s.fingerprint));
      captureLog(`${project2?.name ?? "?"} ${sessionId.slice(0, 8)}: step-back \u2014 ` + review.signals.map((s) => s.kind + " x" + s.count).join(", "));
      process.stdout.write(JSON.stringify({
        decision: "block",
        reason: devbrainMcp1.distExports.formatStepBack(review.signals, related)
      }));
      return;
    }
    if (review.action !== "ask") {
      if (review.cursor !== cursor.line) advance();
      return;
    }
    const project = await devbrainMcp1.distExports.getProjectByPath(devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd);
    if (!project) return;
    advance();
    const open = devbrainMcp1.distExports.openBugsInSession(await devbrainMcp1.distExports.getEntriesByProject(project.id), sessionId);
    const prompt = open.length ? devbrainMcp1.distExports.buildRecordPrompt(review.events, open) : review.prompt;
    captureLog(`${project.name} ${sessionId.slice(0, 8)}: asked the agent to record this stretch` + (open.length ? `, offering ${open.length} open bug(s) to close` : ""));
    devbrainMcp1.distExports.markAsked(sessionId);
    process.stdout.write(JSON.stringify({ decision: "block", reason: prompt }));
  } catch (err) {
    captureLog(`hook ${event} failed: ${explainError(err)}`);
  }
}
function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : void 0;
}
function transcriptsFor(repoRoot) {
  const dir = require$$1.join(require$$2.homedir(), ".claude", "projects", repoRoot.replace(/[^A-Za-z0-9]/g, "-"));
  if (!require$$0.existsSync(dir)) return [];
  return require$$0.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => require$$1.join(dir, f)).sort((a, b) => require$$0.statSync(a).mtimeMs - require$$0.statSync(b).mtimeMs);
}
function agentHooksInstalled(repoRoot) {
  for (const global of [false, true]) {
    try {
      if (devbrainMcp1.distExports.installedDevbrainHooks(readAgentSettings(agentSettingsPath(repoRoot, global))).length) return true;
    } catch {
    }
  }
  return false;
}
async function handleHooks(args) {
  const action = args.find((a) => !a.startsWith("--")) ?? "status";
  const global = args.includes("--global");
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(process.cwd()) ?? process.cwd();
  const path = agentSettingsPath(repoRoot, global);
  const scope = global ? "all projects (user settings)" : "this project (.claude/settings.local.json)";
  if (action === "install") {
    writeAgentSettings(path, devbrainMcp1.distExports.withDevbrainHooks(readAgentSettings(path)));
    console.log(`
  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Claude Code hooks installed for ${scope}`);
    console.log(`  ${devbrainCli1.DIM}${path}${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Sessions start briefed with project memory, and when the agent fixes or decides`);
    console.log(`  something without saving it, DevBrain asks it to. Registered projects only.${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Restart Claude Code (or run /hooks) for it to pick them up.${devbrainCli1.RESET}
`);
    return;
  }
  if (action === "uninstall") {
    writeAgentSettings(path, devbrainMcp1.distExports.withoutDevbrainHooks(readAgentSettings(path)));
    console.log(`
  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} DevBrain hooks removed from ${scope}
`);
    return;
  }
  console.log(`
  ${devbrainCli1.BOLD}Agent hooks${devbrainCli1.RESET}`);
  for (const [label, p] of [["project", agentSettingsPath(repoRoot, false)], ["global ", agentSettingsPath(repoRoot, true)]]) {
    let events = [];
    try {
      events = devbrainMcp1.distExports.installedDevbrainHooks(readAgentSettings(p));
    } catch {
      events = ["(unreadable settings file)"];
    }
    console.log(`  ${label}  ${events.length ? `${devbrainCli1.GREEN}${events.join(", ")}${devbrainCli1.RESET}` : `${devbrainCli1.DIM}not installed${devbrainCli1.RESET}`}`);
  }
  if (require$$0.existsSync(captureLogPath)) {
    const recent = require$$0.readFileSync(captureLogPath, "utf-8").trimEnd().split("\n").slice(-12);
    console.log(`
  ${devbrainCli1.BOLD}Recent DevBrain prompts${devbrainCli1.RESET} ${devbrainCli1.DIM}(${captureLogPath})${devbrainCli1.RESET}`);
    for (const l of recent) console.log(`  ${devbrainCli1.DIM}${l}${devbrainCli1.RESET}`);
  } else {
    console.log(`
  ${devbrainCli1.DIM}Nothing logged yet.${devbrainCli1.RESET}`);
  }
  console.log();
}
const DEFAULT_SOURCE_FILES = ["CLAUDE.md", "AGENTS.md", "DEVBRAIN.md"];
async function handleIndex(fileArg, opts = {}) {
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  const candidates = fileArg ? [fileArg] : DEFAULT_SOURCE_FILES;
  const file = candidates.find((f) => require$$0.existsSync(require$$1.join(repoRoot, f)));
  if (!file) {
    console.log(`
  ${devbrainCli1.YELLOW}No source file to index.${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Looked for: ${candidates.join(", ")} in ${repoRoot}${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Name one explicitly: ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain index docs/ENGINEERING.md${devbrainCli1.RESET}
`);
    return;
  }
  let project = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
  if (!project) {
    project = { id: nanoid1.nanoid(), name: devbrainMcp1.distExports.getProjectName(repoRoot), path: repoRoot, stack: devbrainMcp1.distExports.detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now() };
    await devbrainMcp1.distExports.upsertProject(project);
  }
  const text = require$$0.readFileSync(require$$1.join(repoRoot, file), "utf-8");
  const sections = devbrainMcp1.distExports.parseMarkdownSource(text);
  const existing = (await devbrainMcp1.distExports.getAllEntriesWithProjects()).filter((e) => e.projectId === project.id);
  const plan = devbrainMcp1.distExports.planIndex(sections, existing, file, { force: opts.force });
  console.log(`
  ${bold(`Indexing ${file}`)}  ${dim(`${sections.length} sections`)}`);
  console.log(`  ${devbrainCli1.DIM}${plan.added.length} new \xB7 ${plan.updated.length} changed \xB7 ${plan.unchanged} unchanged \xB7 ${plan.removed.length} gone${devbrainCli1.RESET}
`);
  if (!plan.added.length && !plan.updated.length && !plan.removed.length) {
    console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Already up to date.
`);
    return;
  }
  const embedFor = async (s) => {
    try {
      return await devbrainMcp1.distExports.getEmbedding(`${s.title} ${s.body}`);
    } catch {
      return void 0;
    }
  };
  for (const section of plan.added) {
    await devbrainMcp1.distExports.insertEntry(devbrainMcp1.distExports.entryForSection(section, project, file, { id: nanoid1.nanoid(), embedding: await embedFor(section) }));
    console.log(`  ${devbrainCli1.GREEN}+${devbrainCli1.RESET} ${typeCode(section.type)}${section.type}${devbrainCli1.RESET}  ${devbrainMcp1.distExports.clip(section.title, 62)}`);
  }
  for (const { section, entry } of plan.updated) {
    await devbrainMcp1.distExports.deleteEntry(entry.id);
    await devbrainMcp1.distExports.insertEntry(devbrainMcp1.distExports.entryForSection(section, project, file, {
      id: entry.id,
      embedding: await embedFor(section),
      createdAt: entry.createdAt
    }));
    console.log(`  ${devbrainCli1.YELLOW}~${devbrainCli1.RESET} ${typeCode(section.type)}${section.type}${devbrainCli1.RESET}  ${devbrainMcp1.distExports.clip(section.title, 62)}  ${devbrainCli1.DIM}(source changed)${devbrainCli1.RESET}`);
  }
  for (const entry of plan.removed) {
    const id = nanoid1.nanoid();
    await devbrainMcp1.distExports.insertEntry({
      id,
      projectId: project.id,
      type: "lesson",
      title: devbrainMcp1.distExports.clip(`No longer in ${file}: ${entry.title}`, 120),
      content: `This was removed from ${file}, so it is no longer current guidance.`,
      tags: ["claude-md", "removed"],
      createdAt: Date.now(),
      confidence: "observation"
    });
    await devbrainMcp1.distExports.supersedeEntry(entry.id, id);
    console.log(`  ${devbrainCli1.RED}-${devbrainCli1.RESET} ${devbrainMcp1.distExports.clip(entry.title, 62)}  ${devbrainCli1.DIM}(removed from source)${devbrainCli1.RESET}`);
  }
  console.log(`
  ${devbrainCli1.GREEN}${bold("Indexed.")}${devbrainCli1.RESET} ${devbrainCli1.DIM}${file} stays the source \u2014 edit it there and re-run to update.${devbrainCli1.RESET}
`);
}
const ERROR_SIGNALS = [
  /^[A-Za-z_.]*(Error|Exception)\b.*/,
  // TypeError: x is not a function
  /\berror\s+[A-Z]{1,4}\d{2,5}\b.*/,
  // error TS2345, error CS1002
  /\b(E[A-Z]{3,}|ENOENT|ECONNREFUSED|EADDRINUSE)\b.*/,
  /\b(failed|failure|cannot|could not|unable to)\b.*/i,
  /\b(assert|expected .* (to|but)|✕|✗|FAIL)\b.*/i
];
function toolOutputText(input) {
  const parts = [];
  const add = (v) => {
    if (v === void 0 || v === null || v === "") return;
    if (typeof v === "string") {
      parts.push(v);
      return;
    }
    const o = v;
    if (typeof o === "object" && (typeof o.stdout === "string" || typeof o.stderr === "string")) {
      for (const s of [o.stdout, o.stderr]) if (typeof s === "string" && s) parts.push(s);
      return;
    }
    parts.push(JSON.stringify(v));
  };
  add(input.error);
  add(input.tool_response);
  add(input.tool_output);
  return parts.join("\n");
}
function extractFailure(output) {
  const lines = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^\s*at\s+/.test(l));
  if (lines.length === 0) return null;
  const informative = lines.filter((l) => !devbrainMcp1.distExports.isGenericFailureLine(l));
  const usable = informative.length ? informative : lines;
  const tail = usable.slice(-80).reverse();
  for (const re of ERROR_SIGNALS) {
    const hit = tail.find((l) => re.test(l));
    if (hit) return hit.slice(0, 300);
  }
  return usable[usable.length - 1].slice(0, 300);
}
async function handleRun(argv) {
  if (argv.length === 0) {
    console.log(`
  ${devbrainCli1.BOLD}devbrain run${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}<command>${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Runs the command. If it fails, searches your memory for the error.${devbrainCli1.RESET}
`);
    console.log(`  ${devbrainCli1.CYAN}devbrain run npm test${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.CYAN}devbrain run npm run build${devbrainCli1.RESET}
`);
    process.exitCode = 1;
    return;
  }
  const { spawn } = require$$0$1;
  const captured = [];
  const MAX_CAPTURE = 64 * 1024;
  let size = 0;
  const tee = (chunk, to) => {
    to.write(chunk);
    if (size < MAX_CAPTURE) {
      captured.push(chunk.toString());
      size += chunk.length;
    }
  };
  const code = await new Promise((resolve) => {
    const child = spawn(argv.join(" "), {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"]
    });
    child.stdout?.on("data", (c) => tee(c, process.stdout));
    child.stderr?.on("data", (c) => tee(c, process.stderr));
    child.on("error", () => resolve(127));
    child.on("close", (c) => resolve(c ?? 0));
  });
  if (code === 0) {
    process.exitCode = 0;
    return;
  }
  process.exitCode = code;
  try {
    const failure = extractFailure(captured.join(""));
    if (!failure) return;
    const repoRoot = devbrainMcp1.distExports.getRepoRoot(process.cwd()) ?? process.cwd();
    const [allEntries, project] = await Promise.all([
      devbrainMcp1.distExports.getAllEntriesWithProjects(),
      devbrainMcp1.distExports.getProjectByPath(repoRoot)
    ]);
    const hits = devbrainMcp1.distExports.preciseSearch(failure, [], allEntries, { topK: 3 });
    if (hits.length === 0) return;
    const W = Math.min(process.stdout.columns || 80, 80);
    console.log(`
${devbrainCli1.DIM}${"\u2500".repeat(W)}${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.CYAN}${bold("DevBrain")}${devbrainCli1.RESET} \u2014 this looked familiar:`);
    console.log(`  ${devbrainCli1.DIM}matched on: ${failure.slice(0, 68)}${devbrainCli1.RESET}
`);
    hits.forEach((r, i) => {
      const type = devbrainMcp1.distExports.normalizeType(r.entry.type);
      console.log(`  ${devbrainCli1.BOLD}${i + 1}.${devbrainCli1.RESET} ${typeCode(type)}[${type}]${devbrainCli1.RESET} ${r.entry.title}`);
      console.log(`     ${devbrainCli1.DIM}${r.project.name} \xB7 ${devbrainMcp1.distExports.timeAgo(r.entry.createdAt)} \xB7 ${r.matchType === "pattern" ? "exact match" : devbrainMcp1.distExports.similarityLabel(r.similarity)}${devbrainCli1.RESET}`);
      if (r.entry.errorPattern) console.log(`     ${devbrainCli1.DIM}error:${devbrainCli1.RESET} ${r.entry.errorPattern.slice(0, 100)}`);
      for (const line of wrap(r.entry.content.slice(0, 400), 70)) console.log(`     ${line}`);
      console.log();
    });
    const matched = hits.map((r) => r.entry.id);
    await devbrainMcp1.distExports.bumpRetrievalCounts(matched, project?.id).catch(() => {
    });
    await devbrainMcp1.distExports.bumpRecallCounts(matched, { query: failure }).catch(() => {
    });
    console.log(`${devbrainCli1.DIM}${"\u2500".repeat(W)}${devbrainCli1.RESET}
`);
  } catch {
  } finally {
    process.exit(code);
  }
}
async function handleSearch(query) {
  if (!query.trim()) return;
  const s = spin("Searching...");
  try {
    const cwd = process.cwd();
    const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
    const [queryEmbedding, classification, allEntries, currentProject] = await Promise.all([
      // No AI service, or it failed: an empty vector makes preciseSearch rank by keywords.
      devbrainMcp1.distExports.getEmbedding(query).catch(() => []),
      devbrainMcp1.distExports.classifyQuery(query).catch(() => ({ category: "other", errorPattern: void 0 })),
      devbrainMcp1.distExports.getAllEntriesWithProjects(),
      devbrainMcp1.distExports.getProjectByPath(repoRoot)
    ]);
    s.stop();
    const results = devbrainMcp1.distExports.preciseSearch(query, queryEmbedding, allEntries, {
      category: classification.category,
      topK: 8
    });
    if (results.length === 0) {
      console.log(`
  ${devbrainCli1.YELLOW}No matches found${devbrainCli1.RESET} for "${query}"
`);
      return;
    }
    await devbrainMcp1.distExports.bumpRetrievalCounts(results.map((r) => r.entry.id), currentProject?.id).catch(() => {
    });
    const catLabel = classification.category !== "other" ? `  ${devbrainCli1.DIM}[${classification.category}]${devbrainCli1.RESET}` : "";
    console.log(`
  ${bold("Results for:")} "${query}"${catLabel}
`);
    results.forEach((r, i) => {
      const typeColor = typeCode(r.entry.type);
      const matchColor = r.matchType === "pattern" ? devbrainCli1.GREEN : r.similarity >= 0.82 ? devbrainCli1.GREEN : r.similarity >= 0.72 ? devbrainCli1.YELLOW : devbrainCli1.DIM;
      const matchLabel = r.matchType === "pattern" ? `${devbrainCli1.GREEN}pattern match${devbrainCli1.RESET}` : devbrainMcp1.distExports.similarityLabel(r.similarity);
      const confBadge = r.entry.confidence === "confirmed" ? ` ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET}` : r.entry.confidence === "corroborated" ? ` ${devbrainCli1.YELLOW}~${devbrainCli1.RESET}` : "";
      const catBadge = r.categoryMatch ? ` ${devbrainCli1.CYAN}[${r.entry.category}]${devbrainCli1.RESET}` : "";
      const xpBadge = (r.entry.seenInProjects?.length ?? 0) >= 2 ? ` ${devbrainCli1.YELLOW}\xD7${r.entry.seenInProjects.length} projects${devbrainCli1.RESET}` : "";
      console.log(`  ${devbrainCli1.BOLD}${i + 1}.${devbrainCli1.RESET} ${r.entry.title}${confBadge}${xpBadge}`);
      console.log(`     ${typeColor}[${r.entry.type}]${devbrainCli1.RESET}  ${matchColor}${matchLabel}${devbrainCli1.RESET}${catBadge}  ${dim(r.project.name)}  ${dim(devbrainMcp1.distExports.timeAgo(r.entry.createdAt))}`);
      if (r.entry.errorPattern) console.log(`     ${devbrainCli1.DIM}pattern: ${r.entry.errorPattern.slice(0, 80)}${devbrainCli1.RESET}`);
      if (r.entry.causeArchetype) console.log(`     ${devbrainCli1.DIM}archetype: ${r.entry.causeArchetype.slice(0, 100)}${devbrainCli1.RESET}`);
      console.log(`     ${devbrainCli1.DIM}\u2192${devbrainCli1.RESET} ${r.entry.content}`);
      if (r.entry.tags.length) console.log(`     ${dim("tags: " + r.entry.tags.join(", "))}`);
      console.log();
    });
  } catch (err) {
    s.fail("Search failed");
    reportError(err);
  }
}
const PREFIXES = Object.fromEntries(
  devbrainMcp1.distExports.ENTRY_TYPES.flatMap((spec) => [
    [`${spec.type}:`, spec.type],
    ...(spec.aliases ?? []).map((alias) => [`${alias}:`, spec.type])
  ])
);
function parseQuickSave(text) {
  const lower = text.trimStart().toLowerCase();
  for (const [prefix, type] of Object.entries(PREFIXES)) {
    if (lower.startsWith(prefix)) {
      return { type, content: text.trimStart().slice(prefix.length).trim() };
    }
  }
  return { type: "note", content: text.trim() };
}
async function handleNote(text, inq, extra = {}) {
  if (!text.trim()) return;
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  const { project, unfiled } = await devbrainMcp1.distExports.projectForSave(repoRoot);
  if (unfiled) console.log(`  ${devbrainCli1.DIM}Not inside a project, so this goes to Unfiled. Run it from the repo it is about to file it there.${devbrainCli1.RESET}`);
  const { type, content } = parseQuickSave(text);
  const s = spin("Saving...");
  try {
    let embedding;
    try {
      embedding = await devbrainMcp1.distExports.getEmbedding(content);
    } catch {
    }
    if (inq && embedding) {
      const allEntries = await devbrainMcp1.distExports.getAllEntriesWithProjects();
      const sameType = allEntries.filter((e) => e.type === type && !e.supersededBy);
      const nearDupes = devbrainMcp1.distExports.findSimilar(embedding, sameType, 3, 0.86);
      if (nearDupes.length > 0) {
        const top = nearDupes[0];
        s.stop();
        const confLabel = top.entry.confidence === "confirmed" ? ` ${devbrainCli1.GREEN}[confirmed]${devbrainCli1.RESET}` : top.entry.confidence === "corroborated" ? ` ${devbrainCli1.YELLOW}[corroborated]${devbrainCli1.RESET}` : "";
        console.log(`
  ${devbrainCli1.YELLOW}Similar ${type} found${devbrainCli1.RESET}${confLabel}`);
        console.log(`  ${devbrainCli1.DIM}\u2192${devbrainCli1.RESET} ${top.entry.title.slice(0, 80)}`);
        console.log();
        const { action } = await inq.prompt([{
          type: "list",
          name: "action",
          message: "Reinforce existing entry or save as new?",
          prefix: " ",
          choices: [
            { name: `${devbrainCli1.GREEN}Reinforce${devbrainCli1.RESET}  ${devbrainCli1.DIM}boost confidence on existing entry${devbrainCli1.RESET}`, value: "reinforce" },
            { name: `${devbrainCli1.CYAN}Save new${devbrainCli1.RESET}    ${devbrainCli1.DIM}keep both as separate observations${devbrainCli1.RESET}`, value: "new" }
          ]
        }]);
        if (action === "reinforce") {
          await devbrainMcp1.distExports.reinforceEntry(top.entry.id);
          const conf = top.entry.confidence === "confirmed" ? "confirmed" : top.entry.confidence === "corroborated" ? "confirmed" : "corroborated";
          console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Reinforced  ${devbrainCli1.DIM}[${type}] \u2192 ${conf}${devbrainCli1.RESET}
`);
          return;
        }
        const newS = spin("Saving...");
        await devbrainMcp1.distExports.insertEntry({ id: nanoid1.nanoid(), projectId: project.id, type, title: devbrainMcp1.distExports.clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: "observation" });
        newS.succeed(`Saved  ${devbrainCli1.DIM}[${type}]${devbrainCli1.RESET}`);
        console.log();
        return;
      }
      if (type === "decision") {
        const existingDecisions = allEntries.filter((e) => e.type === "decision" && !e.supersededBy);
        const related = devbrainMcp1.distExports.findSimilar(embedding, existingDecisions, 3, 0.72);
        if (related.length > 0) {
          const top = related[0];
          s.stop();
          console.log(`
  ${devbrainCli1.MAGENTA}Related decision found${devbrainCli1.RESET}`);
          console.log(`  ${devbrainCli1.DIM}\u2192${devbrainCli1.RESET} ${top.entry.title.slice(0, 80)}`);
          console.log();
          const { action } = await inq.prompt([{
            type: "list",
            name: "action",
            message: "Does this new decision supersede the old one?",
            prefix: " ",
            choices: [
              { name: `${devbrainCli1.MAGENTA}Supersede${devbrainCli1.RESET}  ${devbrainCli1.DIM}mark old as superseded, save new as current${devbrainCli1.RESET}`, value: "supersede" },
              { name: `${devbrainCli1.CYAN}Independent${devbrainCli1.RESET}  ${devbrainCli1.DIM}save as a separate decision${devbrainCli1.RESET}`, value: "new" }
            ]
          }]);
          if (action === "supersede") {
            const newId = nanoid1.nanoid();
            await devbrainMcp1.distExports.insertEntry({ id: newId, projectId: project.id, type, title: devbrainMcp1.distExports.clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: "observation" });
            await devbrainMcp1.distExports.supersedeEntry(top.entry.id, newId);
            console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Saved new decision  ${devbrainCli1.DIM}old marked superseded${devbrainCli1.RESET}
`);
            return;
          }
          const newS = spin("Saving...");
          await devbrainMcp1.distExports.insertEntry({ id: nanoid1.nanoid(), projectId: project.id, type, title: devbrainMcp1.distExports.clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: "observation" });
          newS.succeed(`Saved  ${devbrainCli1.DIM}[${type}]${devbrainCli1.RESET}`);
          console.log();
          return;
        }
      }
      s.stop();
    }
    const dash = content.search(/\s[—–]\s|\s--\s/);
    const title = devbrainMcp1.distExports.clip(dash > 10 ? content.slice(0, dash) : content, 120);
    const detail = dash > 10 ? content.slice(dash).replace(/^\s*(?:[—–]|--)\s*/, "").trim() : content;
    const dupe = !inq ? await (embedding ? devbrainMcp1.distExports.findDuplicate(embedding, project.id) : devbrainMcp1.distExports.findTextDuplicate(title, project.id)).catch(() => null) : null;
    const known = !!dupe && dupe.entry.id !== extra.fixes?.trim();
    if (known) {
      s.stop();
      console.log(`  ${devbrainCli1.DIM}Already known \u2014 near-duplicate of an existing entry, not saved.${devbrainCli1.RESET}
`);
      return;
    }
    const tags = (extra.tags ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 4);
    const category = devbrainMcp1.distExports.ENTRY_CATEGORIES.includes(extra.category) ? extra.category : void 0;
    const session = devbrainMcp1.distExports.activeSession(project.path);
    const origin = inq ? "manual" : session && devbrainMcp1.distExports.takeAsk(session) ? "hook" : "agent";
    const wants = extra.fixes?.trim();
    const closes = wants ? (await devbrainMcp1.distExports.getEntriesByProject(project.id)).find((e) => e.id === wants) : void 0;
    await devbrainMcp1.distExports.insertEntry({
      id: nanoid1.nanoid(),
      projectId: project.id,
      type,
      title,
      content: detail,
      tags,
      embedding,
      createdAt: Date.now(),
      confidence: "observation",
      ...extra.error?.trim() ? { errorPattern: extra.error.trim() } : {},
      ...category ? { category } : {},
      ...session ? { sessionId: session } : {},
      origin,
      ...closes ? { fixes: closes.id } : {}
    });
    if (inq) {
      console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Saved  ${devbrainCli1.DIM}[${type}]${devbrainCli1.RESET}
`);
    } else {
      s.succeed(`Saved  ${devbrainCli1.DIM}[${type}]${devbrainCli1.RESET}`);
      console.log();
    }
    if (closes) console.log(`  ${devbrainCli1.DIM}Closes: ${devbrainMcp1.distExports.clip(closes.title, 70)}${devbrainCli1.RESET}
`);
    else if (wants) console.log(`  ${devbrainCli1.DIM}No entry with id ${wants}, so nothing was linked.${devbrainCli1.RESET}
`);
  } catch (err) {
    s.fail("Failed to save");
    reportError(err);
  }
}
function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
    });
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", () => resolve(buf));
  });
}
function wrap(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
async function handleProject(nameArg, opts = {}) {
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  const projects = await devbrainMcp1.distExports.getAllProjects();
  if (projects.length === 0) {
    console.log(`
  ${devbrainCli1.YELLOW}No projects registered yet.${devbrainCli1.RESET} Run ${devbrainCli1.CYAN}devbrain init${devbrainCli1.RESET} in a repo.
`);
    return;
  }
  let project = null;
  if (nameArg?.trim()) {
    const q = nameArg.trim().toLowerCase();
    const matches = projects.filter((p) => p.name.toLowerCase().includes(q));
    if (matches.length === 0) {
      console.log(`
  ${devbrainCli1.YELLOW}No project matching${devbrainCli1.RESET} "${nameArg.trim()}"
`);
      console.log(`  ${devbrainCli1.DIM}Known projects:${devbrainCli1.RESET} ${projects.map((p) => p.name).join(", ")}
`);
      return;
    }
    if (matches.length > 1) {
      console.log(`
  ${devbrainCli1.YELLOW}Several projects match${devbrainCli1.RESET} "${nameArg.trim()}"
`);
      matches.forEach((p) => console.log(`  ${devbrainCli1.CYAN}${p.name}${devbrainCli1.RESET}  ${devbrainCli1.DIM}${p.path}${devbrainCli1.RESET}`));
      console.log();
      return;
    }
    project = matches[0];
  } else {
    project = projects.find((p) => devbrainMcp1.distExports.sameProjectPath(p.path, repoRoot)) ?? null;
    if (!project) {
      console.log(`
  ${devbrainCli1.YELLOW}This directory isn't a registered project.${devbrainCli1.RESET}
`);
      console.log(`  ${devbrainCli1.DIM}Run ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain init${devbrainCli1.RESET}${devbrainCli1.DIM} here, or name one:${devbrainCli1.RESET}`);
      projects.forEach((p) => console.log(`  ${devbrainCli1.CYAN}devbrain project ${p.name}${devbrainCli1.RESET}  ${devbrainCli1.DIM}${p.path}${devbrainCli1.RESET}`));
      console.log();
      return;
    }
  }
  const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
  const dossier = devbrainMcp1.distExports.buildDossier(project, all);
  if (opts.write) {
    const outDir = require$$1.join(devbrainDir, "projects", project.name.replace(/[^\w.-]+/g, "-"));
    require$$0.mkdirSync(outDir, { recursive: true });
    const files = devbrainMcp1.distExports.dossierFiles(dossier);
    for (const f of files) require$$0.writeFileSync(require$$1.join(outDir, f.path), f.contents, "utf-8");
    console.log(`
  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Wrote ${files.length} file${files.length === 1 ? "" : "s"} for ${bold(project.name)}`);
    files.forEach((f) => console.log(`  ${devbrainCli1.DIM}${require$$1.join(outDir, f.path)}${devbrainCli1.RESET}`));
    console.log();
    openPath(outDir);
    return;
  }
  console.log();
  console.log(`  ${devbrainCli1.BOLD}${devbrainCli1.CYAN}${project.name}${devbrainCli1.RESET}`);
  console.log(`  ${devbrainCli1.DIM}Stack   ${devbrainCli1.RESET}${project.stack.join(" \xB7 ") || "not detected"}`);
  console.log(`  ${devbrainCli1.DIM}Path    ${devbrainCli1.RESET}${project.path}`);
  console.log(`  ${devbrainCli1.DIM}Memory  ${devbrainCli1.RESET}${dossier.total} ${dossier.total === 1 ? "entry" : "entries"}` + (dossier.lastEntryAt ? `  ${devbrainCli1.DIM}\xB7 last ${devbrainMcp1.distExports.timeAgo(dossier.lastEntryAt)}${devbrainCli1.RESET}` : "") + (dossier.supersededCount ? `  ${devbrainCli1.DIM}\xB7 ${dossier.supersededCount} superseded${devbrainCli1.RESET}` : ""));
  if (dossier.total === 0) {
    console.log(`
  ${devbrainCli1.DIM}Nothing recorded yet. Ask your coding agent to ${devbrainCli1.RESET}${devbrainCli1.CYAN}run devbrain backfill${devbrainCli1.RESET}${devbrainCli1.DIM} and save what matters.${devbrainCli1.RESET}
`);
    return;
  }
  console.log();
  for (const section of dossier.sections) {
    console.log(`  ${devbrainCli1.BOLD}${section.heading}${devbrainCli1.RESET}  ${devbrainCli1.DIM}(${section.entries.length})${devbrainCli1.RESET}`);
    for (const entry of section.entries.slice(0, 8)) {
      const type = devbrainMcp1.distExports.normalizeType(entry.type);
      const title = entry.title.length > 66 ? `${entry.title.slice(0, 66)}\u2026` : entry.title;
      const flags = entry.supersededBy ? ` ${devbrainCli1.YELLOW}[superseded]${devbrainCli1.RESET}` : "";
      console.log(`    ${typeDot(type)} ${title}${flags}  ${devbrainCli1.DIM}${devbrainMcp1.distExports.timeAgo(entry.createdAt)}${devbrainCli1.RESET}`);
    }
    if (section.entries.length > 8) {
      console.log(`    ${devbrainCli1.DIM}\u2026 ${section.entries.length - 8} more${devbrainCli1.RESET}`);
    }
    console.log();
  }
  console.log(`  ${devbrainCli1.DIM}Full write-up: ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain project${nameArg ? ` ${nameArg}` : ""} --write${devbrainCli1.RESET}${devbrainCli1.DIM} (one .md per section)${devbrainCli1.RESET}
`);
}
async function handleContext(query) {
  const cwd = process.cwd();
  const repoRoot = devbrainMcp1.distExports.getRepoRoot(cwd) ?? cwd;
  const project = await devbrainMcp1.distExports.getProjectByPath(repoRoot);
  const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
  const s = query ? spin("Building context...") : void 0;
  let queryEmbedding;
  if (query?.trim()) {
    queryEmbedding = await devbrainMcp1.distExports.getEmbedding(query).catch(() => void 0);
  }
  s?.stop();
  const ctx = devbrainMcp1.distExports.buildContext(all, project ?? null, queryEmbedding, query);
  const text = devbrainMcp1.distExports.formatContext(ctx, query);
  const retrievedIds = [
    ...ctx.issues,
    ...ctx.decisions,
    ...ctx.patterns,
    ...ctx.antiPatterns,
    ...ctx.stacks,
    ...ctx.crossProjectPatterns ?? []
  ].map((r) => r.entry.id);
  devbrainMcp1.distExports.bumpRetrievalCounts(retrievedIds, project?.id).catch(() => {
  });
  console.log();
  for (const line of text.split("\n")) {
    if (line.startsWith("# ")) console.log(`${devbrainCli1.BOLD}${devbrainCli1.CYAN}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("## ")) console.log(`
${devbrainCli1.BOLD}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("## Cross-Project")) console.log(`
${devbrainCli1.BOLD}${devbrainCli1.YELLOW}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("## Anti-Patterns")) console.log(`
${devbrainCli1.BOLD}${"\x1B[91m"}${line}${devbrainCli1.RESET}`);
    else if (/^\d+\. \[bug\]/.test(line)) console.log(`  ${devbrainCli1.RED}${line}${devbrainCli1.RESET}`);
    else if (/^\d+\. \[fix\]/.test(line)) console.log(`  ${devbrainCli1.GREEN}${line}${devbrainCli1.RESET}`);
    else if (/^\d+\. \[/.test(line)) console.log(`  ${devbrainCli1.CYAN}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("- ")) console.log(`  ${devbrainCli1.DIM}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("   \u2192 ")) console.log(`  ${line}`);
    else if (line.startsWith("   tags:")) console.log(`  ${devbrainCli1.DIM}${line}${devbrainCli1.RESET}`);
    else if (line.startsWith("   ")) console.log(`  ${devbrainCli1.DIM}${line}${devbrainCli1.RESET}`);
    else console.log(line);
  }
  console.log();
  if (project) {
    const siblingRecent = all.filter((e) => e.projectId !== project.id && !e.supersededBy).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    if (siblingRecent.length > 0) {
      console.log(`${devbrainCli1.BOLD}${devbrainCli1.YELLOW}\u{1F4E2} Team Updates (from Sibling Projects)${devbrainCli1.RESET}`);
      siblingRecent.forEach((e) => {
        const typeColor = typeCode(e.type);
        console.log(`  \u2022 ${typeColor}[${e.type}]${devbrainCli1.RESET} ${e.title} ${devbrainCli1.DIM}(${e.project.name} \xB7 ${devbrainMcp1.distExports.timeAgo(e.createdAt)})${devbrainCli1.RESET}`);
        console.log(`    ${devbrainCli1.DIM}\u2192 ${e.content.slice(0, 100)}${e.content.length > 100 ? "..." : ""}${devbrainCli1.RESET}`);
      });
      console.log();
    }
  }
}
function showEntryDetail(entry) {
  const typeColor = typeCode(entry.type);
  const sep = `${devbrainCli1.DIM}${"\u2500".repeat(62)}${devbrainCli1.RESET}`;
  const confBadge = entry.confidence === "confirmed" ? `  ${devbrainCli1.GREEN}\u2713 confirmed${devbrainCli1.RESET}` : entry.confidence === "corroborated" ? `  ${devbrainCli1.YELLOW}~ corroborated${devbrainCli1.RESET}` : "";
  console.log(`
  ${sep}`);
  console.log(`  ${typeColor}${devbrainCli1.BOLD} ${entry.type.toUpperCase()} ${devbrainCli1.RESET}  ${devbrainCli1.BOLD}${entry.project.name}${devbrainCli1.RESET}  ${dim(entry.project.stack.join(", "))}  ${dim(devbrainMcp1.distExports.timeAgo(entry.createdAt))}${confBadge}`);
  if (entry.tags.length) console.log(`  ${dim("tags: " + entry.tags.join(", "))}`);
  if (entry.supersededBy) console.log(`  ${devbrainCli1.YELLOW}[SUPERSEDED]${devbrainCli1.RESET}`);
  console.log(`  ${sep}`);
  if (entry.type === "image") {
    console.log(`
  ${devbrainCli1.BOLD}Image Path${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.CYAN}${entry.title}${devbrainCli1.RESET}
`);
    if (entry.content && entry.content !== entry.title) {
      console.log(`  ${devbrainCli1.BOLD}Description${devbrainCli1.RESET}`);
      console.log(`  ${entry.content}
`);
    }
  } else {
    console.log(`
  ${devbrainCli1.BOLD}Problem${devbrainCli1.RESET}`);
    console.log(`  ${entry.title}
`);
    console.log(`  ${devbrainCli1.BOLD}Solution${devbrainCli1.RESET}`);
    const words = entry.content.split(" ");
    let line_ = "  ";
    for (const word of words) {
      if (line_.length + word.length > 62) {
        console.log(line_);
        line_ = "  " + word + " ";
      } else line_ += word + " ";
    }
    if (line_.trim()) console.log(line_);
  }
  console.log(`
  ${sep}
`);
}
async function handleBrowse(inquirer) {
  const inq = inquirer;
  const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
  if (all.length === 0) {
    console.log(`
  ${devbrainCli1.YELLOW}No entries yet.${devbrainCli1.RESET} Make commits or add notes to start building your knowledge base.
`);
    return;
  }
  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
  let browsing = true;
  while (browsing) {
    const choices = [
      ...sorted.map((e, i) => {
        const typeColor = typeCode(e.type);
        const title = e.title.length > 50 ? e.title.slice(0, 50) + "\u2026" : e.title.padEnd(51);
        const badge = e.confidence === "confirmed" ? `${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} ` : e.confidence === "corroborated" ? `${devbrainCli1.YELLOW}~${devbrainCli1.RESET} ` : "  ";
        const imgIcon = e.type === "image" ? "\u{1F4F7} " : "";
        return {
          name: `${typeColor}${e.type.padEnd(8)}${devbrainCli1.RESET} ${badge}${imgIcon}${title}  ${dim(e.project.name + " \xB7 " + devbrainMcp1.distExports.timeAgo(e.createdAt))}`,
          value: i
        };
      }),
      { name: `${devbrainCli1.DIM}\u2190 Back${devbrainCli1.RESET}`, value: -1 }
    ];
    let idx;
    try {
      const res = await inq.prompt([{
        type: "list",
        name: "idx",
        message: `Browse  ${dim(sorted.length + " entries")}`,
        choices,
        pageSize: 14
      }]);
      idx = res.idx;
    } catch {
      break;
    }
    if (idx === -1) {
      browsing = false;
      break;
    }
    devbrainCli1.clr();
    const selected = sorted[idx];
    showEntryDetail(selected);
    const actionChoices = [
      { name: "\u2190 Back to list", value: "list" },
      ...selected.type === "image" ? [{ name: `${devbrainCli1.CYAN}\u{1F4F7} Open image${devbrainCli1.RESET}`, value: "open-image" }] : [],
      { name: `${devbrainCli1.DIM}Main menu${devbrainCli1.RESET}`, value: "menu" }
    ];
    let next;
    try {
      const res = await inq.prompt([{
        type: "list",
        name: "next",
        message: "What next?",
        choices: actionChoices
      }]);
      next = res.next;
    } catch {
      break;
    }
    if (next === "menu") {
      browsing = false;
    } else if (next === "open-image") {
      openPath(selected.content || selected.title);
      devbrainCli1.clr();
    } else {
      devbrainCli1.clr();
    }
  }
}
async function handleDelete(inquirer) {
  const inq = inquirer;
  const all = await devbrainMcp1.distExports.getAllEntriesWithProjects();
  const active = all.filter((e) => !e.supersededBy).sort((a, b) => b.createdAt - a.createdAt);
  if (active.length === 0) {
    console.log(`
  ${devbrainCli1.YELLOW}No entries to delete.${devbrainCli1.RESET}
`);
    return;
  }
  let idx;
  try {
    const choices = [
      ...active.map((e, i) => ({
        name: `${typeCode(e.type)}[${e.type}]${devbrainCli1.RESET} ${e.title.slice(0, 55).padEnd(56)} ${dim(e.project.name + " \xB7 " + devbrainMcp1.distExports.timeAgo(e.createdAt))}`,
        value: i
      })),
      { name: `${devbrainCli1.DIM}\u2190 Cancel${devbrainCli1.RESET}`, value: -1 }
    ];
    const res = await inq.prompt([{ type: "list", name: "idx", message: "Select entry to delete:", choices, pageSize: 14 }]);
    idx = res.idx;
  } catch {
    return;
  }
  if (idx === -1) return;
  const selected = active[idx];
  console.log(`
  ${devbrainCli1.RED}${devbrainCli1.BOLD}${selected.title.slice(0, 80)}${devbrainCli1.RESET}`);
  console.log(`  ${devbrainCli1.DIM}[${selected.type}] \xB7 ${selected.project.name} \xB7 ${devbrainMcp1.distExports.timeAgo(selected.createdAt)}${devbrainCli1.RESET}
`);
  try {
    const { confirm } = await inq.prompt([{
      type: "confirm",
      name: "confirm",
      message: "Delete this entry?",
      default: false,
      prefix: " "
    }]);
    if (!confirm) {
      console.log(`  ${devbrainCli1.DIM}Cancelled.${devbrainCli1.RESET}
`);
      return;
    }
  } catch {
    return;
  }
  await devbrainMcp1.distExports.deleteEntry(selected.id);
  console.log(`  ${devbrainCli1.GREEN}\u2713${devbrainCli1.RESET} Deleted
`);
}
async function runOnboarding() {
  const run = omitted1.requireTheSetupWizard().runOnboarding;
  await run({ markOnboarded, handleInit });
}
function pluginSettingsNotice() {
  console.log(`
  ${devbrainCli1.BOLD}DevBrain's settings live in Claude Code.${devbrainCli1.RESET} Open ${devbrainCli1.CYAN}/plugin${devbrainCli1.RESET}, pick devbrain, and configure it there.`);
  console.log(`  ${devbrainCli1.DIM}Nothing is required \u2014 memory defaults to ${devbrainCli1.RESET}${devbrainMcp1.distExports.getLocalDbPath()}${devbrainCli1.DIM}.${devbrainCli1.RESET}`);
  console.log(`  ${devbrainCli1.DIM}A MongoDB connection string there shares one memory across machines or a team.${devbrainCli1.RESET}
`);
}
const COMMANDS = [
  { value: "/search", desc: "Search memory \u2014 exact error text works best" },
  { value: "/context", desc: "Ranked project history, as an agent sees it" },
  { value: "/project", desc: "Everything saved about this project" },
  { value: "/browse", desc: "Scroll through all saved entries" },
  { value: "/save", desc: "Save entry  (fix: decision: lesson: bug: stack: ...)" },
  { value: "/delete", desc: "Delete an entry" },
  { value: "/backfill", desc: "Unreviewed commits and sessions, for your agent" },
  { value: "/init", desc: "Register this project + Claude Code hooks" },
  { value: "/clear", desc: "Clear the screen" },
  { value: "/exit", desc: "Quit DevBrain" }
];
async function runCommand(cmd, arg, inquirer) {
  const inq = inquirer;
  switch (cmd) {
    case "/search": {
      let q = arg;
      if (!q) {
        try {
          const { query } = await inq.prompt([{ type: "input", name: "query", message: "\u{1F50D} Search:" }]);
          q = query;
        } catch {
          return true;
        }
      }
      await handleSearch(q);
      break;
    }
    case "/context": {
      await handleContext(arg || void 0);
      break;
    }
    case "/save": {
      let text = arg;
      if (!text) {
        process.stdout.write(`  ${devbrainCli1.DIM}Prefixes: bug: fix: stack: decision: pattern: lesson:${devbrainCli1.RESET}
`);
        try {
          const { note } = await inq.prompt([{ type: "input", name: "note", message: "\u{1F4DD} Save:" }]);
          text = note;
        } catch {
          return true;
        }
      }
      await handleNote(text, inq);
      break;
    }
    case "/delete":
      await handleDelete(inq);
      break;
    case "/backfill":
      await handleBackfill(arg ? arg.split(/\s+/) : []);
      break;
    case "/init":
      await handleInit();
      break;
    case "/project":
      await handleProject(arg || void 0);
      break;
    case "/browse":
      await handleBrowse(inq);
      break;
    case "/clear":
      devbrainCli1.clr();
      await printProjectContext();
      break;
    case "/exit":
    case "/quit":
      console.log(`  ${devbrainCli1.DIM}See you later.${devbrainCli1.RESET}
`);
      process.exit(0);
      break;
    default:
      console.log(`  ${devbrainCli1.YELLOW}Unknown command.${devbrainCli1.RESET} Type / and press Enter to see all commands.
`);
  }
  return true;
}
async function handleInteractive() {
  const _inq = omitted1.requireTheInteractiveTerminalUI();
  const inquirer = typeof _inq.prompt === "function" ? _inq : _inq.default;
  const _ac = omitted1.requireTheInteractiveTerminalUI();
  inquirer.registerPrompt("autocomplete", typeof _ac === "function" ? _ac : _ac.default);
  await printProjectContext();
  const W = Math.min(process.stdout.columns || 80, 80);
  const sep = `${devbrainCli1.DIM}${"\u2500".repeat(W)}${devbrainCli1.RESET}`;
  let entryPool = await devbrainMcp1.distExports.getAllEntriesWithProjects();
  const botSep = new inquirer.Separator(sep);
  while (true) {
    let submitted;
    try {
      console.log(sep);
      const { value } = await inquirer.prompt([{
        type: "autocomplete",
        name: "value",
        message: `${devbrainCli1.CYAN}devbrain${devbrainCli1.RESET}`,
        prefix: "",
        suggestOnly: false,
        pageSize: 10,
        source: async (_, typed = "") => {
          const t = typed.trimStart();
          if (t === "") {
            return [
              botSep,
              { name: `${devbrainCli1.DIM}type to search  \xB7  / for commands${devbrainCli1.RESET}`, value: "__hint__", short: "" }
            ];
          }
          if (t.startsWith("/")) {
            const spaceAt = t.indexOf(" ");
            if (spaceAt > 0) {
              const name = t.slice(0, spaceAt);
              const rest = t.slice(spaceAt + 1).trim();
              const known = COMMANDS.find((c) => c.value === name);
              if (known && rest) {
                return [
                  botSep,
                  {
                    name: `${devbrainCli1.CYAN}${name}${devbrainCli1.RESET} ${rest.slice(0, 50)}  ${devbrainCli1.DIM}${known.desc}${devbrainCli1.RESET}`,
                    value: `__cmd__${name} ${rest}`,
                    short: t
                  }
                ];
              }
            }
            const list = t === "/" ? COMMANDS : COMMANDS.filter((c) => c.value.startsWith(t));
            return [
              botSep,
              ...(list.length ? list : COMMANDS).map((c) => ({
                name: `${devbrainCli1.CYAN}${c.value.padEnd(12)}${devbrainCli1.RESET}  ${devbrainCli1.DIM}${c.desc}${devbrainCli1.RESET}`,
                value: `__cmd__${c.value}`,
                short: c.value
              }))
            ];
          }
          const rows = [];
          const hasP = Object.keys(PREFIXES).some((p) => t.toLowerCase().startsWith(p));
          if (hasP) {
            const { type, content } = parseQuickSave(t);
            rows.push({ name: `${typeDot(type)} Save [${type}]  ${devbrainCli1.DIM}${content.slice(0, 55)}${devbrainCli1.RESET}`, value: `__save__${t}`, short: t });
          } else {
            rows.push({ name: `${devbrainCli1.CYAN}\u{1F50D}${devbrainCli1.RESET}  Search  ${devbrainCli1.DIM}"${t.slice(0, 55)}"${devbrainCli1.RESET}`, value: `__search__${t}`, short: t });
          }
          const lc = t.toLowerCase();
          const matches = entryPool.filter((e) => e.title.toLowerCase().includes(lc)).slice(0, 6);
          for (const e of matches) {
            rows.push({
              name: `${typeDot(e.type)} ${e.title.slice(0, 52).padEnd(53)}  ${devbrainCli1.DIM}${e.project.name} \xB7 ${devbrainMcp1.distExports.timeAgo(e.createdAt)}${devbrainCli1.RESET}`,
              value: `__search__${e.title}`,
              short: e.title
            });
          }
          return [botSep, ...rows];
        }
      }]);
      console.log();
      submitted = value ?? "";
    } catch {
      break;
    }
    if (!submitted || submitted === "__hint__" || submitted === "__sep__") continue;
    if (submitted.startsWith("/") && !submitted.startsWith("__")) {
      submitted = `__cmd__${submitted}`;
    }
    if (submitted.startsWith("__cmd__")) {
      const cmd = submitted.slice(7);
      const sp = cmd.indexOf(" ");
      try {
        await runCommand(sp === -1 ? cmd : cmd.slice(0, sp), sp === -1 ? "" : cmd.slice(sp + 1), inquirer);
      } catch {
      }
    } else if (submitted.startsWith("__save__")) {
      try {
        await handleNote(submitted.slice(8), inquirer);
        entryPool = await devbrainMcp1.distExports.getAllEntriesWithProjects();
        console.log(`  ${devbrainCli1.DIM}Memory: ${entryPool.length} entries${devbrainCli1.RESET}
`);
      } catch {
      }
    } else if (submitted.startsWith("__search__")) {
      try {
        await handleSearch(submitted.slice(10));
      } catch {
      }
    }
  }
}
async function startRepl() {
  if (!isOnboarded()) {
    await runOnboarding();
    if (!isOnboarded()) process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.log(`
  ${devbrainCli1.YELLOW}The DevBrain REPL needs an interactive terminal.${devbrainCli1.RESET}`);
    console.log(`  ${devbrainCli1.DIM}Non-interactively, use ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain context${devbrainCli1.RESET}${devbrainCli1.DIM}, ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain search${devbrainCli1.RESET}${devbrainCli1.DIM} or ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain note${devbrainCli1.RESET}${devbrainCli1.DIM}.${devbrainCli1.RESET}
`);
    process.exit(1);
  }
  await handleInteractive();
}
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "";
  try {
    switch (command) {
      case "setup":
        if (PLUGIN_BUILD) pluginSettingsNotice();
        break;
      case "init":
        await handleInit();
        break;
      case "note": {
        const rest = args.slice(1);
        const flags = /* @__PURE__ */ new Set(["--error", "--category", "--tags", "--fixes"]);
        const words = rest.filter((a, i) => !flags.has(a) && !flags.has(rest[i - 1] ?? ""));
        await handleNote(words.join(" "), void 0, {
          error: flag(rest, "--error"),
          category: flag(rest, "--category"),
          tags: flag(rest, "--tags"),
          fixes: flag(rest, "--fixes")
        });
        break;
      }
      case "search":
        await handleSearch(args.slice(1).join(" "));
        break;
      case "context":
        await handleContext(args.slice(1).join(" ") || void 0);
        break;
      case "project":
      case "projects": {
        const rest = args.slice(1).filter((a) => a !== "--write");
        const write = args.includes("--write");
        await handleProject(rest.join(" ") || void 0, { write });
        break;
      }
      case "run":
        await handleRun(args.slice(1));
        break;
      case "index": {
        const rest = args.slice(1);
        await handleIndex(rest.find((a) => !a.startsWith("--")), { force: rest.includes("--force") });
        break;
      }
      case "backfill":
        await handleBackfill(args.slice(1));
        break;
      case "hooks":
        await handleHooks(args.slice(1));
        break;
      // Called by Claude Code, not by people. Never fails.
      case "hook":
        await handleHook(args[1] ?? "");
        break;
      case "help":
      case "--help":
      case "-h":
        console.log(`
${devbrainCli1.BOLD}${devbrainCli1.CYAN}DevBrain${devbrainCli1.RESET} \u2014 memory your coding agent writes, and reads back
`);
        console.log(`  ${devbrainCli1.BOLD}Set up${devbrainCli1.RESET}`);
        console.log(`  ${devbrainCli1.CYAN}devbrain setup${devbrainCli1.RESET}            Storage, optional semantic search, this project`);
        console.log(`  ${devbrainCli1.CYAN}devbrain init${devbrainCli1.RESET}             Register a project + Claude Code hooks`);
        console.log(`  ${devbrainCli1.CYAN}devbrain hooks${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}[install]${devbrainCli1.RESET}  Brief sessions and prompt the agent to save ${devbrainCli1.DIM}(--global)${devbrainCli1.RESET}`);
        console.log(`
  ${devbrainCli1.BOLD}Write${devbrainCli1.RESET}`);
        console.log(`  ${devbrainCli1.CYAN}devbrain note${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}"<t>"${devbrainCli1.RESET}       Save  ${devbrainCli1.DIM}fix: decision: lesson: bug: stack: \u2026${devbrainCli1.RESET}`);
        console.log(`  ${devbrainCli1.CYAN}devbrain backfill${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}[n]${devbrainCli1.RESET}    Unreviewed commits and sessions, for your agent to save from`);
        console.log(`  ${devbrainCli1.CYAN}devbrain index${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}[file]${devbrainCli1.RESET}     Index CLAUDE.md as a source of truth`);
        console.log(`
  ${devbrainCli1.BOLD}Read${devbrainCli1.RESET}`);
        console.log(`  ${devbrainCli1.CYAN}devbrain context${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}[task]${devbrainCli1.RESET}  Ranked project history, as an agent sees it`);
        console.log(`  ${devbrainCli1.CYAN}devbrain search${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}<q>${devbrainCli1.RESET}       Search \u2014 exact error text works best`);
        console.log(`  ${devbrainCli1.CYAN}devbrain project${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}[n]${devbrainCli1.RESET}      Everything saved about a project ${devbrainCli1.DIM}(--write: one .md per section)${devbrainCli1.RESET}`);
        console.log(`  ${devbrainCli1.CYAN}devbrain run${devbrainCli1.RESET} ${devbrainCli1.MAGENTA}<cmd>${devbrainCli1.RESET}        Run a command; on failure, show past fixes`);
        console.log(`
  ${devbrainCli1.CYAN}devbrain${devbrainCli1.RESET}                  Interactive REPL`);
        console.log(`
  ${devbrainCli1.DIM}Set DEVBRAIN_DEBUG=1 to see full stack traces on error.${devbrainCli1.RESET}
`);
        break;
      default:
        if (command && !command.startsWith("-")) {
          console.log(`
  ${devbrainCli1.RED}Unknown command:${devbrainCli1.RESET} ${command}`);
          console.log(`  ${devbrainCli1.DIM}Run ${devbrainCli1.RESET}${devbrainCli1.CYAN}devbrain --help${devbrainCli1.RESET}${devbrainCli1.DIM} to see what's available.${devbrainCli1.RESET}
`);
          process.exit(1);
        }
        if (PLUGIN_BUILD) pluginSettingsNotice();
        break;
    }
  } catch (err) {
    reportError(err);
    await devbrainMcp1.distExports.closeDb();
    process.exit(1);
  }
  await devbrainMcp1.distExports.closeDb();
  await flushStdout();
  process.exit(process.exitCode ?? 0);
}
function flushStdout() {
  return new Promise((resolve) => {
    if (process.stdout.writableLength === 0) {
      resolve();
      return;
    }
    process.stdout.write("", () => resolve());
  });
}
if (require.main === module) {
  main();
}

exports.extractFailure = extractFailure;
exports.toolOutputText = toolOutputText;
