#!/usr/bin/env node
import 'dotenv/config';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import {
  getProjectByPath, upsertProject, insertEntry,
  getEntriesByProject, getAllEntriesWithProjects,
  isCommitProcessed, markCommitProcessed,
  detectStack, getProjectName, isGitRepo, getRepoRoot,
  getLastCommit, getRecentCommits, countCommits, installGitHook, isHookInstalled,
  extractKnowledge, getEmbedding, summarizeProjectHistory,
  findSimilar, similarityLabel, timeAgo, RateLimitError,
  buildContext, formatContext,
  reinforceEntry, bumpRetrievalCounts, supersedeEntry,
  preciseSearch, classifyQuery, recapSession, deleteEntry,
  describeStorage, getLocalDbPath, closeDb,
  ENTRY_TYPES, normalizeType, getAllProjects,
  buildDossier, formatDossierMarkdown, dossierFiles,
  isDuplicateEntry, getAbandonedSession, describeAbandonedSession, clip,
  parseMarkdownSource, planIndex, entryForSection,
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

// Storage is never missing — DevBrain falls back to a local JSON store — so the
// only credential that can genuinely block a command is Gemini.
type Requirement = 'ai';

// Gate a command on the credentials it needs, so a missing config value produces
// setup guidance instead of an SDK-level exception. Returns false when something
// is missing — callers bail out quietly.
function preflight(...needs: Requirement[]): boolean {
  if (!needs.includes('ai') || hasGeminiCreds()) return true;

  console.log(`\n  ${YELLOW}This command needs Gemini credentials.${RESET}\n`);
  console.log(`  ${RED}✗${RESET} ${bold('Gemini credentials')}  ${DIM}— used for semantic search and auto-capture${RESET}`);
  console.log(`    ${DIM}Free key:${RESET} ${CYAN}https://aistudio.google.com${RESET}`);
  console.log(`    ${DIM}Or set GOOGLE_GENAI_USE_VERTEXAI=true with GOOGLE_CLOUD_PROJECT for Vertex AI.${RESET}`);
  console.log(`    ${DIM}Or set DEVBRAIN_MOCK=true to try DevBrain without any AI calls.${RESET}`);
  console.log(`\n  Run ${CYAN}devbrain setup${RESET} to be walked through it, or add it to ${DIM}${envFilePath}${RESET}\n`);
  console.log(`  ${DIM}Saving notes works without this — try ${RESET}${CYAN}devbrain note "fix: ..."${RESET}\n`);
  return false;
}

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
  const hookOk = isHookInstalled(repoRoot);

  console.log(`  ${bold('Project')}  ${project.name}`);
  console.log(`  ${bold('Stack')}    ${project.stack.join(', ') || 'Unknown'}`);
  console.log(`  ${bold('Hook')}     ${hookOk ? `${GREEN}✓ active${RESET}` : `${YELLOW}✗ not installed${RESET}`}`);
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
  let autoBackfillAfterInit = 0;
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
      installGitHook(repoRoot);
      console.log(`  ${GREEN}✓${RESET} Git hook installed — commits captured automatically`);
      // The hook is forward-looking only, so import what already happened now,
      // rather than telling the user to remember to do it.
      const existingCommits = countCommits(repoRoot);
      if (existingCommits > 0) {
        if (!hasGeminiCreds()) {
          console.log(`  ${CYAN}→${RESET} ${existingCommits} past commit${existingCommits === 1 ? '' : 's'} to import — add Gemini credentials, then run ${CYAN}devbrain backfill${RESET}`);
        } else if (process.env.DEVBRAIN_NO_AUTO_BACKFILL) {
          console.log(`  ${CYAN}→${RESET} ${existingCommits} past commit${existingCommits === 1 ? '' : 's'} available — run ${CYAN}devbrain backfill${RESET} to import them`);
        } else {
          autoBackfillAfterInit = Math.min(existingCommits, BACKFILL_DEFAULT);
          if (existingCommits > BACKFILL_DEFAULT) {
            console.log(`  ${CYAN}→${RESET} ${existingCommits} past commits — importing the most recent ${BACKFILL_DEFAULT} ${DIM}(run ${RESET}${CYAN}devbrain backfill ${existingCommits}${RESET}${DIM} for all)${RESET}`);
          }
        }
      }
    } else {
      console.log(`  ${YELLOW}⚠${RESET}  Not a git repo — add notes manually`);
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
      '# Load ranked engineering history before writing any code:',
      'devbrain context',
      '',
      '# Before debugging — search with the EXACT error text or symptom:',
      'devbrain search "<paste exact error message>"',
      '```',
      '',
      '### Save to DevBrain when you notice any of these signals',
      '',
      'Do not wait to be asked. Save immediately when you think any of these:',
      '',
      '- "That was non-obvious — I would not have known that without digging"',
      '- "This fix took longer than it should have — future me should know this"',
      '- "This behavior is counterintuitive — it looks like X but actually does Y"',
      '- "This pattern would apply to other parts of the codebase too"',
      '- "If I had known this upfront I would have designed it differently"',
      '- "This is a gotcha specific to this stack/environment/version"',
      '- "We decided against the obvious approach — here is why"',
      '- "This error message is misleading — the real cause is something else"',
      '- "This works in dev but will break in production for this exact reason"',
      '',
      '```',
      '# Save anything matching the above signals:',
      'devbrain note "fix: <non-obvious fix + what the root cause actually was>"',
      'devbrain note "lesson: <what looked right but was wrong, and why>"',
      'devbrain note "decision: <what was chosen, what was rejected, and why>"',
      'devbrain note "pattern: <reusable approach that applies beyond this file>"',
      'devbrain note "anti-pattern: <what to never do here and the consequence>"',
      'devbrain note "bug: <the symptom, the misleading surface error, the real cause>"',
      '```',
      '',
      '### What makes a good DevBrain entry',
      '- **Title**: specific and searchable, not generic ("JWT expiry fails in prod" not "auth bug")',
      '- **Body**: include the symptom, the root cause, and the exact fix — not just the fix',
      '- **Error pattern**: if there is an exact error message, always include it verbatim',
      '- **Cause archetype**: name the abstract pattern ("environment config divergence", "missing cleanup in teardown")',
      '',
      '### At the end of every session — write the recap yourself',
      '',
      'Do not ask the user to paste a transcript. You have the session context; you',
      'write the summary and pipe it to DevBrain. Before you finish a session in which',
      'you fixed, decided, or learned anything, run:',
      '',
      '```bash',
      'devbrain recap "<your summary of this session>"',
      '```',
      '',
      'Or pipe a longer write-up on stdin:',
      '',
      '```bash',
      'cat <<\'EOF\' | devbrain recap',
      'Fixed: <symptom> — root cause was <cause>, fixed by <fix>.',
      'Decided: <choice> over <alternative> because <reason>.',
      'Learned: <non-obvious behaviour and why it matters>.',
      'Avoid: <what not to do here and the consequence>.',
      'EOF',
      '```',
      '',
      'Gemini splits that into individual bugs, fixes, decisions and patterns and',
      'saves each one. Write it in those four lines above — concrete, with root causes,',
      'not a narrative of what you did.',
      '',
      '### Rules',
      '- Run `devbrain context` before starting any non-trivial task — no exceptions.',
      '- Run `devbrain search` before debugging any error you have not seen before.',
      '- Save proactively — if you had to think to solve it, save it.',
      '- End every substantive session with `devbrain recap "<summary>"` — unprompted.',
      '- Past commits are imported automatically; you never need to run `devbrain backfill`.',
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
    console.log(`        ${CYAN}"type"${RESET}${DIM}: ${RESET}${GREEN}"http"${RESET}${DIM},${RESET}`);
    console.log(`        ${CYAN}"url"${RESET}${DIM}: ${RESET}${GREEN}"https://devbrain-715714057208.us-central1.run.app/mcp"${RESET}`);
    console.log(`      ${DIM}}${RESET}`);
    console.log(`    ${DIM}}${RESET}`);
    console.log(`  ${DIM}}${RESET}`);
    console.log(`${CYAN}  └────────────────────────────────────────────────────────────────────┘${RESET}\n`);
    console.log(`  ${DIM}Or configure standard stdio host using the DevBrain MCP server binary.${RESET}\n`);
    console.log(bar2);
    console.log();

    if (isNew) {
      printInitInstructions(name, stack, repoRoot);
    }
  } catch (err) {
    s.fail('Init failed');
    reportError(err);
    return;
  }

  // Outside the try: a backfill failure shouldn't read as "init failed".
  if (autoBackfillAfterInit > 0) {
    await handleBackfill(undefined, autoBackfillAfterInit);
  }
}

