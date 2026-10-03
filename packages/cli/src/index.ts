#!/usr/bin/env node
import 'dotenv/config';
import { join, dirname, basename } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, appendFileSync, readdirSync, statSync } from 'fs';
import {
  getProjectByPath, upsertProject, insertEntry,
  getEntriesByProject, getAllEntriesWithProjects,
  markCommitProcessed, filterUnprocessedCommits,
  detectStack, getProjectName, isGitRepo, getRepoRoot,
  listCommitHashes, getCommit, removeGitHook,
  getEmbedding,
  findSimilar, similarityLabel, timeAgo,
  buildContext, formatContext,
  reinforceEntry, bumpRetrievalCounts, bumpRecallCounts, supersedeEntry,
  preciseSearch, classifyQuery, deleteEntry,
  describeStorage, getLocalDbPath, closeDb,
  ENTRY_TYPES, normalizeType, getAllProjects,
  buildDossier, formatDossierMarkdown, dossierFiles, measureUse, describeUse,
  isDuplicateEntry, findTextDuplicate, clip,
  parseMarkdownSource, planIndex, entryForSection,
  formatSessionBriefing, briefingEntries, isAlreadyInAgentContext,
  readCursor, writeCursor, markSurfaced, reviewTurn,
  looksLikeError, isReadOnlyCommand, recallForFailure, formatRecallForAgent,
  withDevbrainHooks, withoutDevbrainHooks, installedDevbrainHooks,
  nextSessionChunk, formatBackfillBatch, commitExcerpt, BACKFILL_BATCH_BUDGET,
} from '@devbrain/core';
import type { Entry, Project, EntryCategory } from '@devbrain/core';
import { nanoid } from 'nanoid';
import { homedir, tmpdir } from 'os';

// Load config from ~/.devbrain/.env (GEMINI_API_KEY, Vertex AI vars, MONGODB_URI, …).
// Loaded unconditionally; real environment variables take precedence, comments skipped.
const globalEnvPath = join(homedir(), '.devbrain', '.env');
if (existsSync(globalEnvPath)) {
  const lines = readFileSync(globalEnvPath, 'utf-8').replace(/^﻿/, '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const k = key?.trim();
    if (k && rest.length && process.env[k] === undefined) process.env[k] = rest.join('=').trim();
  }
}

// ─── first-run detection ──────────────────────────────────────────────────────

const devbrainDir = join(homedir(), '.devbrain');
const setupPath   = join(devbrainDir, 'setup.json');

function isOnboarded(): boolean {
  try {
    return existsSync(setupPath) && JSON.parse(readFileSync(setupPath, 'utf-8')).onboarded === true;
  } catch { return false; }
}

function markOnboarded(): void {
  if (!existsSync(devbrainDir)) mkdirSync(devbrainDir, { recursive: true });
  writeFileSync(setupPath, JSON.stringify({ onboarded: true, setupAt: Date.now() }), 'utf-8');
}

// ─── credentials ──────────────────────────────────────────────────────────────

const envFilePath = join(devbrainDir, '.env');

// Merge keys into ~/.devbrain/.env in place. Never rewrites the whole file —
// writing one credential must not wipe out the others already stored there.
function writeEnvVars(vars: Record<string, string>): void {
  if (!existsSync(devbrainDir)) mkdirSync(devbrainDir, { recursive: true });
  const lines = existsSync(envFilePath)
    ? readFileSync(envFilePath, 'utf-8').replace(/^﻿/, '').split('\n')
    : [];
  for (const [key, value] of Object.entries(vars)) {
    const idx = lines.findIndex(l => l.trim().startsWith(`${key}=`));
    if (idx === -1) lines.push(`${key}=${value}`);
    else lines[idx] = `${key}=${value}`;
  }
  writeFileSync(envFilePath, `${lines.join('\n').replace(/\n+$/, '')}\n`, 'utf-8');
}

function isMockMode(): boolean { return process.env.DEVBRAIN_MOCK === 'true'; }

function hasVertexCreds(): boolean {
  return ['true', '1'].includes((process.env.GOOGLE_GENAI_USE_VERTEXAI ?? '').toLowerCase())
    && !!process.env.GOOGLE_CLOUD_PROJECT;
}

function hasGeminiCreds(): boolean {
  return isMockMode() || hasVertexCreds()
    || !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
}

function hasMongoUri(): boolean { return !!process.env.MONGODB_URI?.trim(); }

// Map a raw error onto something a user can act on. Driver and SDK messages are
// accurate but unreadable; the common config failures get a next step instead.
function explainError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/No Gemini credentials|GOOGLE_CLOUD_PROJECT is not set/i.test(msg))
    return `No Gemini credentials — run ${CYAN}devbrain setup${RESET}, or add GEMINI_API_KEY to ${envFilePath}`;
  if (/bad auth|[Aa]uthentication failed/.test(msg))
    return `The database rejected the credentials in MONGODB_URI — check the username and password.`;
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|querySrv|[Ss]erver selection/.test(msg))
    return `Can't reach the database — check MONGODB_URI and your network connection.`;
  return msg;
}

function reportError(err: unknown, label = 'Error'): void {
  console.error(`\n  ${RED}${label}:${RESET} ${explainError(err)}\n`);
  if (process.env.DEVBRAIN_DEBUG && err instanceof Error && err.stack) {
    console.error(`${DIM}${err.stack}${RESET}\n`);
  }
}

const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const CYAN    = '\x1b[36m';
const GREEN   = '\x1b[32m';
const YELLOW  = '\x1b[33m';
const RED     = '\x1b[31m';
const BLUE    = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const RESET   = '\x1b[0m';

const BANNER = `${CYAN}
  ██████╗ ███████╗██╗   ██╗██████╗ ██████╗  █████╗ ██╗███╗   ██╗
  ██╔══██╗██╔════╝██║   ██║██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
  ██║  ██║█████╗  ╚██╗ ██╔╝██████╔╝██████╔╝███████║██║██╔██╗ ██║
  ██║  ██║██╔══╝   ╚████╔╝ ██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
  ██████╔╝███████╗  ╚██╔╝  ██████╔╝██║  ██╗██║  ██║██║██║ ╚████║
  ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝${RESET}
${DIM}                    your developer memory${RESET}`;

function dim(text: string): string { return `${DIM}${text}${RESET}`; }
function bold(text: string): string { return `${BOLD}${text}${RESET}`; }
function clr(): void { process.stdout.write('\x1b[2J\x1b[H'); }
function typeCode(type: string): string {
  switch (type) {
    case 'bug':                    return RED;
    case 'fix': case 'solution':   return GREEN;
    case 'stack':                  return CYAN;
    case 'decision':               return MAGENTA;
    case 'pattern': case 'lesson': return YELLOW;
    case 'anti-pattern':           return '\x1b[91m';
    case 'image':                  return '\x1b[35m';
    default:                       return BLUE;
  }
}

function openPath(target: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { exec } = require('child_process') as typeof import('child_process');
  if (process.platform === 'win32') exec(`start "" "${target}"`);
  else if (process.platform === 'darwin') exec(`open "${target}"`);
  else exec(`xdg-open "${target}"`);
}
function typeDot(type: string): string { return `${typeCode(type)}●${RESET}`; }