function printInitInstructions(name: string, stack: string[], repoRoot: string): void {
  const W   = Math.min(process.stdout.columns || 80, 80);
  const bar = `${DIM}${'─'.repeat(W)}${RESET}`;
  const cats = 'auth|database|deployment|build|config|network|performance|ui|data|testing|security|other';
  const stackStr = stack.join(', ') || 'Unknown';

  console.log(`${bar}`);
  console.log(`\n  ${BOLD}${CYAN}Next step — tell your AI Agent (e.g. Gemini / Agent Builder) to set up DevBrain${RESET}\n`);
  console.log(`  ${DIM}Paste the block below into your AI Agent's chat:${RESET}\n`);
  console.log(
`${CYAN}────────────────────────────────── copy from here ──────────────────────────${RESET}
You are setting up DevBrain persistent memory for the project at "${repoRoot}".

Do these two things now:

1. CREATE or APPEND to DEV_CONTEXT.md with this block:

## DevBrain Memory

Project: ${name}  |  Stack: ${stackStr}

### Before every task
- Call \`get_context\` with the task topic before writing any code.
- Call \`search_knowledge\` with the EXACT error text before debugging anything.

### Save to DevBrain when you notice any of these signals (do not wait to be asked)
Save immediately whenever you think:
- "That was non-obvious — I would not have known that without digging"
- "This fix took longer than it should — future me should know this"
- "This behavior is counterintuitive — it looks like X but actually does Y"
- "This pattern would apply to other parts of the codebase too"
- "If I had known this upfront I would have designed it differently"
- "This is a gotcha specific to this stack/environment/version combination"
- "We decided against the obvious approach — here is why"
- "This error message is misleading — the real cause is something else entirely"
- "This works in dev but will silently break in production for this exact reason"

Call \`save_entry\` with:
  type          — bug | fix | decision | pattern | lesson | anti-pattern | stack
  title         — specific and searchable, not generic ("JWT expiry fails in prod" not "auth bug")
  content       — symptom + root cause + exact fix (not just the fix)
  error_pattern — exact verbatim error message if one exists
  cause_archetype — abstract transferable root cause ("environment config divergence", "missing cleanup in teardown")
  category      — auth | database | deployment | build | config | network | performance | ui | data | testing | security | other
  project_path  — "${repoRoot}"

### Rules
- Run \`get_context\` before every non-trivial task — no exceptions.
- Run \`search_knowledge\` before debugging any error you have not seen before.
- Save proactively — if you had to think to solve it, it belongs in DevBrain.

2. SCAN THIS PROJECT and save everything useful to DevBrain now:
   - Read README, package.json / equivalent, key config files, main entry points
   - Save: stack (type "stack"), architectural decisions (type "decision"),
     known patterns (type "pattern"), and any anti-patterns you can infer
   - Call save_entry once per item with project_path: "${repoRoot}"
   - Skip trivial items — only save things that help future engineering decisions
${CYAN}────────────────────────────────── copy to here ────────────────────────────${RESET}
`);
  console.log(`  ${DIM}Run ${CYAN}devbrain /recap${RESET}${DIM} anytime to extract knowledge from a session.${RESET}\n`);
  console.log(bar);
  console.log();
}

// ─── backfill ─────────────────────────────────────────────────────────────────

const BACKFILL_DEFAULT = 20;
const BACKFILL_MAX     = 500;
// How far back an automatic sweep looks for commits nobody processed — small,
// because it runs after every commit. Catches anything missed while DevBrain was
// offline, rate-limited, or not yet installed.
const AUTO_SWEEP       = 8;
// How many rate-limit windows a single commit will wait out before giving up.
const BACKFILL_MAX_WAITS = 6;
// Deadline for the post-failure lookup in `devbrain run`. It wraps a build, so a
// slow lookup must be abandoned rather than delay a failure already on screen.
const RUN_LOOKUP_TIMEOUT_MS = 8000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Extract knowledge from commits that already happened.
 *
 * Without this, a freshly initialised project has an empty memory and `context`
 * returns nothing until enough new commits accumulate — the tool looks broken
 * precisely when a user is deciding whether it's worth keeping. Processed commits
 * are recorded, so an interrupted or rate-limited run resumes where it stopped.
 */