function spin(text: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${CYAN}${frames[i++ % frames.length]}${RESET} ${text}`);
  }, 80);
  return {
    succeed: (msg: string) => { clearInterval(id); process.stdout.write(`\r${GREEN}✓${RESET} ${msg}\n`); },
    fail:    (msg: string) => { clearInterval(id); process.stdout.write(`\r${RED}✗${RESET} ${msg}\n`); },
    stop:    ()            => { clearInterval(id); process.stdout.write('\r\x1b[K'); },
  };
}

// ─── project context ──────────────────────────────────────────────────────────

async function printProjectContext(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project = await getProjectByPath(repoRoot);

  console.log(BANNER);

  if (!project) {
    console.log(`  ${YELLOW}No project tracked here.${RESET} Select ${CYAN}Init project${RESET} to start.\n`);
    return;
  }

  await upsertProject({ ...project, lastSeen: Date.now() });
  const entries = await getEntriesByProject(project.id);
  const bugs  = entries.filter(e => e.type === 'bug').length;
  const fixes = entries.filter(e => e.type === 'fix').length;
  const notes = entries.filter(e => e.type === 'note').length;
  const hooksOn = agentHooksInstalled(repoRoot);

  console.log(`  ${bold('Project')}  ${project.name}`);
  console.log(`  ${bold('Stack')}    ${project.stack.join(', ') || 'Unknown'}`);
  console.log(`  ${bold('Hooks')}    ${hooksOn ? `${GREEN}✓ Claude Code${RESET}` : `${YELLOW}✗ not installed${RESET}  ${DIM}devbrain hooks install${RESET}`}`);
  console.log(`  ${bold('Memory')}   ${entries.length} entries  ${dim(`${bugs} bugs · ${fixes} fixes · ${notes} notes`)}  ${dim(`· ${describeStorage().kind === 'local' ? 'local' : 'MongoDB'}`)}`);

  if (entries.length > 0) {
    console.log(`\n  ${CYAN}Recent knowledge${RESET}`);
    entries.slice(0, 4).forEach(e => {
      const dot = typeDot(e.type);
      const title = e.title.length > 72 ? e.title.slice(0, 72) + '…' : e.title;
      console.log(`  ${dot} ${title}  ${dim(timeAgo(e.createdAt))}`);
    });
  }

  console.log();
}

// ─── handlers ─────────────────────────────────────────────────────────────────

// Delimiters around the generated block in DEV_CONTEXT.md, so `init` can refresh
// its own instructions in place instead of leaving stale guidance forever.
const DEVCONTEXT_BEGIN = '<!-- devbrain:begin — generated by `devbrain init`; edits inside are overwritten -->';
const DEVCONTEXT_END   = '<!-- devbrain:end -->';

/**
 * Swap the DevBrain block in an existing DEV_CONTEXT.md for a fresh one.
 *
 * Returns the updated document, or null when there's no block to replace (the
 * caller then appends). Delimited blocks are replaced exactly. A legacy block
 * written before the delimiters existed is replaced from its heading to the end
 * of the file — safe because the block was only ever appended last.
 */
function replaceDevbrainBlock(doc: string, block: string): string | null {
  const begin = doc.indexOf(DEVCONTEXT_BEGIN);
  if (begin !== -1) {
    const end = doc.indexOf(DEVCONTEXT_END, begin);
    if (end !== -1) {
      const tail = doc.slice(end + DEVCONTEXT_END.length);
      return doc.slice(0, begin) + block.trimEnd() + (tail.trim() ? tail : '\n');
    }
  }

  const legacy = doc.indexOf('## DevBrain Memory');
  if (legacy === -1) return null;
  const head = doc.slice(0, legacy).trimEnd();
  return (head ? `${head}\n\n` : '') + block;
}

async function handleInit(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  let unreviewed = 0;
  const s = spin('Detecting project...');
  try {
    const stack    = detectStack(repoRoot);
    const name     = getProjectName(repoRoot);
    const existing = await getProjectByPath(repoRoot);
    const isNew    = !existing;
    await upsertProject({
      id: existing?.id ?? nanoid(),
      name, path: repoRoot, stack,
      createdAt: existing?.createdAt ?? Date.now(),
      lastSeen: Date.now(),
    });
    s.succeed(`Registered: ${BOLD}${name}${RESET}`);
    console.log(`  Stack: ${stack.join(', ') || 'Unknown'}`);
    if (isGitRepo(repoRoot)) {
      // Earlier versions installed a post-commit hook that had a model read each
      // commit. Commits are now reviewed through the agent (devbrain backfill).
      if (removeGitHook(repoRoot)) {
        console.log(`  ${GREEN}✓${RESET} Removed the old post-commit hook — your agent reviews commits now`);
      }
      // That hook ran `devbrain capture`, which no longer exists, so it fails
      // silently on every commit in any repo still carrying it. They are
      // registered here, so they can be cleaned without visiting each one.
      const alsoCleaned = await cleanStaleGitHooks(repoRoot);
      if (alsoCleaned.length) {
        console.log(`  ${GREEN}✓${RESET} Removed the same dead hook from ${alsoCleaned.join(', ')}`);
      }
      unreviewed = (await unreviewedCommits(repoRoot)).length;
    } else {
      console.log(`  ${YELLOW}⚠${RESET}  Not a git repo — knowledge comes from agent sessions and notes`);
    }

    // Commits are only half of it: the reasoning lives in the agent session.
    // Local settings, so teammates without DevBrain installed are unaffected.
    try {
      const path = agentSettingsPath(repoRoot, false);
      writeAgentSettings(path, withDevbrainHooks(readAgentSettings(path)));
      console.log(`  ${GREEN}✓${RESET} Claude Code hooks installed — sessions start briefed, and your agent is asked to record what it fixes`);
    } catch (err) {
      console.log(`  ${YELLOW}⚠${RESET}  Could not install Claude Code hooks: ${explainError(err)}`);
    }

    // Write DEV_CONTEXT.md so AI agents call DevBrain tools automatically
    const devContextMdPath = join(repoRoot, 'DEV_CONTEXT.md');
    const devbrainBlock = [
      DEVCONTEXT_BEGIN,
      '## DevBrain Memory',
      '',
      '> DevBrain is an **installed CLI tool** (`devbrain` npm package). DO NOT reimplement',
      '> or recreate it. Run `devbrain --help` to verify. All commands below are real shell',
      '> commands — invoke them with Bash/PowerShell, do not write code that mimics them.',
      '',
      `Project: ${name}  |  Stack: ${stack.join(', ') || 'Unknown'}`,
      '',
      '### Before every task',
      '```',
      '# Load what broke before, what was decided, what to avoid:',
      'devbrain context "<the task>"            # MCP: get_context',
      '',
      '# Before debugging — search with the EXACT error text:',
      'devbrain search "<exact error message>"  # MCP: search_knowledge',
      '```',
      '',
      '### You write the record — DevBrain stores it',
      '',
      'DevBrain runs no model of its own: you did the work, so you write the entry.',
      'Do not wait to be asked. Save as soon as you think any of these:',
      '',
      '- "That was non-obvious — I would not have known that without digging"',
      '- "This fix took longer than it should have — future me should know this"',
      '- "This behavior is counterintuitive — it looks like X but actually does Y"',
      '- "We decided against the obvious approach — here is why"',
      '- "This error message is misleading — the real cause is something else"',
      '- "This works in dev but will break in production for this exact reason"',
      '',
      '```',
      '# MCP: save_entry (type, title, content, error_pattern). Or from the shell:',
      'devbrain note "fix: <symptom> — <root cause, then the exact fix>"',
      'devbrain note "decision: <what was chosen> — <what was rejected, and why>"',
      'devbrain note "lesson: <what looked right> — <why it was wrong>"',
      'devbrain note "anti-pattern: <what never to do> — <the consequence>"',
      '```',
      '',
      '### What makes a good entry',
      '- **Title**: the symptom or the decision, specific and searchable ("JWT expiry fails in prod", not "auth bug")',
      '- **Content**: the root cause, then the exact fix — not just the fix',
      '- **Error pattern**: the exact error message, verbatim, whenever there is one',
      '- **Wrong entry?** Save what is true with `save_entry` and pass the wrong entry\'s id as `supersedes`',
      '',
      '### What DevBrain does for you (Claude Code, with `devbrain hooks install`)',
      '',
      '- At session start, this project\'s memory is put in your context.',
      '- When a shell command fails and memory holds the same error, the past fix is handed to you',
      '  unasked. You do not have to remember to search — but searching still finds more.',
      '- When a stretch of work fixes or decides something and you saved nothing,',
      '  DevBrain asks you to record it before you finish. Saving earlier means it never has to ask.',
      '- If it mentions unreviewed commits, run `devbrain backfill` when there is a pause,',
      '  save what matters from it, and repeat until it says history is fully reviewed.',
      '',
      '### Rules',
      '- Run `devbrain context` before any non-trivial task.',
      '- Run `devbrain search` before debugging an error you have not seen before.',
      '- If you had to think to solve it, save it.',
      '- **Never reimplement devbrain** — run `devbrain --help` to confirm it is installed.',
      '',
      DEVCONTEXT_END,
      '',
    ].join('\n');

    if (!existsSync(devContextMdPath)) {
      writeFileSync(devContextMdPath, devbrainBlock, 'utf-8');
      console.log(`  ${GREEN}✓${RESET} Created DEV_CONTEXT.md — AI Agent will call DevBrain automatically`);
    } else {
      const existing = readFileSync(devContextMdPath, 'utf-8');
      const updated  = replaceDevbrainBlock(existing, devbrainBlock);
      if (updated === null) {
        writeFileSync(devContextMdPath, existing.trimEnd() + '\n\n' + devbrainBlock, 'utf-8');
        console.log(`  ${GREEN}✓${RESET} Updated DEV_CONTEXT.md — DevBrain block appended`);
      } else if (updated === existing) {
        console.log(`  ${DIM}DEV_CONTEXT.md already up to date${RESET}`);
      } else {
        writeFileSync(devContextMdPath, updated, 'utf-8');
        console.log(`  ${GREEN}✓${RESET} Refreshed DEV_CONTEXT.md — DevBrain instructions updated`);
      }
    }

    // Index CLAUDE.md if there is one, rather than competing with it.
    //
    // CLAUDE.md is usually the project's real knowledge base: in the repo,
    // reviewed in PRs, and loaded into the agent automatically. A second store
    // beside it is a duplicate nobody reads. Indexing makes DevBrain a
    // searchable layer over it — findable by a pasted error, and reusable from
    // other repos — while the file stays the source of truth.
    if (DEFAULT_SOURCE_FILES.some(f => existsSync(join(repoRoot, f)))) {
      await handleIndex().catch(err => {
        console.log(`  ${YELLOW}⚠${RESET}  Could not index: ${explainError(err)}`);
      });
    }

    // Print MCP server config so standard AI tools see devbrain tools natively
    const W2  = Math.min(process.stdout.columns || 80, 80);
    const bar2 = `${DIM}${'─'.repeat(W2)}${RESET}`;
    console.log(bar2);
    console.log(`\n  ${BOLD}${CYAN}Connect DevBrain to your AI Agent / MCP Host${RESET}  ${DIM}(one-time setup per machine)${RESET}\n`);
    console.log(`  Add this to your MCP settings or Google Cloud Agent Builder so the agent`);
    console.log(`  calls DevBrain tools automatically — without needing to be asked:\n`);
    console.log(`${CYAN}  ┌─ MCP Client Configuration JSON ─────────────────────────────────────┐${RESET}`);
    console.log(`  ${DIM}{${RESET}`);
    console.log(`    ${DIM}"mcpServers": {${RESET}`);
    console.log(`      ${CYAN}"devbrain"${RESET}${DIM}: {${RESET}`);
    console.log(`        ${CYAN}"type"${RESET}${DIM}: ${RESET}${GREEN}"stdio"${RESET}${DIM},${RESET}`);
    console.log(`        ${CYAN}"command"${RESET}${DIM}: ${RESET}${GREEN}"npx"${RESET}${DIM},${RESET}`);
    console.log(`        ${CYAN}"args"${RESET}${DIM}: ${RESET}${GREEN}["-y", "@devbrain/mcp"]${RESET}`);
    console.log(`      ${DIM}}${RESET}`);
    console.log(`    ${DIM}}${RESET}`);
    console.log(`  ${DIM}}${RESET}`);
    console.log(`${CYAN}  └────────────────────────────────────────────────────────────────────┘${RESET}\n`);
    console.log(`  ${DIM}Your knowledge stays on this machine. To point at a server you host${RESET}`);
    console.log(`  ${DIM}yourself instead, use {"type": "http", "url": "<your-host>/mcp"}.${RESET}
`);
    console.log(bar2);
    console.log();

    // The one next step: history that has not been read yet. Phrased as what to
    // ask the agent, because the agent is what reads it.
    if (unreviewed > 0) {
      console.log(`  ${BOLD}Next:${RESET} ${unreviewed} past commit${unreviewed === 1 ? '' : 's'} to learn from. Ask your coding agent:`);
      console.log(`  ${CYAN}"run devbrain backfill and save what matters"${RESET}\n`);
    }
  } catch (err) {
    s.fail('Init failed');
    reportError(err);
  }
}


// ─── backfill: past work, reviewed by the agent ─────────────────────────────

/** How far back to look for commits nobody has reviewed. */
const BACKFILL_SCAN = 200;
/** Commits per batch, by default. Small enough to actually read. */
const BACKFILL_COMMITS_DEFAULT = 8;
/** At most this many past sessions per batch. */
const BACKFILL_SESSIONS = 2;
/** A transcript written this recently is a live session — the Stop hook covers it. */
const LIVE_SESSION_MS = 10 * 60 * 1000;
// Deadline for the post-failure lookup in `devbrain run`. It wraps a build, so a
// slow lookup must be abandoned rather than delay a failure already on screen.
const RUN_LOOKUP_TIMEOUT_MS = 8000;

/** Recent commits in this repo that have not been reviewed, newest first. */
async function unreviewedCommits(repoRoot: string): Promise<string[]> {
  if (!isGitRepo(repoRoot)) return [];
  return filterUnprocessedCommits(listCommitHashes(repoRoot, BACKFILL_SCAN)).catch(() => []);
}

/**
 * Remove the dead `devbrain capture` post-commit hook from every registered
 * project except `skip` (already handled by the caller).
 *
 * Removing the command left those hooks calling something that does not exist.
 * They swallow the error, so nothing surfaces — the repo just runs a failing
 * command after every commit. Returns the names cleaned.
 */
async function cleanStaleGitHooks(skip?: string): Promise<string[]> {
  const cleaned: string[] = [];
  for (const p of await getAllProjects().catch(() => [])) {
    if (p.path === skip) continue;
    try { if (removeGitHook(p.path)) cleaned.push(p.name); } catch { /* unreadable repo */ }
  }
  return cleaned;
}