async function handleBackfill(
  arg?: string,
  limitOverride?: number,
  opts: { auto?: boolean } = {},
): Promise<void> {
  const { auto = false } = opts;
  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;

  if (!isGitRepo(repoRoot)) {
    if (!auto) console.log(`\n  ${YELLOW}Not a git repo${RESET} — nothing to backfill.\n`);
    return;
  }

  let limit = limitOverride ?? BACKFILL_DEFAULT;
  if (limitOverride === undefined && arg?.trim()) {
    const parsed = Number(arg.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      console.log(`\n  ${RED}Invalid count:${RESET} ${arg.trim()}  ${DIM}— expected a positive whole number.${RESET}\n`);
      return;
    }
    limit = Math.min(parsed, BACKFILL_MAX);
    if (parsed > BACKFILL_MAX) {
      console.log(`\n  ${DIM}Capped at ${BACKFILL_MAX} commits per run — re-run to continue further back.${RESET}`);
    }
  }

  let project = await getProjectByPath(repoRoot);
  if (!project) {
    project = {
      id: nanoid(), name: getProjectName(repoRoot), path: repoRoot,
      stack: detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now(),
    };
    await upsertProject(project);
  }

  const scan = auto ? undefined : spin(`Reading last ${limit} commits...`);
  const commits = getRecentCommits(repoRoot, limit);
  if (commits.length === 0) {
    if (scan) { scan.fail('No commits found'); console.log(); }
    return;
  }

  // Oldest first, so stored createdAt values run forward in time like live capture.
  const ordered = commits.slice().reverse();
  const pending: typeof ordered = [];
  for (const c of ordered) {
    if (!(await isCommitProcessed(c.hash))) pending.push(c);
  }
  scan?.stop();

  const alreadyDone = ordered.length - pending.length;
  if (pending.length === 0) {
    // Silent in auto mode: "nothing to do" is the normal case after every commit.
    if (!auto) console.log(`\n  ${GREEN}✓${RESET} Nothing to do — all ${ordered.length} commits already processed.\n`);
    return;
  }

  if (auto) {
    console.log(`\n  ${CYAN}[DevBrain]${RESET} Catching up on ${pending.length} unprocessed commit${pending.length === 1 ? '' : 's'}...`);
  } else {
    console.log(`\n  ${bold('Backfilling')} ${pending.length} commit${pending.length === 1 ? '' : 's'}${alreadyDone ? dim(`  (${alreadyDone} already processed)`) : ''}`);
    console.log(`  ${DIM}One Gemini extraction per commit. Ctrl-C is safe — progress is saved as it goes.${RESET}\n`);
  }

  let saved = 0, skipped = 0, failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const commit = pending[i];
    const label  = `${DIM}[${i + 1}/${pending.length}]${RESET}`;
    const short  = commit.message.length > 48 ? `${commit.message.slice(0, 48)}…` : commit.message;

    // A free-tier key rate-limits after a handful of commits. Aborting there left
    // most of a repo unread and made a full backfill effectively impossible;
    // waiting out the window and retrying the same commit lets a long run finish
    // unattended. Give up only when the limit persists across several waits.
    let knowledge: Awaited<ReturnType<typeof extractKnowledge>> = null;
    let extracted = false;
    let waits = 0;

    while (!extracted) {
      try {
        knowledge = await extractKnowledge(commit.diff, commit.message);
        extracted = true;
      } catch (err) {
        // Waiting out a rate-limit window is right for a backfill the user ran
        // and is watching. It is wrong inside the post-commit hook, which git
        // blocks on — that turned every commit into a multi-minute stall. An
        // automatic sweep gives up immediately and lets the next one catch up.
        if (err instanceof RateLimitError && !auto && waits < BACKFILL_MAX_WAITS) {
          waits++;
          const seconds = Math.max(err.retryAfter, 5) + 2;
          process.stdout.write(`\r  ${label} ${DIM}rate limited, waiting ${seconds}s (${waits}/${BACKFILL_MAX_WAITS})${RESET}\x1b[K`);
          await sleep(seconds * 1000);
          continue;
        }
        if (err instanceof RateLimitError) {
          process.stdout.write('\r\x1b[K');
          if (auto) {
            console.log(`  ${DIM}Gemini rate limited — leaving the rest for the next commit.${RESET}\n`);
            return;
          }
          // A per-minute limit clears in a moment; a daily quota does not, and
          // telling someone to "retry shortly" when the answer is "tomorrow"
          // sends them round a loop that cannot succeed.
          const daily = /PerDay|free_tier_requests|per day/i.test(err.message);
          console.log(`\n  ${YELLOW}${daily ? 'Gemini daily quota exhausted' : 'Gemini rate limit is not clearing'}${RESET} — stopped after ${saved} saved.`);
          console.log(daily
            ? `  ${DIM}Free-tier requests reset every 24h. Re-run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} then; it resumes from here.${RESET}`
            : `  ${DIM}Re-run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} shortly to resume from here.${RESET}`);
          console.log(`  ${DIM}Higher limits: set GOOGLE_GENAI_USE_VERTEXAI=true with GOOGLE_CLOUD_PROJECT.${RESET}\n`);
          return;
        }
        failed++;
        console.log(`  ${label} ${RED}✗${RESET} ${short}  ${DIM}${explainError(err)}${RESET}`);
        break;
      }
    }

    if (waits > 0) process.stdout.write('\r\x1b[K');
    if (!extracted) continue;   // a non-rate-limit failure, already reported

    if (!knowledge) {
      await markCommitProcessed(commit.hash, project.id);
      skipped++;
      console.log(`  ${label} ${DIM}– ${short}  (nothing to learn)${RESET}`);
      continue;
    }

    let embedding: number[] | undefined;
    try { embedding = await getEmbedding(`${knowledge.problem} ${knowledge.solution} ${knowledge.tags.join(' ')}`); } catch {}

    // Consecutive commits on the same problem produce near-identical entries —
    // two "@google/adk dependency" entries for one event, for instance. The
    // interactive save path already checks for this; automatic capture did not,
    // so the noisiest source of entries was the one with no duplicate check.
    if (embedding && await isDuplicateEntry(embedding, project.id)) {
      await markCommitProcessed(commit.hash, project.id);
      skipped++;
      console.log(`  ${label} ${DIM}– ${short}  (duplicate of an existing entry)${RESET}`);
      continue;
    }

    await insertEntry({
      id: nanoid(), projectId: project.id,
      type: knowledge.type,
      title: clip(knowledge.problem, 120),
      content: knowledge.solution,
      tags: knowledge.tags,
      embedding,
      createdAt: commit.timestamp,
      confidence: 'observation',
      ...(knowledge.category     ? { category: knowledge.category }         : {}),
      ...(knowledge.errorPattern ? { errorPattern: knowledge.errorPattern } : {}),
    });
    await markCommitProcessed(commit.hash, project.id);
    saved++;
    console.log(`  ${label} ${GREEN}✓${RESET} ${typeCode(knowledge.type)}${knowledge.type}${RESET}  ${knowledge.problem.slice(0, 60)}`);
  }

  if (auto) {
    console.log(`  ${GREEN}✓${RESET} ${DIM}Caught up — ${saved} saved · ${skipped} skipped${failed ? ` · ${failed} failed` : ''}${RESET}\n`);
  } else {
    console.log(`\n  ${GREEN}${bold('Backfill complete.')}${RESET}  ${saved} saved · ${skipped} skipped${failed ? ` · ${failed} failed` : ''}`);
    if (saved > 0) console.log(`  ${DIM}Try ${RESET}${CYAN}devbrain context${RESET}${DIM} — it has history to draw on now.${RESET}`);
    console.log();
  }
}