/** Past (not live) Claude Code sessions for this repo. */
function pastSessions(repoRoot: string): string[] {
  const now = Date.now();
  return transcriptsFor(repoRoot).filter(f => now - statSync(f).mtimeMs > LIVE_SESSION_MS);
}

/**
 * `devbrain backfill [n] [--print]` — hand past work to the coding agent.
 *
 * Commits made before DevBrain was installed, and agent sessions from before
 * the Stop hook, have nobody to ask in the moment. This prints a bounded batch
 * of them with instructions; the agent reads it, saves what matters through
 * save_entry, and runs it again for the next batch. Nothing here calls a model.
 *
 * A person at a terminal gets an explanation instead, since the batch is
 * reading material for the agent: marking it reviewed because it scrolled past
 * a human would lose it. `--print` shows it without marking anything.
 */
async function handleBackfill(args: string[]): Promise<void> {
  const repoRoot = getRepoRoot(process.cwd()) ?? process.cwd();
  const project  = await getProjectByPath(repoRoot);
  if (!project) {
    console.log(`\n  ${YELLOW}Not a DevBrain project:${RESET} ${repoRoot}`);
    console.log(`  ${DIM}Run ${RESET}${CYAN}devbrain init${RESET}${DIM} here first.${RESET}\n`);
    return;
  }

  const countArg = args.find(a => /^\d+$/.test(a));
  const limit    = countArg ? Math.max(1, Math.min(Number(countArg), 50)) : BACKFILL_COMMITS_DEFAULT;
  const preview  = args.includes('--print');
  const forAgent = preview || !process.stdout.isTTY;

  const pending  = await unreviewedCommits(repoRoot);
  const sessions = pastSessions(repoRoot);

  if (!forAgent) {
    const open = sessions.filter(f => nextSessionChunk(readFileSync(f, 'utf-8'), readCursor(basename(f, '.jsonl')).line).digest).length;
    console.log(`\n  ${BOLD}Unreviewed history${RESET} ${DIM}— ${project.name}${RESET}`);
    console.log(`  ${pending.length} commit${pending.length === 1 ? '' : 's'}${pending.length >= BACKFILL_SCAN ? '+' : ''} · ${open} earlier agent session${open === 1 ? '' : 's'}\n`);
    if (!pending.length && !open) {
      console.log(`  ${GREEN}✓${RESET} Everything has been reviewed.\n`);
      return;
    }
    console.log(`  This is reading material for your coding agent — it writes the entries,`);
    console.log(`  DevBrain only stores them. Ask it:\n`);
    console.log(`    ${CYAN}"run devbrain backfill and save what matters"${RESET}\n`);
    console.log(`  ${DIM}To read a batch yourself without marking it reviewed: ${RESET}${CYAN}devbrain backfill --print${RESET}\n`);
    return;
  }

  // Fill the batch: commits first (newest — most likely to still matter), then
  // past sessions, within one budget so the batch fits in an agent's context.
  let budget = BACKFILL_BATCH_BUDGET;
  const commits = [];
  for (const hash of pending) {
    if (commits.length >= limit) break;
    const commit = getCommit(repoRoot, hash);
    if (!commit) continue;
    const size = commitExcerpt(commit).length;
    if (commits.length && size > budget) break;
    commits.push(commit);
    budget -= size;
  }

  const chunks: { sessionId: string; digest: string; toLine: number; file: string }[] = [];
  let sessionsLeft = 0;
  for (const file of sessions) {
    const sessionId = basename(file, '.jsonl');
    const from  = readCursor(sessionId).line;
    const chunk = nextSessionChunk(readFileSync(file, 'utf-8'), from);
    if (!chunk.digest) {
      // Nothing worth reading left in this session: let it go for good.
      if (!preview && chunk.toLine !== from) writeCursor(sessionId, chunk.toLine);
      continue;
    }
    if (chunks.length >= BACKFILL_SESSIONS || chunk.digest.length > budget) { sessionsLeft++; continue; }
    chunks.push({ sessionId, digest: chunk.digest, toLine: chunk.toLine, file });
    budget -= chunk.digest.length;
  }
  // A session handed over in part still counts as unreviewed if more of it is worth reading.
  for (const c of chunks) {
    if (nextSessionChunk(readFileSync(c.file, 'utf-8'), c.toLine).digest) sessionsLeft++;
  }

  if (!commits.length && !chunks.length) {
    console.log('DevBrain: nothing left to review — history is fully reviewed.');
    return;
  }

  console.log(formatBackfillBatch({
    project: project.name,
    commits,
    sessions: chunks,
    remainingCommits: pending.length - commits.length,
    remainingSessions: sessionsLeft,
    markedReviewed: !preview,
  }));

  if (preview) return;
  for (const c of commits) await markCommitProcessed(c.hash, project.id);
  for (const c of chunks) writeCursor(c.sessionId, c.toLine);
}

// ─── agent sessions: briefing and the record prompt ───────────────────────────

const captureLogPath = join(devbrainDir, 'capture.log');

function captureLog(message: string): void {
  try {
    mkdirSync(devbrainDir, { recursive: true });
    appendFileSync(captureLogPath, `[${new Date().toISOString()}] ${message}\n`, 'utf-8');
  } catch { /* logging must never break capture */ }
}

function agentSettingsPath(repoRoot: string, global: boolean): string {
  return global
    ? join(homedir(), '.claude', 'settings.json')
    : join(repoRoot, '.claude', 'settings.local.json');
}

function readAgentSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf-8').replace(/^﻿/, '').trim();
  // Refuse to overwrite a file we cannot parse — it is the user's config.
  return raw ? JSON.parse(raw) : {};
}

function writeAgentSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

/** Hook input on stdin. Bounded wait: a hook must never hang the agent. */
function readHookInput(): Promise<Record<string, unknown>> {
  if (process.stdin.isTTY) return Promise.resolve({});
  return Promise.race([
    readStdin(),
    // unref: once stdin has ended, a pending safety timer must not keep the
    // process — and so the agent — waiting out its full two seconds.
    new Promise<string>(resolve => setTimeout(() => resolve(''), 2000).unref()),
  ]).then(text => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } });
}

/**
 * Entry point for the agent harness (`devbrain hook <event>`).
 *
 * Exits 0 whatever happens: a failure here must never block or disturb the
 * agent. session-start prints the briefing; stop decides from the transcript
 * alone whether to ask the agent to record something. Neither calls a model.
 */
async function handleHook(event: string): Promise<void> {
  try {
    const input = await readHookInput();
    const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();

    if (event === 'session-start') {
      const repoRoot = getRepoRoot(cwd) ?? cwd;
      const project = await getProjectByPath(repoRoot);
      if (!project) return;
      const all = await getAllEntriesWithProjects();
      // This project's own CLAUDE.md is already in the agent's context; ranking
      // it back in would restate the file in fewer words. Named, not hidden.
      const shown = briefingEntries(all, project.id);
      const skipped = all.filter(e => isAlreadyInAgentContext(e, project.id));
      const briefing = formatSessionBriefing(buildContext(shown, project), {
        unreviewedCommits: (await unreviewedCommits(repoRoot)).length,
        ...(skipped.length
          ? { indexedFromFile: { file: skipped[0].source!.file, count: skipped.length } }
          : {}),
      });
      if (!briefing) return;
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: briefing },
      }));
      return;
    }

    // A shell command just ran. If it failed and memory holds a literal match
    // for the error, hand it to the agent now — this is the moment recall pays
    // off, and the moment an agent is least likely to go looking.
    if (event === 'post-tool') {
      const output = typeof input.tool_output === 'string'
        ? input.tool_output
        : JSON.stringify(input.tool_output ?? '');
      const command = String((input.tool_input as { command?: unknown } | undefined)?.command ?? '');

      // Decided before touching the database: most commands succeed, and a
      // hook that runs after every one of them must cost nothing when idle.
      if (!looksLikeError(output, false) || isReadOnlyCommand(command)) return;
      const failure = extractFailure(output);
      if (!failure) return;

      const sessionId = typeof input.session_id === 'string' ? input.session_id : '';
      const project = await getProjectByPath(getRepoRoot(cwd) ?? cwd);
      if (!project) return;

      const hits = recallForFailure(failure, await getAllEntriesWithProjects(), {
        projectId: project.id,
        // Pushing the same past fix after every retry of a flaky command would
        // teach the agent to tune the whole channel out.
        exclude: sessionId ? readCursor(sessionId).surfaced ?? [] : [],
      });
      const message = formatRecallForAgent(failure, hits);
      if (!message) return;

      if (sessionId) markSurfaced(sessionId, hits.map(h => h.entry.id));
      const recalled = hits.map(h => h.entry.id);
      bumpRetrievalCounts(recalled, project.id).catch(() => {});
      // The one surfacing that shows the entry earned its place: a command
      // failed and this entry matched it. Counted apart from being shown.
      bumpRecallCounts(recalled).catch(() => {});
      captureLog(`${project.name} ${sessionId.slice(0, 8)}: recalled ${hits.length} for "${clip(failure, 60)}"`);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message },
      }));
      return;
    }

    // pre-compact and session-end were installed by an earlier version that ran
    // a model over the transcript. Capture is the agent's job now, and neither
    // event leaves an agent turn to do it in, so they are accepted and ignored.
    if (event !== 'stop') return;

    // Set when the agent is continuing because a Stop hook — ours — held it.
    // It has had its chance to record; asking again would loop.
    if (input.stop_hook_active === true) return;

    const transcript = input.transcript_path;
    const sessionId = input.session_id;
    if (typeof transcript !== 'string' || typeof sessionId !== 'string' || !existsSync(transcript)) return;

    const cursor = readCursor(sessionId);
    const review = reviewTurn(readFileSync(transcript, 'utf-8'), cursor.line);
    const advance = () => writeCursor(sessionId, review.cursor);

    if (review.action !== 'ask') {
      if (review.cursor !== cursor.line) advance();
      return;
    }

    // Only registered projects are captured. Checked last: it is the one step
    // that touches the database, and most turns never get this far.
    const project = await getProjectByPath(getRepoRoot(cwd) ?? cwd);
    if (!project) return;

    advance();
    captureLog(`${project.name} ${sessionId.slice(0, 8)}: asked the agent to record this stretch`);
    process.stdout.write(JSON.stringify({ decision: 'block', reason: review.prompt }));
  } catch (err) {
    captureLog(`hook ${event} failed: ${explainError(err)}`);
  }
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Claude Code keeps a project's transcripts in a folder named after its path. */
function transcriptsFor(repoRoot: string): string[] {
  const dir = join(homedir(), '.claude', 'projects', repoRoot.replace(/[^A-Za-z0-9]/g, '-'));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => join(dir, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
}


/** True when Claude Code runs DevBrain's hooks here, from project or user settings. */
function agentHooksInstalled(repoRoot: string): boolean {
  for (const global of [false, true]) {
    try {
      if (installedDevbrainHooks(readAgentSettings(agentSettingsPath(repoRoot, global))).length) return true;
    } catch { /* unreadable settings: treat as not installed */ }
  }
  return false;
}

/** `devbrain hooks [install|uninstall|status] [--global]` */
async function handleHooks(args: string[]): Promise<void> {
  const action = args.find(a => !a.startsWith('--')) ?? 'status';
  const global = args.includes('--global');
  const repoRoot = getRepoRoot(process.cwd()) ?? process.cwd();
  const path = agentSettingsPath(repoRoot, global);
  const scope = global ? 'all projects (user settings)' : 'this project (.claude/settings.local.json)';

  if (action === 'install') {
    writeAgentSettings(path, withDevbrainHooks(readAgentSettings(path)));
    console.log(`\n  ${GREEN}✓${RESET} Claude Code hooks installed for ${scope}`);
    console.log(`  ${DIM}${path}${RESET}`);
    console.log(`  ${DIM}Sessions start briefed with project memory, and when the agent fixes or decides`);
    console.log(`  something without saving it, DevBrain asks it to. Registered projects only.${RESET}`);
    console.log(`  ${DIM}Restart Claude Code (or run /hooks) for it to pick them up.${RESET}\n`);
    return;
  }
  if (action === 'uninstall') {
    writeAgentSettings(path, withoutDevbrainHooks(readAgentSettings(path)));
    console.log(`\n  ${GREEN}✓${RESET} DevBrain hooks removed from ${scope}\n`);
    return;
  }

  console.log(`\n  ${BOLD}Agent hooks${RESET}`);
  for (const [label, p] of [['project', agentSettingsPath(repoRoot, false)], ['global ', agentSettingsPath(repoRoot, true)]] as const) {
    let events: string[] = [];
    try { events = installedDevbrainHooks(readAgentSettings(p)); } catch { events = ['(unreadable settings file)']; }
    console.log(`  ${label}  ${events.length ? `${GREEN}${events.join(', ')}${RESET}` : `${DIM}not installed${RESET}`}`);
  }
  if (existsSync(captureLogPath)) {
    const recent = readFileSync(captureLogPath, 'utf-8').trimEnd().split('\n').slice(-12);
    console.log(`\n  ${BOLD}Recent DevBrain prompts${RESET} ${DIM}(${captureLogPath})${RESET}`);
    for (const l of recent) console.log(`  ${DIM}${l}${RESET}`);
  } else {
    console.log(`\n  ${DIM}Nothing logged yet.${RESET}`);
  }
  console.log();
}

// ─── index: treat a Markdown file as a source of truth ────────────────────────

const DEFAULT_SOURCE_FILES = ['CLAUDE.md', 'AGENTS.md', 'DEVBRAIN.md'];

/**
 * Index a Markdown file so its knowledge reaches agents, without copying it.
 *
 * The file stays authoritative. Each run reconciles against its current content:
 * a changed section updates its entry, a removed section retracts one, a new
 * section adds one. That is what keeps DevBrain and the file from drifting —
 * the failure the whole feature exists to prevent.
 */
async function handleIndex(fileArg?: string): Promise<void> {
  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;

  const candidates = fileArg ? [fileArg] : DEFAULT_SOURCE_FILES;
  const file = candidates.find(f => existsSync(join(repoRoot, f)));
  if (!file) {
    console.log(`\n  ${YELLOW}No source file to index.${RESET}`);
    console.log(`  ${DIM}Looked for: ${candidates.join(', ')} in ${repoRoot}${RESET}`);
    console.log(`  ${DIM}Name one explicitly: ${RESET}${CYAN}devbrain index docs/ENGINEERING.md${RESET}\n`);
    return;
  }

  let project = await getProjectByPath(repoRoot);
  if (!project) {
    project = { id: nanoid(), name: getProjectName(repoRoot), path: repoRoot, stack: detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now() };
    await upsertProject(project);
  }

  const text     = readFileSync(join(repoRoot, file), 'utf-8');
  const sections = parseMarkdownSource(text);
  const existing = (await getAllEntriesWithProjects()).filter(e => e.projectId === project!.id);
  const plan     = planIndex(sections, existing, file);

  console.log(`\n  ${bold(`Indexing ${file}`)}  ${dim(`${sections.length} sections`)}`);
  console.log(`  ${DIM}${plan.added.length} new · ${plan.updated.length} changed · ${plan.unchanged} unchanged · ${plan.removed.length} gone${RESET}\n`);

  if (!plan.added.length && !plan.updated.length && !plan.removed.length) {
    console.log(`  ${GREEN}✓${RESET} Already up to date.\n`);
    return;
  }

  const embedFor = async (s: { title: string; body: string }) => {
    try { return await getEmbedding(`${s.title} ${s.body}`); } catch { return undefined; }
  };

  for (const section of plan.added) {
    await insertEntry(entryForSection(section, project, file, { id: nanoid(), embedding: await embedFor(section) }));
    console.log(`  ${GREEN}+${RESET} ${typeCode(section.type)}${section.type}${RESET}  ${clip(section.title, 62)}`);
  }

  for (const { section, entry } of plan.updated) {
    // Replace in place: same id, so anything referencing it still resolves.
    await deleteEntry(entry.id);
    await insertEntry(entryForSection(section, project, file, {
      id: entry.id, embedding: await embedFor(section), createdAt: entry.createdAt,
    }));
    console.log(`  ${YELLOW}~${RESET} ${typeCode(section.type)}${section.type}${RESET}  ${clip(section.title, 62)}  ${DIM}(source changed)${RESET}`);
  }

  for (const entry of plan.removed) {
    // Retract rather than delete: the entry was true once, and something may
    // have cited it. Superseded entries stop surfacing but stay readable.
    const id = nanoid();
    await insertEntry({
      id, projectId: project.id, type: 'lesson',
      title: clip(`No longer in ${file}: ${entry.title}`, 120),
      content: `This was removed from ${file}, so it is no longer current guidance.`,
      tags: ['claude-md', 'removed'], createdAt: Date.now(), confidence: 'observation',
    });
    await supersedeEntry(entry.id, id);
    console.log(`  ${RED}-${RESET} ${clip(entry.title, 62)}  ${DIM}(removed from source)${RESET}`);
  }

  console.log(`\n  ${GREEN}${bold('Indexed.')}${RESET} ${DIM}${file} stays the source — edit it there and re-run to update.${RESET}\n`);
}

// ─── run: look up past fixes at the moment something fails ────────────────────

// Lines worth treating as the failure, most specific first. A stack trace is
// mostly frames; the line naming the error is the one a past fix was filed under.
const ERROR_SIGNALS: RegExp[] = [
  /^[A-Za-z_.]*(Error|Exception)\b.*/,              // TypeError: x is not a function
  /\berror\s+[A-Z]{1,4}\d{2,5}\b.*/,                // error TS2345, error CS1002
  /\b(E[A-Z]{3,}|ENOENT|ECONNREFUSED|EADDRINUSE)\b.*/,
  /\b(failed|failure|cannot|could not|unable to)\b.*/i,
  /\b(assert|expected .* (to|but)|✕|✗|FAIL)\b.*/i,
];

/**
 * Pick the line most likely to be the actual failure.
 *
 * Callers pass a whole build or test log. Embedding all of it buries the signal,
 * and the first line is usually a banner rather than the error.
 */
export function extractFailure(output: string): string | null {
  const lines = output
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')          // strip colour
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^\s*at\s+/.test(l));             // drop stack frames
  if (lines.length === 0) return null;

  // Search the tail first: the failure is usually near the end of a log.
  const tail = lines.slice(-80).reverse();
  for (const re of ERROR_SIGNALS) {
    const hit = tail.find(l => re.test(l));
    if (hit) return hit.slice(0, 300);
  }
  return lines[lines.length - 1].slice(0, 300);
}

/**
 * Run a command and, if it fails, say whether this went wrong here before.
 *
 * Every other lookup depends on someone choosing to ask. This one fires at the
 * exact moment a past fix is worth most — when the error is on screen — and
 * needs no agent cooperation. It is deliberately invisible otherwise: output
 * streams through untouched, the child's exit code is preserved, and any
 * internal failure is swallowed rather than breaking the wrapped command.
 */