/**
 * Run a backfill unprompted when there's something to pick up.
 *
 * The post-commit hook only sees commits made while DevBrain is working. Commits
 * made before install, while rate-limited, or on another machine would otherwise
 * never be read. This closes that gap without the user having to remember.
 *
 * Opt out with DEVBRAIN_NO_AUTO_BACKFILL=1.
 */
async function maybeAutoBackfill(scan: number): Promise<void> {
  if (process.env.DEVBRAIN_NO_AUTO_BACKFILL) return;
  if (!hasGeminiCreds()) return;                      // nothing to extract with
  const repoRoot = getRepoRoot(process.cwd());
  if (!repoRoot || !isGitRepo(repoRoot)) return;
  try {
    await handleBackfill(undefined, scan, { auto: true });
  } catch (err) {
    // Never let an automatic sweep break the command the user actually ran.
    if (process.env.DEVBRAIN_DEBUG) reportError(err, 'Auto-backfill failed');
  }
}

async function handleCapture(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project = await getProjectByPath(repoRoot);
  if (!project) return;
  const commit = getLastCommit(repoRoot);
  if (!commit) return;
  if (await isCommitProcessed(commit.hash)) {
    // HEAD is known, but earlier commits may not be — still worth a sweep.
    await maybeAutoBackfill(AUTO_SWEEP);
    return;
  }

  console.log(`\n${CYAN}[DevBrain]${RESET} Processing commit diff...`);

  let knowledge;
  try {
    knowledge = await extractKnowledge(commit.diff, commit.message);
  } catch (err) {
    console.error(`  ${RED}✗${RESET} Failed to extract knowledge: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof RateLimitError) return;
    return;
  }
  if (!knowledge) {
    await markCommitProcessed(commit.hash, project.id);
    console.log(`  ${DIM}No meaningful developer knowledge found in this commit — skipped.${RESET}\n`);
    await maybeAutoBackfill(AUTO_SWEEP);
    return;
  }
  const embeddingText = `${knowledge.problem} ${knowledge.solution} ${knowledge.tags.join(' ')}`;
  let embedding: number[] | undefined;
  try { embedding = await getEmbedding(embeddingText); } catch {}

  // Same check as backfill: a problem worked across several commits should leave
  // one entry, not one per commit.
  if (embedding && await isDuplicateEntry(embedding, project.id)) {
    await markCommitProcessed(commit.hash, project.id);
    console.log(`  ${DIM}Already recorded — near-duplicate of an existing entry, skipped.${RESET}\n`);
    await maybeAutoBackfill(AUTO_SWEEP);
    return;
  }

  await insertEntry({
    id: nanoid(), projectId: project.id,
    type: knowledge.type,
    title: clip(knowledge.problem, 120),
    content: knowledge.solution,
    tags: knowledge.tags,
    embedding, createdAt: commit.timestamp,
    confidence: 'observation',
    ...(knowledge.category     ? { category: knowledge.category }         : {}),
    ...(knowledge.errorPattern ? { errorPattern: knowledge.errorPattern } : {}),
  });
  await markCommitProcessed(commit.hash, project.id);

  const typeColor = typeCode(knowledge.type);
  const storage = describeStorage();
  console.log(`  ${GREEN}✓${RESET} Captured ${typeColor}${knowledge.type}${RESET}: ${knowledge.problem}`);
  console.log(`  ${DIM}Stored in ${storage.kind === 'local' ? storage.location : 'MongoDB'}.${RESET}\n`);

  // Sweep up anything the hook missed — commits made while offline, rate-limited,
  // or before DevBrain was installed here.
  await maybeAutoBackfill(AUTO_SWEEP);
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

    bumpRetrievalCounts(hits.map(r => r.entry.id), project?.id).catch(() => {});
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
      getEmbedding(query),
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
    if (err instanceof RateLimitError) {
      console.log(`\n  ${YELLOW}Gemini rate limit hit — retry in ~${err.retryAfter}s${RESET}\n`);
    } else {
      reportError(err);
    }
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
    if (!inq && embedding && await isDuplicateEntry(embedding, project.id)) {
      s.stop();
      console.log(`  ${DIM}Already known — near-duplicate of an existing entry, not saved.${RESET}\n`);
      return;
    }

    await insertEntry({ id: nanoid(), projectId: project.id, type, title: clip(content, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
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

async function handleSummary(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project = await getProjectByPath(repoRoot);
  if (!project) { console.log(`\n  ${YELLOW}Project not tracked.${RESET} Run Init first.\n`); return; }
  const entries = await getEntriesByProject(project.id);

  const bugs  = entries.filter(e => e.type === 'bug').length;
  const fixes = entries.filter(e => e.type === 'fix').length;
  const notes = entries.filter(e => e.type === 'note').length;

  console.log(`\n  ${bold('Project')}  ${project.name}`);
  console.log(`  ${bold('Stack')}    ${project.stack.join(', ') || 'Unknown'}`);
  console.log(`  ${bold('Memory')}   ${entries.length} entries  ${dim(`${bugs} bugs · ${fixes} fixes · ${notes} notes`)}  ${dim(`· ${describeStorage().kind === 'local' ? 'local' : 'MongoDB'}`)}`);

  if (entries.length > 0) {
    console.log(`\n  ${CYAN}Knowledge captured${RESET}`);
    entries.slice(0, 8).forEach(e => {
      const dot = typeDot(e.type);
      const title = e.title.length > 68 ? e.title.slice(0, 68) + '…' : e.title;
      console.log(`  ${dot} ${title}  ${dim(timeAgo(e.createdAt))}`);
    });

    // A few entries is a list; a body of work deserves a read of the whole thing.
    if (entries.length >= 3 && hasGeminiCreds()) {
      const s = spin('Summarizing...');
      try {
        const prose = await summarizeProjectHistory(entries);
        s.stop();
        if (prose?.trim()) {
          console.log(`\n  ${CYAN}What this project has taught you${RESET}`);
          for (const line of wrap(prose.trim(), 74)) console.log(`  ${line}`);
        }
      } catch (err) {
        s.stop();
        if (err instanceof RateLimitError) {
          console.log(`\n  ${DIM}Summary skipped — Gemini rate limit.${RESET}`);
        }
        // Any other failure: the listing above is still the useful part.
      }
    }
  } else if (isGitRepo(repoRoot) && countCommits(repoRoot) > 0) {
    console.log(`\n  ${DIM}No knowledge yet — run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} to import past commits.${RESET}`);
  }
  console.log();
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

  // Work that was started and never written down. Agents are told about this
  // through task_start; a human should not have to read the agent's context to
  // find out their last session went unrecorded.
  const abandonedNote = describeAbandonedSession(await getAbandonedSession(project.id).catch(() => null));
  if (abandonedNote) {
    console.log(`\n  ${YELLOW}⚠${RESET}  ${abandonedNote}`);
    console.log(`     ${DIM}Record it with ${RESET}${CYAN}devbrain recap "<what you did>"${RESET}`);
  }

  if (dossier.total === 0) {
    console.log(`\n  ${DIM}Nothing recorded yet — run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} to read past commits.${RESET}\n`);
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
    try {
      queryEmbedding = await getEmbedding(query);
    } catch (err) {
      s?.fail('Embedding failed');
      if (err instanceof RateLimitError) {
        console.log(`\n  ${YELLOW}Gemini rate limit — retry in ~${err.retryAfter}s${RESET}\n`);
      } else {
        reportError(err);
      }
      return;
    }
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

// ─── export ───────────────────────────────────────────────────────────────────

async function handleExport(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project = await getProjectByPath(repoRoot);
  if (!project) { console.log(`\n  ${YELLOW}Project not tracked.${RESET} Run /init first.\n`); return; }
  const entries = await getEntriesByProject(project.id);
  if (entries.length === 0) { console.log(`\n  No entries to export yet.\n`); return; }

  const s = spin('Building export...');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    // Ship the same dossier the `project` command shows: a README index plus one
    // Markdown file per section. The previous layout wrote `${type}s.txt` files,
    // which split one project's story across bug/fix/note buckets and gave a
    // reader no overview or entry point.
    const dossier = buildDossier(project, entries.map(e => ({ ...e, projectId: project.id })));
    const files   = dossierFiles(dossier);
    for (const f of files) zip.addFile(f.path, Buffer.from(f.contents, 'utf-8'));

    const exportDir  = join(homedir(), '.devbrain');
    const exportPath = join(exportDir, `${project.name}-export.zip`);
    zip.writeZip(exportPath);

    s.succeed(`Export complete`);
    console.log(`\n  ${BOLD}Saved to${RESET}`);
    console.log(`  ${CYAN}${exportPath}${RESET}\n`);
    console.log(`  ${BOLD}Contains${RESET}`);
    console.log(`  ${DIM}README.md${RESET}${' '.repeat(10)}${DIM}overview + index${RESET}`);
    for (const section of dossier.sections) {
      console.log(`  ${section.file.padEnd(19)}${DIM}${section.entries.length} · ${section.heading}${RESET}`);
    }
    console.log();
    openPath(exportDir);
  } catch (err) {
    s.fail('Export failed');
    reportError(err);
  }
}

// ─── prompt ───────────────────────────────────────────────────────────────────

async function handlePrompt(): Promise<void> {
  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project  = await getProjectByPath(repoRoot);
  const name     = project?.name ?? getProjectName(repoRoot);
  const stack    = project?.stack ?? [];

  printInitInstructions(name, stack, repoRoot);
}

// ─── open ─────────────────────────────────────────────────────────────────────

async function handleOpen(): Promise<void> {
  const folder = join(homedir(), '.devbrain');
  openPath(folder);
  console.log(`\n  ${GREEN}✓${RESET} Opened ${CYAN}${folder}${RESET}\n`);
}

// ─── recap ────────────────────────────────────────────────────────────────────

async function handleRecap(sessionText?: string): Promise<void> {
  const W   = Math.min(process.stdout.columns || 80, 80);
  const bar = `${DIM}${'─'.repeat(W)}${RESET}`;

  let text = sessionText ?? '';

  // Piped input: `cat notes.md | devbrain recap`, or a coding agent writing its
  // own recap into stdin. Must come before the interactive prompts, which can't
  // run without a TTY anyway.
  if (!text && !process.stdin.isTTY) {
    text = await readStdin();
    if (!text.trim()) {
      console.log(`\n  ${YELLOW}Nothing on stdin to recap.${RESET}`);
      console.log(`  ${DIM}Pass it inline: ${RESET}${CYAN}devbrain recap "<summary>"${RESET}${DIM}, or pipe text in.${RESET}\n`);
      return;
    }
  }

  if (!text) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const _inq: any = require('inquirer');
    const inq = typeof _inq.prompt === 'function' ? _inq : _inq.default;

    console.log(`\n  ${BOLD}${CYAN}Session Recap${RESET}`);
    console.log(`  ${DIM}Paste your session notes, chat transcript, or describe what you did.${RESET}`);
    console.log(`  ${DIM}Gemini will extract bugs, fixes, decisions, and patterns automatically.${RESET}\n`);

    // Try clipboard first — zero friction if the user just copied a chat
    let clipText = '';
    try {
      const { execSync } = require('child_process') as typeof import('child_process');
      if (process.platform === 'win32') {
        clipText = execSync('powershell -command "Get-Clipboard"', { encoding: 'utf-8' }).trim();
      } else if (process.platform === 'darwin') {
        clipText = execSync('pbpaste', { encoding: 'utf-8' }).trim();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clipText = (execSync as any)('xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null', { encoding: 'utf-8', shell: '/bin/sh' }).trim();
      }
    } catch {}

    // Ask the user how they want to provide the text
    const choices: { name: string; value: string }[] = [];
    if (clipText && clipText.length > 30) {
      choices.push({ name: `Use clipboard  ${DIM}(${clipText.slice(0, 60).replace(/\n/g, ' ')}...)${RESET}`, value: 'clipboard' });
    }
    choices.push({ name: 'Type / paste here', value: 'type' });
    choices.push({ name: 'Open in editor (Notepad)', value: 'editor' });
    choices.push({ name: 'Cancel', value: 'cancel' });

    let source: string;
    try {
      const { src } = await inq.prompt([{
        type: 'list', name: 'src', message: 'Session text source:',
        prefix: ' ', choices,
      }]);
      source = src;
    } catch { return; }

    if (source === 'cancel') return;

    if (source === 'clipboard') {
      text = clipText;
      console.log(`  ${DIM}Using ${clipText.length} chars from clipboard.${RESET}\n`);

    } else if (source === 'type') {
      // Multi-line inline input: keep reading lines until user enters a line with just "."
      console.log(`  ${DIM}Paste your text below. Enter a line with just ${BOLD}.${RESET}${DIM} when done:${RESET}\n`);
      const lines: string[] = [];
      const readline = require('readline') as typeof import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
      // In interactive mode we need terminal:true to show the cursor, but we
      // write the prompt ourselves so we don't get double-echoing.
      rl.close();

      // Use repeated inquirer prompts instead — cleaner in interactive mode
      while (true) {
        let line: string;
        try {
          const { l } = await inq.prompt([{ type: 'input', name: 'l', message: '>', prefix: '  ' }]);
          line = l ?? '';
        } catch { break; }
        if (line.trim() === '.') break;
        lines.push(line);
      }
      text = lines.join('\n').trim();

    } else {
      // editor: open temp file, wait for user to save and come back
      const tmpFile = join(tmpdir(), `devbrain-recap-${Date.now()}.txt`);
      writeFileSync(tmpFile, '# Paste your session transcript here, then save and close.\n\n', 'utf-8');
      openPath(tmpFile);
      console.log(`\n  ${DIM}Editor opened: ${tmpFile}${RESET}`);
      console.log(`  ${DIM}Save and close the file, then press Enter here.${RESET}\n`);
      try {
        await inq.prompt([{ type: 'input', name: '_', message: 'Press Enter when done:', prefix: ' ' }]);
      } catch { return; }
      try {
        text = readFileSync(tmpFile, 'utf-8').replace(/^#.*\n/m, '').trim();
      } catch {
        console.log(`  ${YELLOW}Could not read file.${RESET}\n`);
        return;
      }
      try { unlinkSync(tmpFile); } catch {}
    }
  }

  if (!text) {
    console.log(`  ${YELLOW}Nothing to recap.${RESET}\n`);
    return;
  }

  console.log(`\n  ${DIM}Analyzing session with Gemini...${RESET}`);

  let extracted;
  try {
    extracted = await recapSession(text);
  } catch (err) {
    console.log(`  ${RED}Recap failed: ${err instanceof Error ? err.message : String(err)}${RESET}\n`);
    return;
  }

  if (!extracted.length) {
    console.log(`  ${DIM}No new knowledge found worth saving.${RESET}\n`);
    return;
  }

  console.log(`\n  ${BOLD}Found ${extracted.length} item${extracted.length > 1 ? 's' : ''} to save:${RESET}\n`);
  extracted.forEach((e, i) => {
    const col = e.type === 'anti-pattern' ? RED : e.type === 'bug' ? YELLOW : GREEN;
    console.log(`  ${col}${i + 1}. [${e.type}]${RESET} ${e.title.slice(0, 80)}`);
  });
  console.log();

  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  let project    = await getProjectByPath(repoRoot);

  if (!project) {
    project = {
      id: nanoid(), name: getProjectName(repoRoot), path: repoRoot,
      stack: detectStack(repoRoot), createdAt: Date.now(), lastSeen: Date.now(),
    };
    await upsertProject(project);
  }

  let saved = 0;
  for (const e of extracted) {
    let embedding: number[] | undefined;
    try { embedding = await getEmbedding(`${e.title} ${e.content} ${e.tags.join(' ')}`); } catch {}
    await insertEntry({
      id: nanoid(), projectId: project.id,
      type: e.type, title: clip(e.title, 120), content: e.content,
      tags: e.tags, embedding, createdAt: Date.now(), confidence: 'observation',
      ...(e.category      ? { category: e.category as EntryCategory }   : {}),
      ...(e.errorPattern  ? { errorPattern: e.errorPattern }            : {}),
      ...(e.causeArchetype ? { causeArchetype: e.causeArchetype }       : {}),
    });
    saved++;
  }

  console.log(bar);
  console.log(`  ${GREEN}✓${RESET} Saved ${BOLD}${saved}${RESET} entr${saved > 1 ? 'ies' : 'y'} to DevBrain\n`);
}

// ─── first-run onboarding ─────────────────────────────────────────────────────

async function runOnboarding(): Promise<void> {
  // The wizard is all prompts. Without a TTY (CI, a piped script, an agent
  // shelling out) inquirer's readline closes on EOF and Node dies with an
  // unhandled ERR_USE_AFTER_CLOSE, so print the manual path and stop instead.
  if (!process.stdin.isTTY) {
    console.log(`\n  ${YELLOW}Setup needs an interactive terminal.${RESET}\n`);
    console.log(`  ${DIM}Nothing is required to start — memory defaults to ${RESET}${getLocalDbPath()}${DIM}.${RESET}`);
    console.log(`  ${DIM}Commands that save and recall notes already work.${RESET}\n`);
    console.log(`  For search and auto-capture, run ${CYAN}devbrain setup${RESET} in a terminal, or add to ${DIM}${envFilePath}${RESET}:`);
    console.log(`    ${CYAN}GEMINI_API_KEY${RESET}=...              ${DIM}# or DEVBRAIN_MOCK=true to try it offline${RESET}`);
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
  console.log(stageHeader(1, 5, 'Storage'));

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

  // ── Stage 2: Gemini credentials ───────────────────────────────────────────
  console.log(stageHeader(2, 5, 'Gemini Credentials'));
  console.log(`  ${DIM}Used for semantic search and auto-capture from commits.${RESET}`);
  console.log(`  ${DIM}Vertex AI (Google Cloud) or a free key at https://aistudio.google.com${RESET}\n`);

  if (isMockMode()) {
    console.log(`  ${GREEN}✓${RESET} Mock mode (DEVBRAIN_MOCK=true) — no Gemini calls will be made\n`);
  } else if (hasVertexCreds()) {
    console.log(`  ${GREEN}✓${RESET} Vertex AI configured (project ${process.env.GOOGLE_CLOUD_PROJECT})\n`);
  } else if (hasGeminiCreds()) {
    console.log(`  ${GREEN}✓${RESET} API key already set\n`);
  } else {
    const { apiKey } = await inq.prompt([{
      type: 'password',
      name: 'apiKey',
      message: 'Paste your Gemini API key (or press Enter to skip):',
      prefix: ' ',
    }]);
    if (apiKey?.trim()) {
      writeEnvVars({ GEMINI_API_KEY: apiKey.trim() });
      process.env.GEMINI_API_KEY = apiKey.trim();
      console.log(`  ${GREEN}✓${RESET} Saved to ${DIM}${envFilePath}${RESET}\n`);
    } else {
      console.log(`  ${YELLOW}⚠${RESET}  Skipped — search and auto-capture stay off until you add a key\n`);
    }
  }

  // Credentials are on disk, so this run counts as onboarded. Recorded before
  // the stages that touch the network: if the database is unreachable we must
  // not relaunch this wizard on every invocation.
  markOnboarded();

  // ── Stage 3: Project registration ────────────────────────────────────────
  console.log(stageHeader(3, 5, 'Register Current Project'));
  const cwd      = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const autoName = getProjectName(repoRoot);
  const autoStack = detectStack(repoRoot);

  console.log(`  ${DIM}Detected: ${RESET}${BOLD}${autoName}${RESET}`);
  if (autoStack.length) console.log(`  ${DIM}Stack:    ${autoStack.join(', ')}${RESET}`);
  console.log();

  const { regProject } = await inq.prompt([{
    type: 'confirm', name: 'regProject',
    message: `Register "${autoName}"?`,
    default: true, prefix: ' ',
  }]);

  if (regProject) {
    const s = spin(hasMongoUri() ? 'Connecting to database...' : 'Registering...');
    try {
      const existing = await getProjectByPath(repoRoot);
      await upsertProject({
        id: existing?.id ?? nanoid(), name: autoName, path: repoRoot,
        stack: autoStack, createdAt: existing?.createdAt ?? Date.now(), lastSeen: Date.now(),
      });
      s.succeed('Project registered');
      console.log();
    } catch (err) {
      s.fail(`${explainError(err)}`);
      console.log(`  ${DIM}Fix that, then run ${RESET}${CYAN}devbrain init${RESET}${DIM} to register this project.${RESET}\n`);
    }
  } else {
    console.log(`  ${DIM}Skipped — use /init anytime to register a project${RESET}\n`);
  }

  // ── Stage 4: Git hook ─────────────────────────────────────────────────────
  console.log(stageHeader(4, 5, 'Auto-capture from Git'));
  console.log(`  ${DIM}After every commit, DevBrain extracts bugs, fixes, and lessons automatically.${RESET}\n`);

  if (!isGitRepo(repoRoot)) {
    console.log(`  ${YELLOW}⚠${RESET}  Not a git repo — skipping hook install\n`);
  } else if (isHookInstalled(repoRoot)) {
    console.log(`  ${GREEN}✓${RESET} Git hook already installed\n`);
  } else {
    const { doHook } = await inq.prompt([{
      type: 'confirm', name: 'doHook',
      message: 'Install post-commit hook?',
      default: true, prefix: ' ',
    }]);
    if (doHook) {
      installGitHook(repoRoot);
      console.log(`  ${GREEN}✓${RESET} Hook installed — commits captured automatically\n`);
    } else {
      console.log(`  ${DIM}Skipped — use /init anytime to install the hook${RESET}\n`);
    }
  }

  // ── Stage 5: Backfill existing history ────────────────────────────────────
  // The hook only captures commits from here on, so without this a new user's
  // first `context` is empty and the tool looks useless on the day they try it.
  console.log(stageHeader(5, 5, 'Import Existing History'));

  const commitCount = isGitRepo(repoRoot) ? countCommits(repoRoot) : 0;
  if (!isGitRepo(repoRoot)) {
    console.log(`  ${DIM}Skipped — not a git repo.${RESET}\n`);
  } else if (commitCount === 0) {
    console.log(`  ${DIM}Skipped — no commits yet. Memory fills as you work.${RESET}\n`);
  } else if (!hasGeminiCreds()) {
    console.log(`  ${DIM}Skipped — needs Gemini credentials. Run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} once they're set.${RESET}\n`);
  } else {
    const suggested = Math.min(commitCount, BACKFILL_DEFAULT);
    console.log(`  ${DIM}Read past commits now so ${RESET}${CYAN}devbrain context${RESET}${DIM} has something to say today.${RESET}`);
    console.log(`  ${DIM}This repo has ${commitCount} commit${commitCount === 1 ? '' : 's'}; one Gemini call each.${RESET}\n`);

    const { doBackfill } = await inq.prompt([{
      type: 'confirm', name: 'doBackfill',
      message: `Import the last ${suggested} commit${suggested === 1 ? '' : 's'} now?`,
      default: true, prefix: ' ',
    }]);

    if (doBackfill) {
      try {
        await handleBackfill(undefined, suggested);
      } catch (err) {
        reportError(err, 'Backfill failed');
        console.log(`  ${DIM}Run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} to try again.${RESET}\n`);
      }
    } else {
      console.log(`  ${DIM}Skipped — run ${RESET}${CYAN}devbrain backfill${RESET}${DIM} whenever you like.${RESET}\n`);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  const W = Math.min(process.stdout.columns || 80, 80);
  const storage = describeStorage();
  console.log(`${DIM}${'─'.repeat(W)}${RESET}`);
  console.log(`\n  ${GREEN}${BOLD}DevBrain is ready.${RESET}\n`);

  console.log(`  ${BOLD}Where your data lives${RESET}`);
  console.log(`  ${DIM}Memory    ${RESET}${storage.location}${storage.kind === 'local' ? ` ${DIM}(local)${RESET}` : ''}`);
  console.log(`  ${DIM}Exports   ${RESET}${join(devbrainDir, '<project>-export.zip')}`);
  console.log(`  ${DIM}Config    ${RESET}${envFilePath}\n`);

  if (!hasGeminiCreds()) {
    console.log(`  ${YELLOW}Note:${RESET} ${DIM}without Gemini credentials, saving works but search and auto-capture don't.${RESET}\n`);
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
  { value: '/search',  desc: 'Semantic search across all projects'                },
  { value: '/context', desc: 'Inject ranked context for AI agents'                },
  { value: '/project', desc: 'Everything saved about this project'                },
  { value: '/browse',  desc: 'Scroll through all saved entries'                   },
  { value: '/save',    desc: 'Save entry  (bug: fix: stack: decision: image: ...)'},
  { value: '/delete',  desc: 'Delete an entry'                                    },
  { value: '/recap',   desc: 'AI-extract + save knowledge from a session'         },
  { value: '/backfill',desc: 'Import knowledge from past commits'                 },
  { value: '/prompt',  desc: 'Generate agent DEV_CONTEXT.md + ingestion prompt'  },
  { value: '/summary', desc: 'Project name, stack and recent entries'             },
  { value: '/export',  desc: 'Export knowledge to zip file'                       },
  { value: '/open',    desc: 'Open ~/.devbrain folder in file explorer'           },
  { value: '/init',    desc: 'Register project + install git hook'                },
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
    case '/summary': await handleSummary();    break;
    case '/export':  await handleExport();     break;
    case '/prompt':  await handlePrompt();     break;
    case '/recap':   await handleRecap();      break;
    case '/backfill':
      if (!preflight('ai')) break;
      await handleBackfill(arg || undefined);
      break;
    case '/open':    await handleOpen();       break;
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

// What each command needs before it can do anything useful. Checked up front so
// a missing credential prints setup guidance instead of a driver stack trace.
const COMMAND_NEEDS: Record<string, Requirement[]> = {
  capture:  ['ai'],
  search:   ['ai'],
  recap:    ['ai'],
  backfill: ['ai'],
};

async function main(): Promise<void> {
  const args    = process.argv.slice(2);
  const command = args[0] ?? '';

  const needs = COMMAND_NEEDS[command];
  if (needs && !preflight(...needs)) process.exit(1);

  try {
    switch (command) {
      case 'setup':   await runOnboarding();                       break;
      case 'init':    await handleInit();                          break;
      case 'capture': await handleCapture();                       break;
      case 'backfill': await handleBackfill(args[1]);              break;
      // Deliberately not in COMMAND_NEEDS: a missing credential must not stop
      // the wrapped command from running.
      case 'run':     await handleRun(args.slice(1));              break;
      case 'index':   await handleIndex(args[1]);                  break;
      case 'project': case 'projects': {
        const rest  = args.slice(1).filter(a => a !== '--write');
        const write = args.includes('--write');
        await handleProject(rest.join(' ') || undefined, { write });
        break;
      }
      case 'search':  await handleSearch(args.slice(1).join(' ')); break;
      case 'note':    await handleNote(args.slice(1).join(' '));   break;
      case 'summary': await handleSummary();                                        break;
      case 'export':  await handleExport();                                         break;
      case 'prompt':  await handlePrompt();                                         break;
      case 'recap':   await handleRecap(args.slice(1).join(' ') || undefined);      break;
      case 'open':    await handleOpen();                                            break;
      case 'context': await handleContext(args.slice(1).join(' ') || undefined);    break;
      case 'help': case '--help': case '-h':
        console.log(`\n${BOLD}${CYAN}DevBrain${RESET} — your developer memory\n`);
        console.log(`  ${CYAN}devbrain${RESET}               Interactive REPL`);
        console.log(`  ${CYAN}devbrain setup${RESET}         Configure credentials (re-runnable)`);
        console.log(`  ${CYAN}devbrain init${RESET}          Register project + install git hook`);
        console.log(`  ${CYAN}devbrain backfill${RESET} ${MAGENTA}[n]${RESET}  Import past commits ${DIM}(default ${BACKFILL_DEFAULT})${RESET}`);
        console.log(`  ${CYAN}devbrain index${RESET} ${MAGENTA}[file]${RESET}  Index CLAUDE.md as a source of truth`);
        console.log(`  ${CYAN}devbrain project${RESET} ${MAGENTA}[n]${RESET}  Everything saved about a project`);
        console.log(`  ${DIM}          ${RESET}${CYAN}--write${RESET}       ${DIM}… as one .md per section${RESET}`);
        console.log(`  ${CYAN}devbrain context${RESET} ${MAGENTA}[t]${RESET}   Ranked project history for an AI agent`);
        console.log(`  ${CYAN}devbrain run${RESET} ${MAGENTA}<cmd>${RESET}    Run a command; on failure, show past fixes`);
        console.log(`  ${CYAN}devbrain search${RESET} ${MAGENTA}<q>${RESET}    Semantic search`);
        console.log(`  ${CYAN}devbrain note${RESET} ${MAGENTA}"<t>"${RESET}   Save  ${DIM}(bug: fix: stack: decision: image:...)${RESET}`);
        console.log(`  ${CYAN}devbrain summary${RESET}       Project name, stack and recent entries`);
        console.log(`  ${CYAN}devbrain export${RESET}        Export knowledge to zip`);
        console.log(`  ${CYAN}devbrain prompt${RESET}        Generate DEV_CONTEXT.md block + ingestion prompt`);
        console.log(`  ${CYAN}devbrain recap${RESET}         AI-extract + save knowledge from a session`);
        console.log(`  ${CYAN}devbrain capture${RESET}       Extract knowledge from the last commit ${DIM}(git hook)${RESET}`);
        console.log(`  ${CYAN}devbrain open${RESET}          Open ~/.devbrain in file explorer\n`);
        console.log(`  ${DIM}Set DEVBRAIN_DEBUG=1 to see full stack traces on error.${RESET}\n`);
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