async function handleRun(argv: string[]): Promise<void> {
  if (argv.length === 0) {
    console.log(`\n  ${BOLD}devbrain run${RESET} ${MAGENTA}<command>${RESET}`);
    console.log(`  ${DIM}Runs the command. If it fails, searches your memory for the error.${RESET}\n`);
    console.log(`  ${CYAN}devbrain run npm test${RESET}`);
    console.log(`  ${CYAN}devbrain run npm run build${RESET}\n`);
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawn } = require('child_process') as typeof import('child_process');

  const captured: string[] = [];
  const MAX_CAPTURE = 64 * 1024;
  let size = 0;
  const tee = (chunk: Buffer, to: NodeJS.WriteStream) => {
    to.write(chunk);
    if (size < MAX_CAPTURE) { captured.push(chunk.toString()); size += chunk.length; }
  };

  const code: number = await new Promise(resolve => {
    const child = spawn(argv.join(' '), {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', c => tee(c, process.stdout));
    child.stderr?.on('data', c => tee(c, process.stderr));
    child.on('error', () => resolve(127));
    child.on('close', c => resolve(c ?? 0));
  });

  if (code === 0) { process.exitCode = 0; return; }

  // Past this point nothing may change the outcome of the user's command.
  process.exitCode = code;

  try {
    const failure = extractFailure(captured.join(''));
    if (!failure) return;

    // Match on the error text alone — no embedding, so no Gemini call.
    //
    // This started as an embedded search with a timeout, which was wrong twice
    // over: an exhausted quota made it hang for minutes, and abandoning the
    // in-flight request at exit tripped a libuv assertion on Windows that
    // corrupted the exit code. It is also the wrong tool. preciseSearch scores
    // literal overlap against errorPattern and title with no vector at all, and
    // for an exact error string that beats semantic similarity. The result is
    // instant, free, works offline, and needs no credentials.
    const repoRoot = getRepoRoot(process.cwd()) ?? process.cwd();
    const [allEntries, project] = await Promise.all([
      getAllEntriesWithProjects(),
      getProjectByPath(repoRoot),
    ]);
    const hits = preciseSearch(failure, [], allEntries, { topK: 3 });
    if (hits.length === 0) return;

    const W = Math.min(process.stdout.columns || 80, 80);
    console.log(`\n${DIM}${'─'.repeat(W)}${RESET}`);
    console.log(`  ${CYAN}${bold('DevBrain')}${RESET} — this looked familiar:`);
    console.log(`  ${DIM}matched on: ${failure.slice(0, 68)}${RESET}\n`);

    hits.forEach((r, i) => {
      const type = normalizeType(r.entry.type);
      console.log(`  ${BOLD}${i + 1}.${RESET} ${typeCode(type)}[${type}]${RESET} ${r.entry.title}`);
      console.log(`     ${DIM}${r.project.name} · ${timeAgo(r.entry.createdAt)} · ${r.matchType === 'pattern' ? 'exact match' : similarityLabel(r.similarity)}${RESET}`);
      if (r.entry.errorPattern) console.log(`     ${DIM}error:${RESET} ${r.entry.errorPattern.slice(0, 100)}`);
      for (const line of wrap(r.entry.content.slice(0, 400), 70)) console.log(`     ${line}`);
      console.log();
    });

    const matched = hits.map(r => r.entry.id);
    bumpRetrievalCounts(matched, project?.id).catch(() => {});
    // `run` only looks anything up because the wrapped command failed, so every
    // hit here is a failure caught, exactly as in the PostToolUse hook.
    bumpRecallCounts(matched).catch(() => {});
    console.log(`${DIM}${'─'.repeat(W)}${RESET}\n`);
  } catch {
    // A memory lookup must never add noise to a failing build.
  } finally {
    // Exit explicitly rather than waiting for the event loop to drain. An
    // abandoned lookup leaves an in-flight HTTP request and an open database
    // connection behind, and Node would sit on them long after the deadline —
    // turning a "give up quietly" into the hang it was meant to prevent.
    //
    // Deliberately no closeDb() here: closing the driver while a request is
    // still in flight trips a libuv assertion on Windows
    // (!(handle->flags & UV_HANDLE_CLOSING) in win/async.c). Exiting releases
    // the socket anyway, and this process is ending regardless.
    process.exit(code);
  }
}

async function handleSearch(query: string): Promise<void> {
  if (!query.trim()) return;
  const s = spin('Searching...');
  try {
    const cwd      = process.cwd();
    const repoRoot = getRepoRoot(cwd) ?? cwd;
    const [queryEmbedding, classification, allEntries, currentProject] = await Promise.all([
      // No AI service, or it failed: an empty vector makes preciseSearch rank by keywords.
      getEmbedding(query).catch(() => [] as number[]),
      classifyQuery(query).catch(() => ({ category: 'other' as const, errorPattern: undefined })),
      getAllEntriesWithProjects(),
      getProjectByPath(repoRoot),
    ]);
    s.stop();

    const results = preciseSearch(query, queryEmbedding, allEntries, {
      category: classification.category,
      topK: 8,
    });

    if (results.length === 0) {
      console.log(`\n  ${YELLOW}No matches found${RESET} for "${query}"\n`);
      return;
    }

    bumpRetrievalCounts(results.map(r => r.entry.id), currentProject?.id).catch(() => {});

    const catLabel = classification.category !== 'other'
      ? `  ${DIM}[${classification.category}]${RESET}` : '';
    console.log(`\n  ${bold('Results for:')} "${query}"${catLabel}\n`);

    results.forEach((r, i) => {
      const typeColor  = typeCode(r.entry.type);
      const matchColor = r.matchType === 'pattern' ? GREEN : r.similarity >= 0.82 ? GREEN : r.similarity >= 0.72 ? YELLOW : DIM;
      const matchLabel = r.matchType === 'pattern' ? `${GREEN}pattern match${RESET}` : similarityLabel(r.similarity);
      const confBadge  = r.entry.confidence === 'confirmed' ? ` ${GREEN}✓${RESET}` : r.entry.confidence === 'corroborated' ? ` ${YELLOW}~${RESET}` : '';
      const catBadge   = r.categoryMatch ? ` ${CYAN}[${r.entry.category}]${RESET}` : '';
      const xpBadge    = (r.entry.seenInProjects?.length ?? 0) >= 2 ? ` ${YELLOW}×${r.entry.seenInProjects!.length} projects${RESET}` : '';
      console.log(`  ${BOLD}${i + 1}.${RESET} ${r.entry.title}${confBadge}${xpBadge}`);
      console.log(`     ${typeColor}[${r.entry.type}]${RESET}  ${matchColor}${matchLabel}${RESET}${catBadge}  ${dim(r.project.name)}  ${dim(timeAgo(r.entry.createdAt))}`);
      if (r.entry.errorPattern)   console.log(`     ${DIM}pattern: ${r.entry.errorPattern.slice(0, 80)}${RESET}`);
      if (r.entry.causeArchetype) console.log(`     ${DIM}archetype: ${r.entry.causeArchetype.slice(0, 100)}${RESET}`);
      console.log(`     ${DIM}→${RESET} ${r.entry.content}`);
      if (r.entry.tags.length) console.log(`     ${dim('tags: ' + r.entry.tags.join(', '))}`);
      console.log();
    });
  } catch (err: unknown) {
    s.fail('Search failed');
    reportError(err);
  }
}

// Derived from the type registry, plus legacy aliases so `solution:` keeps working
// and normalises to `fix`. A hand-maintained list here is how the CLI, the
// dashboard and the extraction prompts drifted into four different taxonomies.
const PREFIXES: Record<string, Entry['type']> = Object.fromEntries(
  ENTRY_TYPES.flatMap(spec => [
    [`${spec.type}:`, spec.type],
    ...(spec.aliases ?? []).map(alias => [`${alias}:`, spec.type] as const),
  ]),
) as Record<string, Entry['type']>;

function parseQuickSave(text: string): { type: Entry['type']; content: string } {
  const lower = text.trimStart().toLowerCase();
  for (const [prefix, type] of Object.entries(PREFIXES)) {
    if (lower.startsWith(prefix)) {
      return { type, content: text.trimStart().slice(prefix.length).trim() };
    }
  }
  return { type: 'note', content: text.trim() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleNote(text: string, inq?: any): Promise<void> {
  if (!text.trim()) return;
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  let project = await getProjectByPath(repoRoot);
  if (!project) {
    project = { id: nanoid(), name: getProjectName(repoRoot), path: repoRoot, stack: detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now() };
    await upsertProject(project);
  }
  const { type, content } = parseQuickSave(text);
  const s = spin('Saving...');
  try {
    let embedding: number[] | undefined;
    try { embedding = await getEmbedding(content); } catch {}

    // ── replication + supersession detection (interactive only) ───────────────
    if (inq && embedding) {
      const allEntries = await getAllEntriesWithProjects();

      // Check for near-duplicate entries of the same type (Trail: replication detection)
      const sameType = allEntries.filter(e => e.type === type && !e.supersededBy);
      const nearDupes = findSimilar(embedding, sameType, 3, 0.86);

      if (nearDupes.length > 0) {
        const top = nearDupes[0];
        s.stop();
        const confLabel = top.entry.confidence === 'confirmed' ? ` ${GREEN}[confirmed]${RESET}` : top.entry.confidence === 'corroborated' ? ` ${YELLOW}[corroborated]${RESET}` : '';
        console.log(`\n  ${YELLOW}Similar ${type} found${RESET}${confLabel}`);
        console.log(`  ${DIM}→${RESET} ${top.entry.title.slice(0, 80)}`);
        console.log();
        const { action } = await inq.prompt([{
          type: 'list', name: 'action',
          message: 'Reinforce existing entry or save as new?',
          prefix: ' ',
          choices: [
            { name: `${GREEN}Reinforce${RESET}  ${DIM}boost confidence on existing entry${RESET}`, value: 'reinforce' },
            { name: `${CYAN}Save new${RESET}    ${DIM}keep both as separate observations${RESET}`, value: 'new' },
          ],
        }]);
        if (action === 'reinforce') {
          await reinforceEntry(top.entry.id);
          const conf = top.entry.confidence === 'confirmed' ? 'confirmed' :
                       top.entry.confidence === 'corroborated' ? 'confirmed' : 'corroborated';
          console.log(`  ${GREEN}✓${RESET} Reinforced  ${DIM}[${type}] → ${conf}${RESET}\n`);
          return;
        }
        const newS = spin('Saving...');
        await insertEntry({ id: nanoid(), projectId: project.id, type, title: clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
        newS.succeed(`Saved  ${DIM}[${type}]${RESET}`);
        console.log();
        return;
      }

      // For decisions: check for related-but-distinct entries that might be superseded
      if (type === 'decision') {
        const existingDecisions = allEntries.filter(e => e.type === 'decision' && !e.supersededBy);
        const related = findSimilar(embedding, existingDecisions, 3, 0.72);
        if (related.length > 0) {
          const top = related[0];
          s.stop();
          console.log(`\n  ${MAGENTA}Related decision found${RESET}`);
          console.log(`  ${DIM}→${RESET} ${top.entry.title.slice(0, 80)}`);
          console.log();
          const { action } = await inq.prompt([{
            type: 'list', name: 'action',
            message: 'Does this new decision supersede the old one?',
            prefix: ' ',
            choices: [
              { name: `${MAGENTA}Supersede${RESET}  ${DIM}mark old as superseded, save new as current${RESET}`, value: 'supersede' },
              { name: `${CYAN}Independent${RESET}  ${DIM}save as a separate decision${RESET}`, value: 'new' },
            ],
          }]);
          if (action === 'supersede') {
            const newId = nanoid();
            await insertEntry({ id: newId, projectId: project.id, type, title: clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
            await supersedeEntry(top.entry.id, newId);
            console.log(`  ${GREEN}✓${RESET} Saved new decision  ${DIM}old marked superseded${RESET}\n`);
            return;
          }
          const newS = spin('Saving...');
          await insertEntry({ id: nanoid(), projectId: project.id, type, title: clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
          newS.succeed(`Saved  ${DIM}[${type}]${RESET}`);
          console.log();
          return;
        }
      }
      s.stop();
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Non-interactive `devbrain note` — the command DEV_CONTEXT.md gives agents.
    // The block above only runs in the REPL, where a human can be asked; with no
    // human there was no check at all, so an agent saving the same insight twice
    // stored it twice.
    // "<title> — <cause and fix>" is the shape agents are asked to write: the
    // title is the searchable statement, so keep it apart from the detail.
    const dash = content.search(/\s[—–]\s|\s--\s/);
    const title = clip(dash > 10 ? content.slice(0, dash) : content, 120);
    // The body is the detail only. Storing the whole string here repeated the
    // title at the head of every entry, so each one had to be read twice.
    const detail = dash > 10
      ? content.slice(dash).replace(/^\s*(?:[—–]|--)\s*/, '').trim()
      : content;

    // With no embedding (no AI configured), compare titles instead.
    const known = !inq && (embedding
      ? await isDuplicateEntry(embedding, project.id)
      : !!(await findTextDuplicate(title, project.id).catch(() => null)));
    if (known) {
      s.stop();
      console.log(`  ${DIM}Already known — near-duplicate of an existing entry, not saved.${RESET}\n`);
      return;
    }

    await insertEntry({ id: nanoid(), projectId: project.id, type, title, content: detail, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
    if (inq) {
      console.log(`  ${GREEN}✓${RESET} Saved  ${DIM}[${type}]${RESET}\n`);
    } else {
      s.succeed(`Saved  ${DIM}[${type}]${RESET}`);
      console.log();
    }
  } catch (err) {
    s.fail('Failed to save');
    reportError(err);
  }
}


/** Read all of stdin as text. Resolves empty if stdin closes with nothing. */
function readStdin(): Promise<string> {
  return new Promise(resolve => {
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', () => resolve(buf));
  });
}

/** Soft-wrap prose to a column width for terminal output. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// ─── project dossier ──────────────────────────────────────────────────────────

/**
 * Everything known about one project, in one place: identity, stack, then every
 * entry grouped by section. Unlike `context` this truncates nothing — it is the
 * answer to "show me this project and what we learned in it".
 */
async function handleProject(nameArg?: string, opts: { write?: boolean } = {}): Promise<void> {
  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;

  const projects = await getAllProjects();
  if (projects.length === 0) {
    console.log(`\n  ${YELLOW}No projects registered yet.${RESET} Run ${CYAN}devbrain init${RESET} in a repo.\n`);
    return;
  }

  let project = null as (typeof projects)[number] | null;
  if (nameArg?.trim()) {
    const q = nameArg.trim().toLowerCase();
    const matches = projects.filter(p => p.name.toLowerCase().includes(q));
    if (matches.length === 0) {
      console.log(`\n  ${YELLOW}No project matching${RESET} "${nameArg.trim()}"\n`);
      console.log(`  ${DIM}Known projects:${RESET} ${projects.map(p => p.name).join(', ')}\n`);
      return;
    }
    if (matches.length > 1) {
      console.log(`\n  ${YELLOW}Several projects match${RESET} "${nameArg.trim()}"\n`);
      matches.forEach(p => console.log(`  ${CYAN}${p.name}${RESET}  ${DIM}${p.path}${RESET}`));
      console.log();
      return;
    }
    project = matches[0];
  } else {
    project = projects.find(p => p.path === repoRoot) ?? null;
    if (!project) {
      console.log(`\n  ${YELLOW}This directory isn't a registered project.${RESET}\n`);
      console.log(`  ${DIM}Run ${RESET}${CYAN}devbrain init${RESET}${DIM} here, or name one:${RESET}`);
      projects.forEach(p => console.log(`  ${CYAN}devbrain project ${p.name}${RESET}  ${DIM}${p.path}${RESET}`));
      console.log();
      return;
    }
  }

  const all     = await getAllEntriesWithProjects();
  const dossier = buildDossier(project, all);

  if (opts.write) {
    const outDir = join(devbrainDir, 'projects', project.name.replace(/[^\w.-]+/g, '-'));
    mkdirSync(outDir, { recursive: true });
    const files = dossierFiles(dossier);
    for (const f of files) writeFileSync(join(outDir, f.path), f.contents, 'utf-8');
    console.log(`\n  ${GREEN}✓${RESET} Wrote ${files.length} file${files.length === 1 ? '' : 's'} for ${bold(project.name)}`);
    files.forEach(f => console.log(`  ${DIM}${join(outDir, f.path)}${RESET}`));
    console.log();
    openPath(outDir);
    return;
  }

  // Terminal rendering: the same structure as the Markdown, with colour.
  console.log();
  console.log(`  ${BOLD}${CYAN}${project.name}${RESET}`);
  console.log(`  ${DIM}Stack   ${RESET}${project.stack.join(' · ') || 'not detected'}`);
  console.log(`  ${DIM}Path    ${RESET}${project.path}`);
  console.log(`  ${DIM}Memory  ${RESET}${dossier.total} ${dossier.total === 1 ? 'entry' : 'entries'}`
    + (dossier.lastEntryAt ? `  ${DIM}· last ${timeAgo(dossier.lastEntryAt)}${RESET}` : '')
    + (dossier.supersededCount ? `  ${DIM}· ${dossier.supersededCount} superseded${RESET}` : ''));

  if (dossier.total === 0) {
    console.log(`\n  ${DIM}Nothing recorded yet. Ask your coding agent to ${RESET}${CYAN}run devbrain backfill${RESET}${DIM} and save what matters.${RESET}\n`);
    return;
  }

  console.log();
  for (const section of dossier.sections) {
    console.log(`  ${BOLD}${section.heading}${RESET}  ${DIM}(${section.entries.length})${RESET}`);
    for (const entry of section.entries.slice(0, 8)) {
      const type  = normalizeType(entry.type);
      const title = entry.title.length > 66 ? `${entry.title.slice(0, 66)}…` : entry.title;
      const flags = entry.supersededBy ? ` ${YELLOW}[superseded]${RESET}` : '';
      console.log(`    ${typeDot(type)} ${title}${flags}  ${DIM}${timeAgo(entry.createdAt)}${RESET}`);
    }
    if (section.entries.length > 8) {
      console.log(`    ${DIM}… ${section.entries.length - 8} more${RESET}`);
    }
    console.log();
  }

  console.log(`  ${DIM}Full write-up: ${RESET}${CYAN}devbrain project${nameArg ? ` ${nameArg}` : ''} --write${RESET}${DIM} (one .md per section)${RESET}\n`);
}

// ─── context ──────────────────────────────────────────────────────────────────

async function handleContext(query?: string): Promise<void> {
  const cwd       = process.cwd();
  const repoRoot  = getRepoRoot(cwd) ?? cwd;
  const project   = await getProjectByPath(repoRoot);
  const all       = await getAllEntriesWithProjects();

  const s = query ? spin('Building context...') : undefined;

  let queryEmbedding: number[] | undefined;
  if (query?.trim()) {
    // Without an embedding, buildContext ranks by keywords instead. A missing
    // or rate-limited AI service must not cost the agent its context.
    queryEmbedding = await getEmbedding(query).catch(() => undefined);
  }

  s?.stop();

  const ctx  = buildContext(all, project ?? null, queryEmbedding, query);
  const text = formatContext(ctx, query);

  const retrievedIds = [
    ...ctx.issues, ...ctx.decisions, ...ctx.patterns, ...ctx.antiPatterns, ...ctx.stacks,
    ...(ctx.crossProjectPatterns ?? []),
  ].map(r => r.entry.id);
  bumpRetrievalCounts(retrievedIds, project?.id).catch(() => {});

  console.log();
  // Print with ANSI highlights
  for (const line of text.split('\n')) {
    if (line.startsWith('# '))        console.log(`${BOLD}${CYAN}${line}${RESET}`);
    else if (line.startsWith('## '))  console.log(`\n${BOLD}${line}${RESET}`);
    else if (line.startsWith('## Cross-Project'))  console.log(`\n${BOLD}${YELLOW}${line}${RESET}`);
    else if (line.startsWith('## Anti-Patterns'))  console.log(`\n${BOLD}${'\x1b[91m'}${line}${RESET}`);
    else if (/^\d+\. \[bug\]/.test(line))          console.log(`  ${RED}${line}${RESET}`);
    else if (/^\d+\. \[fix\]/.test(line))          console.log(`  ${GREEN}${line}${RESET}`);
    else if (/^\d+\. \[/.test(line))               console.log(`  ${CYAN}${line}${RESET}`);
    else if (line.startsWith('- '))        console.log(`  ${DIM}${line}${RESET}`);
    else if (line.startsWith('   → '))     console.log(`  ${line}`);
    else if (line.startsWith('   tags:'))  console.log(`  ${DIM}${line}${RESET}`);
    else if (line.startsWith('   '))       console.log(`  ${DIM}${line}${RESET}`);
    else console.log(line);
  }
  console.log();

  if (project) {
    const siblingRecent = all
      .filter(e => e.projectId !== project.id && !e.supersededBy)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
    if (siblingRecent.length > 0) {
      console.log(`${BOLD}${YELLOW}📢 Team Updates (from Sibling Projects)${RESET}`);
      siblingRecent.forEach(e => {
        const typeColor = typeCode(e.type);
        console.log(`  • ${typeColor}[${e.type}]${RESET} ${e.title} ${DIM}(${e.project.name} · ${timeAgo(e.createdAt)})${RESET}`);
        console.log(`    ${DIM}→ ${e.content.slice(0, 100)}${e.content.length > 100 ? '...' : ''}${RESET}`);
      });
      console.log();
    }
  }
}

// ─── browse ───────────────────────────────────────────────────────────────────

function showEntryDetail(entry: Entry & { project: Project }): void {
  const typeColor = typeCode(entry.type);
  const sep = `${DIM}${'─'.repeat(62)}${RESET}`;
  const confBadge = entry.confidence === 'confirmed' ? `  ${GREEN}✓ confirmed${RESET}` :
                    entry.confidence === 'corroborated' ? `  ${YELLOW}~ corroborated${RESET}` : '';
  console.log(`\n  ${sep}`);
  console.log(`  ${typeColor}${BOLD} ${entry.type.toUpperCase()} ${RESET}  ${BOLD}${entry.project.name}${RESET}  ${dim(entry.project.stack.join(', '))}  ${dim(timeAgo(entry.createdAt))}${confBadge}`);
  if (entry.tags.length) console.log(`  ${dim('tags: ' + entry.tags.join(', '))}`);
  if (entry.supersededBy) console.log(`  ${YELLOW}[SUPERSEDED]${RESET}`);
  console.log(`  ${sep}`);

  if (entry.type === 'image') {
    console.log(`\n  ${BOLD}Image Path${RESET}`);
    console.log(`  ${CYAN}${entry.title}${RESET}\n`);
    if (entry.content && entry.content !== entry.title) {
      console.log(`  ${BOLD}Description${RESET}`);
      console.log(`  ${entry.content}\n`);
    }
  } else {
    console.log(`\n  ${BOLD}Problem${RESET}`);
    console.log(`  ${entry.title}\n`);
    console.log(`  ${BOLD}Solution${RESET}`);
    const words = entry.content.split(' ');
    let line_ = '  ';
    for (const word of words) {
      if (line_.length + word.length > 62) { console.log(line_); line_ = '  ' + word + ' '; }
      else line_ += word + ' ';
    }
    if (line_.trim()) console.log(line_);
  }
  console.log(`\n  ${sep}\n`);
}

async function handleBrowse(inquirer: unknown): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inq = inquirer as any;
  const all = await getAllEntriesWithProjects();

  if (all.length === 0) {
    console.log(`\n  ${YELLOW}No entries yet.${RESET} Make commits or add notes to start building your knowledge base.\n`);
    return;
  }

  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
  let browsing = true;

  while (browsing) {
    const choices = [
      ...sorted.map((e, i) => {
        const typeColor = typeCode(e.type);
        const title = e.title.length > 50 ? e.title.slice(0, 50) + '…' : e.title.padEnd(51);
        const badge = e.confidence === 'confirmed' ? `${GREEN}✓${RESET} ` : e.confidence === 'corroborated' ? `${YELLOW}~${RESET} ` : '  ';
        const imgIcon = e.type === 'image' ? '📷 ' : '';
        return {
          name: `${typeColor}${e.type.padEnd(8)}${RESET} ${badge}${imgIcon}${title}  ${dim(e.project.name + ' · ' + timeAgo(e.createdAt))}`,
          value: i,
        };
      }),
      { name: `${DIM}← Back${RESET}`, value: -1 },
    ];

    let idx: number;
    try {
      const res = await inq.prompt([{
        type: 'list',
        name: 'idx',
        message: `Browse  ${dim(sorted.length + ' entries')}`,
        choices,
        pageSize: 14,
      }]);
      idx = res.idx;
    } catch { break; }

    if (idx === -1) { browsing = false; break; }

    clr();
    const selected = sorted[idx];
    showEntryDetail(selected);

    const actionChoices = [
      { name: '← Back to list', value: 'list' },
      ...(selected.type === 'image'
        ? [{ name: `${CYAN}📷 Open image${RESET}`, value: 'open-image' }]
        : []),
      { name: `${DIM}Main menu${RESET}`, value: 'menu' },
    ];

    let next: string;
    try {
      const res = await inq.prompt([{
        type: 'list',
        name: 'next',
        message: 'What next?',
        choices: actionChoices,
      }]);
      next = res.next;
    } catch { break; }

    if (next === 'menu') { browsing = false; }
    else if (next === 'open-image') {
      openPath(selected.content || selected.title);
      clr();
    }
    else { clr(); }
  }
}

async function handleDelete(inquirer: unknown): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inq = inquirer as any;
  const all = await getAllEntriesWithProjects();
  const active = all.filter(e => !e.supersededBy).sort((a, b) => b.createdAt - a.createdAt);

  if (active.length === 0) {
    console.log(`\n  ${YELLOW}No entries to delete.${RESET}\n`);
    return;
  }

  let idx: number;
  try {
    const choices = [
      ...active.map((e, i) => ({
        name: `${typeCode(e.type)}[${e.type}]${RESET} ${e.title.slice(0, 55).padEnd(56)} ${dim(e.project.name + ' · ' + timeAgo(e.createdAt))}`,
        value: i,
      })),
      { name: `${DIM}← Cancel${RESET}`, value: -1 },
    ];
    const res = await inq.prompt([{ type: 'list', name: 'idx', message: 'Select entry to delete:', choices, pageSize: 14 }]);
    idx = res.idx;
  } catch { return; }

  if (idx === -1) return;
  const selected = active[idx];

  console.log(`\n  ${RED}${BOLD}${selected.title.slice(0, 80)}${RESET}`);
  console.log(`  ${DIM}[${selected.type}] · ${selected.project.name} · ${timeAgo(selected.createdAt)}${RESET}\n`);

  try {
    const { confirm } = await inq.prompt([{
      type: 'confirm', name: 'confirm',
      message: 'Delete this entry?',
      default: false, prefix: ' ',
    }]);
    if (!confirm) { console.log(`  ${DIM}Cancelled.${RESET}\n`); return; }
  } catch { return; }

  await deleteEntry(selected.id);
  console.log(`  ${GREEN}✓${RESET} Deleted\n`);
}

// ─── interactive mode ─────────────────────────────────────────────────────────





// ─── first-run onboarding ─────────────────────────────────────────────────────

async function runOnboarding(): Promise<void> {
  // The wizard is all prompts. Without a TTY (CI, a piped script, an agent
  // shelling out) inquirer's readline closes on EOF and Node dies with an
  // unhandled ERR_USE_AFTER_CLOSE, so print the manual path and stop instead.
  if (!process.stdin.isTTY) {
    console.log(`\n  ${YELLOW}Setup needs an interactive terminal.${RESET}\n`);
    console.log(`  ${DIM}Nothing is required to start — memory defaults to ${RESET}${getLocalDbPath()}${DIM}.${RESET}`);
    console.log(`  ${DIM}Commands that save and recall notes already work.${RESET}\n`);
    console.log(`  Optional, in ${DIM}${envFilePath}${RESET}:`);
    console.log(`    ${CYAN}GEMINI_API_KEY${RESET}=...              ${DIM}# semantic search instead of keywords${RESET}`);
    console.log(`    ${CYAN}MONGODB_URI${RESET}=mongodb+srv://...   ${DIM}# optional — share memory across a team${RESET}\n`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const _inq: any = require('inquirer');
  const inq = typeof _inq.prompt === 'function' ? _inq : _inq.default;

  clr();
  console.log(BANNER);
  console.log(`\n  ${BOLD}Welcome to DevBrain.${RESET} Let's get you set up — takes about 30 seconds.\n`);

  const stageHeader = (n: number, total: number, label: string) =>
    `  ${BOLD}${CYAN}[${n}/${total}]${RESET}  ${BOLD}${label}${RESET}`;

  // ── Stage 1: Storage ──────────────────────────────────────────────────────
  // Local is the default so setup can't strand anyone. MongoDB is the upgrade
  // you pick when you want a team to share one memory.
  console.log(stageHeader(1, 3, 'Storage'));

  if (hasMongoUri()) {
    console.log(`  ${GREEN}✓${RESET} MongoDB already configured ${DIM}(MONGODB_URI is set)${RESET}\n`);
  } else {
    const { store } = await inq.prompt([{
      type: 'list', name: 'store', prefix: ' ',
      message: 'Where should DevBrain keep your memory?',
      choices: [
        { name: `${GREEN}This machine${RESET}  ${DIM}a JSON file in ~/.devbrain — no setup, works now${RESET}`, value: 'local' },
        { name: `${CYAN}MongoDB${RESET}       ${DIM}share one memory across a team or machines${RESET}`, value: 'mongo' },
      ],
    }]);

    if (store === 'mongo') {
      console.log(`\n  ${DIM}${RESET}${CYAN}https://cloud.mongodb.com${RESET}${DIM} → create a free cluster → Connect → copy the string${RESET}\n`);
      const { uri } = await inq.prompt([{
        type: 'password', name: 'uri', prefix: ' ',
        message: 'Paste your MongoDB connection string (or press Enter to stay local):',
        validate: (v: string) =>
          !v?.trim() || /^mongodb(\+srv)?:\/\//.test(v.trim())
            ? true
            : 'That does not look like a connection string — it should start with mongodb:// or mongodb+srv://',
      }]);
      if (uri?.trim()) {
        writeEnvVars({ MONGODB_URI: uri.trim() });
        process.env.MONGODB_URI = uri.trim();
        console.log(`  ${GREEN}✓${RESET} Saved to ${DIM}${envFilePath}${RESET}\n`);
      } else {
        console.log(`  ${DIM}Staying local — ${RESET}${CYAN}${getLocalDbPath()}${RESET}\n`);
      }
    } else {
      console.log(`  ${GREEN}✓${RESET} Local storage — ${DIM}${getLocalDbPath()}${RESET}`);
      console.log(`     ${DIM}Switch later by adding MONGODB_URI to ${envFilePath}${RESET}\n`);
    }
  }

  // ── Stage 2: semantic search (optional) ───────────────────────────────────
  // Nothing in DevBrain needs a model: the coding agent writes every entry and
  // search matches keywords. A Gemini key only upgrades search to meaning.
  console.log(stageHeader(2, 3, 'Semantic Search (optional)'));
  console.log(`  ${DIM}DevBrain needs no AI — your coding agent writes every entry, and search matches keywords.${RESET}`);
  console.log(`  ${DIM}A Gemini key adds semantic search: matching by meaning, not just words.${RESET}\n`);

  if (isMockMode()) {
    console.log(`  ${GREEN}✓${RESET} Mock mode (DEVBRAIN_MOCK=true) — no Gemini calls will be made\n`);
  } else if (hasVertexCreds()) {
    console.log(`  ${GREEN}✓${RESET} Vertex AI configured (project ${process.env.GOOGLE_CLOUD_PROJECT})\n`);
  } else if (hasGeminiCreds()) {
    console.log(`  ${GREEN}✓${RESET} Gemini API key already set\n`);
  } else {
    const { apiKey } = await inq.prompt([{
      type: 'password',
      name: 'apiKey',
      message: 'Gemini API key (press Enter to skip — you can add one later):',
      prefix: ' ',
    }]);
    if (apiKey?.trim()) {
      writeEnvVars({ GEMINI_API_KEY: apiKey.trim() });
      process.env.GEMINI_API_KEY = apiKey.trim();
      console.log(`  ${GREEN}✓${RESET} Saved to ${DIM}${envFilePath}${RESET}\n`);
    } else {
      console.log(`  ${GREEN}✓${RESET} Keyword search ${DIM}— add GEMINI_API_KEY to ${envFilePath} anytime${RESET}\n`);
    }
  }

  // Settings are on disk, so this run counts as onboarded. Recorded before the
  // stage that touches the database: if it is unreachable we must not relaunch
  // this wizard on every invocation.
  markOnboarded();

  // ── Stage 3: this project ─────────────────────────────────────────────────
  // Exactly what `devbrain init` does — one implementation, not a second copy.
  console.log(stageHeader(3, 3, 'This Project'));
  const repoRoot = getRepoRoot(process.cwd()) ?? process.cwd();
  console.log(`  ${DIM}Detected: ${RESET}${BOLD}${getProjectName(repoRoot)}${RESET}  ${DIM}${repoRoot}${RESET}\n`);

  const { regProject } = await inq.prompt([{
    type: 'confirm', name: 'regProject',
    message: 'Set up DevBrain for this project?',
    default: true, prefix: ' ',
  }]);
  if (regProject) {
    await handleInit();
  } else {
    console.log(`  ${DIM}Skipped — run ${RESET}${CYAN}devbrain init${RESET}${DIM} in any project to set it up.${RESET}\n`);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  const W = Math.min(process.stdout.columns || 80, 80);
  const storage = describeStorage();
  console.log(`${DIM}${'─'.repeat(W)}${RESET}`);
  console.log(`\n  ${GREEN}${BOLD}DevBrain is ready.${RESET}\n`);

  console.log(`  ${BOLD}Where your data lives${RESET}`);
  console.log(`  ${DIM}Memory    ${RESET}${storage.location}${storage.kind === 'local' ? ` ${DIM}(local)${RESET}` : ''}`);
  console.log(`  ${DIM}Config    ${RESET}${envFilePath}\n`);

  if (!hasGeminiCreds()) {
    console.log(`  ${DIM}Search matches keywords. For semantic search, add GEMINI_API_KEY to ${envFilePath}.${RESET}\n`);
  }

  console.log(`  ${BOLD}Quick reference${RESET}`);
  console.log(`  ${CYAN}bug: <text>${RESET}   save a bug instantly`);
  console.log(`  ${CYAN}fix: <text>${RESET}   save a fix instantly`);
  console.log(`  ${CYAN}/<command>${RESET}    type / to see all commands`);
  console.log(`  ${CYAN}devbrain setup${RESET} re-run this wizard anytime\n`);

  console.log(`${DIM}${'─'.repeat(W)}${RESET}\n`);

  let goNow = true;
  try {
    const res = await inq.prompt([{
      type: 'confirm', name: 'goNow',
      message: 'Open DevBrain now?',
      default: true, prefix: ' ',
    }]);
    goNow = res.goNow;
  } catch { goNow = false; }

  if (goNow) clr();
}

// ─── interactive REPL ────────────────────────────────────────────────────────

const COMMANDS = [
  { value: '/search',  desc: 'Search memory — exact error text works best'        },
  { value: '/context', desc: 'Ranked project history, as an agent sees it'         },
  { value: '/project', desc: 'Everything saved about this project'                },
  { value: '/browse',  desc: 'Scroll through all saved entries'                   },
  { value: '/save',    desc: 'Save entry  (fix: decision: lesson: bug: stack: ...)'},
  { value: '/delete',  desc: 'Delete an entry'                                    },
  { value: '/backfill',desc: 'Unreviewed commits and sessions, for your agent'    },
  { value: '/init',    desc: 'Register this project + Claude Code hooks'          },
  { value: '/clear',   desc: 'Clear the screen'                                   },
  { value: '/exit',    desc: 'Quit DevBrain'                                      },
];

async function runCommand(cmd: string, arg: string, inquirer: unknown): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inq = inquirer as any;
  switch (cmd) {
    case '/search': {
      let q = arg;
      if (!q) {
        try {
          const { query } = await inq.prompt([{ type: 'input', name: 'query', message: '🔍 Search:' }]);
          q = query;
        } catch { return true; }
      }
      await handleSearch(q);
      break;
    }
    case '/context': {
      await handleContext(arg || undefined);
      break;
    }
    case '/save': {
      let text = arg;
      if (!text) {
        process.stdout.write(`  ${DIM}Prefixes: bug: fix: stack: decision: pattern: lesson:${RESET}\n`);
        try {
          const { note } = await inq.prompt([{ type: 'input', name: 'note', message: '📝 Save:' }]);
          text = note;
        } catch { return true; }
      }
      await handleNote(text, inq);
      break;
    }
    case '/delete':  await handleDelete(inq);  break;
    case '/backfill': await handleBackfill(arg ? arg.split(/\s+/) : []); break;
    case '/init':    await handleInit();       break;
    case '/project': await handleProject(arg || undefined); break;
    case '/browse':  await handleBrowse(inq);  break;
    case '/clear':   clr(); await printProjectContext(); break;
    case '/exit': case '/quit':
      console.log(`  ${DIM}See you later.${RESET}\n`);
      process.exit(0);
      break;
    default:
      console.log(`  ${YELLOW}Unknown command.${RESET} Type / and press Enter to see all commands.\n`);
  }
  return true;
}

async function handleInteractive(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const _inq: any = require('inquirer');
  const inquirer  = typeof _inq.prompt === 'function' ? _inq : _inq.default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const _ac: any  = require('inquirer-autocomplete-prompt');
  inquirer.registerPrompt('autocomplete', typeof _ac === 'function' ? _ac : _ac.default);

  await printProjectContext();

  const W   = Math.min(process.stdout.columns || 80, 80);
  const sep = `${DIM}${'─'.repeat(W)}${RESET}`;

  let entryPool = await getAllEntriesWithProjects();

  // The bottom border is the first dropdown row so both lines frame the input
  // while typing — top line (console.log) + input + bottom line = a bordered
  // box, like other terminal agents.
  //
  // It MUST be an inquirer Separator, not a choice. As a plain choice it was the
  // first *selectable* row, so Enter submitted the border instead of the command
  // you typed — the action was there but you had to arrow past the border to
  // reach it. Separators are excluded from selection, so the real action is
  // highlighted first and Enter fires it directly.
  const botSep = new inquirer.Separator(sep);

  while (true) {
    let submitted: string;
    try {
      console.log(sep);
      const { value } = await inquirer.prompt([{
        type:        'autocomplete',
        name:        'value',
        message:     `${CYAN}devbrain${RESET}`,
        prefix:      '',
        suggestOnly: false,
        pageSize:    10,
        source: async (_: unknown, typed: string = '') => {
          const t = typed.trimStart();

          // empty → bottom border + hint
          if (t === '') {
            return [
              botSep,
              { name: `${DIM}type to search  ·  / for commands${RESET}`, value: '__hint__', short: '' },
            ];
          }

          // slash → bottom border + matching command list
          if (t.startsWith('/')) {
            // "/search auth token" — a command with an argument. Offer it verbatim
            // so Enter runs it with the argument, rather than matching nothing and
            // falling back to the full list (which silently dropped the argument).
            const spaceAt = t.indexOf(' ');
            if (spaceAt > 0) {
              const name = t.slice(0, spaceAt);
              const rest = t.slice(spaceAt + 1).trim();
              const known = COMMANDS.find(c => c.value === name);
              if (known && rest) {
                return [
                  botSep,
                  {
                    name:  `${CYAN}${name}${RESET} ${rest.slice(0, 50)}  ${DIM}${known.desc}${RESET}`,
                    value: `__cmd__${name} ${rest}`,
                    short: t,
                  },
                ];
              }
            }

            const list = t === '/' ? COMMANDS : COMMANDS.filter(c => c.value.startsWith(t));
            return [
              botSep,
              ...(list.length ? list : COMMANDS).map(c => ({
                name:  `${CYAN}${c.value.padEnd(12)}${RESET}  ${DIM}${c.desc}${RESET}`,
                value: `__cmd__${c.value}`,
                short: c.value,
              })),
            ];
          }

          const rows: { name: string; value: string; short: string }[] = [];
          const hasP = Object.keys(PREFIXES).some(p => t.toLowerCase().startsWith(p));

          if (hasP) {
            const { type, content } = parseQuickSave(t);
            rows.push({ name: `${typeDot(type)} Save [${type}]  ${DIM}${content.slice(0, 55)}${RESET}`, value: `__save__${t}`, short: t });
          } else {
            rows.push({ name: `${CYAN}🔍${RESET}  Search  ${DIM}"${t.slice(0, 55)}"${RESET}`, value: `__search__${t}`, short: t });
          }

          const lc      = t.toLowerCase();
          const matches = entryPool.filter(e => e.title.toLowerCase().includes(lc)).slice(0, 6);
          for (const e of matches) {
            rows.push({
              name:  `${typeDot(e.type)} ${e.title.slice(0, 52).padEnd(53)}  ${DIM}${e.project.name} · ${timeAgo(e.createdAt)}${RESET}`,
              value: `__search__${e.title}`,
              short: e.title,
            });
          }

          // bottom border always first so box is visible while typing
          return [botSep, ...rows];
        },
      }]);
      console.log();
      submitted = value ?? '';
    } catch { break; }

    if (!submitted || submitted === '__hint__' || submitted === '__sep__') continue;

    // Normalize: typing a /command and pressing Enter submits the raw string.
    // Wrap it so it goes through the same dispatch path as a selected item.
    if (submitted.startsWith('/') && !submitted.startsWith('__')) {
      submitted = `__cmd__${submitted}`;
    }

    if (submitted.startsWith('__cmd__')) {
      const cmd = submitted.slice(7);
      const sp  = cmd.indexOf(' ');
      try {
        await runCommand(sp === -1 ? cmd : cmd.slice(0, sp), sp === -1 ? '' : cmd.slice(sp + 1), inquirer);
      } catch { /* ESC in sub-prompt — back to main */ }
    } else if (submitted.startsWith('__save__')) {
      try {
        await handleNote(submitted.slice(8), inquirer);
        entryPool = await getAllEntriesWithProjects();
        console.log(`  ${DIM}Memory: ${entryPool.length} entries${RESET}\n`);
      } catch { /* ESC */ }
    } else if (submitted.startsWith('__search__')) {
      try {
        await handleSearch(submitted.slice(10));
      } catch { /* ESC */ }
    }
  }
}

// ─── entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args    = process.argv.slice(2);
  const command = args[0] ?? '';

  try {
    switch (command) {
      case 'setup':   await runOnboarding();                       break;
      case 'init':    await handleInit();                          break;
      case 'note':    await handleNote(args.slice(1).join(' '));   break;
      case 'search':  await handleSearch(args.slice(1).join(' ')); break;
      case 'context': await handleContext(args.slice(1).join(' ') || undefined); break;
      case 'project': case 'projects': {
        const rest  = args.slice(1).filter(a => a !== '--write');
        const write = args.includes('--write');
        await handleProject(rest.join(' ') || undefined, { write });
        break;
      }
      case 'run':     await handleRun(args.slice(1));              break;
      case 'index':   await handleIndex(args[1]);                  break;
      case 'backfill': await handleBackfill(args.slice(1));        break;
      case 'hooks':   await handleHooks(args.slice(1));            break;
      // Called by Claude Code, not by people. Never fails.
      case 'hook':    await handleHook(args[1] ?? '');             break;
      case 'help': case '--help': case '-h':
        console.log(`\n${BOLD}${CYAN}DevBrain${RESET} — memory your coding agent writes, and reads back\n`);
        console.log(`  ${BOLD}Set up${RESET}`);
        console.log(`  ${CYAN}devbrain setup${RESET}            Storage, optional semantic search, this project`);
        console.log(`  ${CYAN}devbrain init${RESET}             Register a project + Claude Code hooks`);
        console.log(`  ${CYAN}devbrain hooks${RESET} ${MAGENTA}[install]${RESET}  Brief sessions and prompt the agent to save ${DIM}(--global)${RESET}`);
        console.log(`\n  ${BOLD}Write${RESET}`);
        console.log(`  ${CYAN}devbrain note${RESET} ${MAGENTA}"<t>"${RESET}       Save  ${DIM}fix: decision: lesson: bug: stack: …${RESET}`);
        console.log(`  ${CYAN}devbrain backfill${RESET} ${MAGENTA}[n]${RESET}    Unreviewed commits and sessions, for your agent to save from`);
        console.log(`  ${CYAN}devbrain index${RESET} ${MAGENTA}[file]${RESET}     Index CLAUDE.md as a source of truth`);
        console.log(`\n  ${BOLD}Read${RESET}`);
        console.log(`  ${CYAN}devbrain context${RESET} ${MAGENTA}[task]${RESET}  Ranked project history, as an agent sees it`);
        console.log(`  ${CYAN}devbrain search${RESET} ${MAGENTA}<q>${RESET}       Search — exact error text works best`);
        console.log(`  ${CYAN}devbrain project${RESET} ${MAGENTA}[n]${RESET}      Everything saved about a project ${DIM}(--write: one .md per section)${RESET}`);
        console.log(`  ${CYAN}devbrain run${RESET} ${MAGENTA}<cmd>${RESET}        Run a command; on failure, show past fixes`);
        console.log(`\n  ${CYAN}devbrain${RESET}                  Interactive REPL`);
        console.log(`\n  ${DIM}Set DEVBRAIN_DEBUG=1 to see full stack traces on error.${RESET}\n`);
        break;
      default:
        if (command && !command.startsWith('-')) {
          console.log(`\n  ${RED}Unknown command:${RESET} ${command}`);
          console.log(`  ${DIM}Run ${RESET}${CYAN}devbrain --help${RESET}${DIM} to see what's available.${RESET}\n`);
          process.exit(1);
        }
        if (!isOnboarded()) {
          await runOnboarding();
          if (!isOnboarded()) process.exit(1);   // setup skipped or non-interactive
        }
        if (!process.stdin.isTTY) {
          console.log(`\n  ${YELLOW}The DevBrain REPL needs an interactive terminal.${RESET}`);
          console.log(`  ${DIM}Non-interactively, use ${RESET}${CYAN}devbrain context${RESET}${DIM}, ${RESET}${CYAN}devbrain search${RESET}${DIM} or ${RESET}${CYAN}devbrain note${RESET}${DIM}.${RESET}\n`);
          process.exit(1);
        }
        await handleInteractive();
        break;
    }
  } catch (err: unknown) {
    reportError(err);
    await closeDb();
    process.exit(1);
  }

  // An open MongoClient holds the event loop open, so a one-shot command would
  // print its result and then sit there until killed. Release it and exit.
  await closeDb();
}

// Only run the CLI when this file is the process entry point. Calling main() at
// import time meant the whole CLI executed — and could call process.exit — as a
// side effect of importing any helper from this module, which made the file
// impossible to unit test.
if (require.main === module) {
  main();
}
