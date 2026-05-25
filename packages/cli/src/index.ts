#!/usr/bin/env node
import 'dotenv/config';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import {
  getProjectByPath, upsertProject, insertEntry,
  getEntriesByProject, getAllEntriesWithProjects,
  isCommitProcessed, markCommitProcessed,
  detectStack, getProjectName, isGitRepo, getRepoRoot,
  getLastCommit, installGitHook, isHookInstalled,
  extractKnowledge, getEmbedding, summarizeProjectHistory,
  findSimilar, similarityLabel, timeAgo, RateLimitError,
  buildContext, formatContext,
  reinforceEntry, bumpRetrievalCounts, supersedeEntry,
  preciseSearch, classifyQuery, recapSession, deleteEntry,
} from '@devbrain/core';
import type { Entry, Project, EntryCategory } from '@devbrain/core';
import { nanoid } from 'nanoid';
import { homedir, tmpdir } from 'os';

// Load key from ~/.devbrain/.env if not already in environment
const globalEnvPath = join(homedir(), '.devbrain', '.env');
if (!process.env.GEMINI_API_KEY && existsSync(globalEnvPath)) {
  const lines = readFileSync(globalEnvPath, 'utf-8').replace(/^﻿/, '').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
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
  console.log(`  ${bold('Memory')}   ${entries.length} entries  ${dim(`${bugs} bugs · ${fixes} fixes · ${notes} notes`)}`);

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

async function handleInit(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
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
    } else {
      console.log(`  ${YELLOW}⚠${RESET}  Not a git repo — add notes manually`);
    }

    // Write CLAUDE.md so Claude Code calls DevBrain tools automatically
    const claudeMdPath = join(repoRoot, 'CLAUDE.md');
    const devbrainBlock = [
      '## DevBrain Memory',
      '',
      '> DevBrain is an **installed CLI tool** (`devbrain` npm package). DO NOT reimplement',
      '> or recreate it. Run `devbrain --help` to verify. All commands below are real shell',
      '> commands — invoke them with Bash/PowerShell, do not write code that mimics them.',
      '',
      `Project: ${name}  |  Stack: ${stack.join(', ') || 'Unknown'}`,
      '',
      '### Before every task — run these shell commands',
      '```',
      '# Load ranked project history before writing any code:',
      `devbrain context`,
      '',
      '# If working on a specific topic:',
      `devbrain context <topic>`,
      '',
      '# Before debugging an error — search with exact error text:',
      `devbrain search "<error message or symptom>"`,
      '```',
      '',
      '### While working — save automatically, without being asked',
      '```',
      '# After fixing a bug, making a decision, or learning something:',
      `devbrain note "fix: <what you fixed and how"`,
      `devbrain note "decision: <what you decided and why"`,
      `devbrain note "lesson: <what you learned the hard way"`,
      '```',
      '',
      '### Rules',
      '- Run `devbrain context` before starting any non-trivial task — no exceptions.',
      '- Run `devbrain search` before debugging any error you have not seen before.',
      '- Save after fixing or deciding — do not wait until end of session.',
      '- **Never reimplement devbrain** — if the binary is missing, run `npm install -g devbrain`.',
      '',
    ].join('\n');

    const marker = '## DevBrain Memory';
    if (!existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, devbrainBlock, 'utf-8');
      console.log(`  ${GREEN}✓${RESET} Created CLAUDE.md — Claude will call DevBrain automatically`);
    } else {
      const existing = readFileSync(claudeMdPath, 'utf-8');
      if (!existing.includes(marker)) {
        writeFileSync(claudeMdPath, existing.trimEnd() + '\n\n' + devbrainBlock, 'utf-8');
        console.log(`  ${GREEN}✓${RESET} Updated CLAUDE.md — DevBrain block appended`);
      } else {
        console.log(`  ${DIM}CLAUDE.md already has DevBrain block — skipped${RESET}`);
      }
    }
    // Write .claude/settings.json with PostToolUse hook for autonomous saving
    const clauDirPath      = join(repoRoot, '.claude');
    const settingsPath     = join(clauDirPath, 'settings.json');
    const hookCommand      =
      'echo "DevBrain: if this edit fixed a bug, made a decision, established a ' +
      'pattern, or learned something — call save_entry via the devbrain MCP tool now"';
    const hookEntry = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: hookCommand }],
          },
        ],
      },
    };

    if (!existsSync(clauDirPath)) mkdirSync(clauDirPath, { recursive: true });
    if (!existsSync(settingsPath)) {
      writeFileSync(settingsPath, JSON.stringify(hookEntry, null, 2), 'utf-8');
      console.log(`  ${GREEN}✓${RESET} Created .claude/settings.json — saves triggered after every edit`);
    } else {
      try {
        const existing = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        const alreadyHasHook = JSON.stringify(existing).includes('DevBrain');
        if (!alreadyHasHook) {
          existing.hooks ??= {};
          existing.hooks.PostToolUse ??= [];
          existing.hooks.PostToolUse.push(...hookEntry.hooks.PostToolUse);
          writeFileSync(settingsPath, JSON.stringify(existing, null, 2), 'utf-8');
          console.log(`  ${GREEN}✓${RESET} Updated .claude/settings.json — DevBrain hook added`);
        } else {
          console.log(`  ${DIM}.claude/settings.json already has DevBrain hook — skipped${RESET}`);
        }
      } catch {
        console.log(`  ${YELLOW}⚠${RESET}  Could not update .claude/settings.json — check manually`);
      }
    }

    // Print MCP server config so Claude Code sees devbrain tools natively
    const W2  = Math.min(process.stdout.columns || 80, 80);
    const bar2 = `${DIM}${'─'.repeat(W2)}${RESET}`;
    console.log(bar2);
    console.log(`\n  ${BOLD}${CYAN}Connect DevBrain to Claude Code${RESET}  ${DIM}(one-time setup per machine)${RESET}\n`);
    console.log(`  Add this to your Claude Code MCP settings so Claude calls DevBrain`);
    console.log(`  tools automatically — without needing to be asked:\n`);
    console.log(`${CYAN}  ┌─ ~/.claude/claude_desktop_config.json ─────────────────────────────┐${RESET}`);
    console.log(`  ${DIM}{${RESET}`);
    console.log(`    ${DIM}"mcpServers": {${RESET}`);
    console.log(`      ${CYAN}"devbrain"${RESET}${DIM}: {${RESET}`);
    console.log(`        ${CYAN}"type"${RESET}${DIM}: ${RESET}${GREEN}"http"${RESET}${DIM},${RESET}`);
    console.log(`        ${CYAN}"url"${RESET}${DIM}: ${RESET}${GREEN}"https://devbrain-715714057208.us-central1.run.app/mcp"${RESET}`);
    console.log(`      ${DIM}}${RESET}`);
    console.log(`    ${DIM}}${RESET}`);
    console.log(`  ${DIM}}${RESET}`);
    console.log(`${CYAN}  └────────────────────────────────────────────────────────────────────┘${RESET}\n`);
    console.log(`  ${DIM}Or in Claude Code: Settings → MCP Servers → Add → paste the URL above${RESET}\n`);
    console.log(bar2);
    console.log();

    if (isNew) {
      printInitInstructions(name, stack, repoRoot);
    }
  } catch (err) {
    s.fail('Init failed');
    console.error(err);
  }
}

function printInitInstructions(name: string, stack: string[], repoRoot: string): void {
  const W   = Math.min(process.stdout.columns || 80, 80);
  const bar = `${DIM}${'─'.repeat(W)}${RESET}`;
  const cats = 'auth|database|deployment|build|config|network|performance|ui|data|testing|security|other';
  const stackStr = stack.join(', ') || 'Unknown';

  console.log(`${bar}`);
  console.log(`\n  ${BOLD}${CYAN}Next step — tell Claude to set up DevBrain for this project${RESET}\n`);
  console.log(`  ${DIM}Paste the block below into your Claude Code chat:${RESET}\n`);
  console.log(
`${CYAN}────────────────────────────────── copy from here ──────────────────────────${RESET}
You are setting up DevBrain memory for the project at "${repoRoot}".

Do these two things now:

1. CREATE CLAUDE.md (or append if it exists) with this block:

## DevBrain Memory

Project: ${name}  |  Stack: ${stackStr}

### Before every task
- Call \`get_context\` with the task topic before writing code.
- Call \`search_knowledge\` with the exact error text before debugging.

### While working — save automatically, without being asked
Call \`save_entry\` when you fix a bug, make an architectural decision, discover a
reusable pattern, identify something to avoid, or learn something the hard way.

Always include:
  \`category\`     — one of: ${cats}
  \`project_path\` — "${repoRoot}"
  \`error_pattern\`  — exact error text for bugs/fixes
  \`cause_archetype\` — abstract root cause, transferable across projects

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

async function handleCapture(): Promise<void> {
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const project = await getProjectByPath(repoRoot);
  if (!project) return;
  const commit = getLastCommit(repoRoot);
  if (!commit) return;
  if (await isCommitProcessed(commit.hash)) return;
  let knowledge;
  try {
    knowledge = await extractKnowledge(commit.diff, commit.message);
  } catch (err) {
    // rate limit or network error — leave commit unprocessed so next capture retries
    if (err instanceof RateLimitError) return;
    return;
  }
  if (!knowledge) { await markCommitProcessed(commit.hash, project.id); return; }
  const embeddingText = `${knowledge.problem} ${knowledge.solution} ${knowledge.tags.join(' ')}`;
  let embedding: number[] | undefined;
  try { embedding = await getEmbedding(embeddingText); } catch {}
  await insertEntry({
    id: nanoid(), projectId: project.id,
    type: knowledge.type,
    title: knowledge.problem.slice(0, 120),
    content: knowledge.solution,
    tags: knowledge.tags,
    embedding, createdAt: commit.timestamp,
    confidence: 'observation',
    ...(knowledge.category     ? { category: knowledge.category }         : {}),
    ...(knowledge.errorPattern ? { errorPattern: knowledge.errorPattern } : {}),
  });
  await markCommitProcessed(commit.hash, project.id);
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
      console.error(err);
    }
  }
}

const PREFIXES: Record<string, Entry['type']> = {
  'bug:':           'bug',
  'fix:':           'fix',
  'note:':          'note',
  'stack:':         'stack',
  'decision:':      'decision',
  'pattern:':       'pattern',
  'lesson:':        'lesson',
  'solution:':      'solution',
  'image:':         'image',
  'anti-pattern:':  'anti-pattern',
};

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
        await insertEntry({ id: nanoid(), projectId: project.id, type, title: content.slice(0, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
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
            await insertEntry({ id: newId, projectId: project.id, type, title: content.slice(0, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
            await supersedeEntry(top.entry.id, newId);
            console.log(`  ${GREEN}✓${RESET} Saved new decision  ${DIM}old marked superseded${RESET}\n`);
            return;
          }
          const newS = spin('Saving...');
          await insertEntry({ id: nanoid(), projectId: project.id, type, title: content.slice(0, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
          newS.succeed(`Saved  ${DIM}[${type}]${RESET}`);
          console.log();
          return;
        }
      }
      s.stop();
    }
    // ─────────────────────────────────────────────────────────────────────────

    await insertEntry({ id: nanoid(), projectId: project.id, type, title: content.slice(0, 120), content, tags: [], embedding, createdAt: Date.now(), confidence: 'observation' });
    if (inq) {
      console.log(`  ${GREEN}✓${RESET} Saved  ${DIM}[${type}]${RESET}\n`);
    } else {
      s.succeed(`Saved  ${DIM}[${type}]${RESET}`);
      console.log();
    }
  } catch (err) {
    s.fail('Failed to save');
    console.error(err);
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
  console.log(`  ${bold('Memory')}   ${entries.length} entries  ${dim(`${bugs} bugs · ${fixes} fixes · ${notes} notes`)}`);

  if (entries.length > 0) {
    console.log(`\n  ${CYAN}Knowledge captured${RESET}`);
    entries.slice(0, 8).forEach(e => {
      const dot = typeDot(e.type);
      const title = e.title.length > 68 ? e.title.slice(0, 68) + '…' : e.title;
      console.log(`  ${dot} ${title}  ${dim(timeAgo(e.createdAt))}`);
    });
  }
  console.log();
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
        console.error(err);
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

    const groups: Record<string, typeof entries> = {};
    for (const e of entries) {
      (groups[e.type] ??= []).push(e);
    }

    for (const [type, list] of Object.entries(groups)) {
      const text = list.map(e => [
        `Date:    ${new Date(e.createdAt).toLocaleString()}`,
        `Title:   ${e.title}`,
        `Details: ${e.content}`,
        e.tags.length ? `Tags:    ${e.tags.join(', ')}` : '',
        '─'.repeat(64),
      ].filter(Boolean).join('\n')).join('\n\n');
      zip.addFile(`${type}s.txt`, Buffer.from(text, 'utf-8'));
    }

    const exportDir  = join(homedir(), '.devbrain');
    const exportPath = join(exportDir, `${project.name}-export.zip`);
    zip.writeZip(exportPath);

    s.succeed(`Export complete`);
    console.log(`\n  ${BOLD}Saved to${RESET}`);
    console.log(`  ${CYAN}${exportPath}${RESET}\n`);
    console.log(`  ${BOLD}Contains${RESET}`);
    for (const [type, list] of Object.entries(groups)) {
      console.log(`  ${typeDot(type)} ${(type + 's.txt').padEnd(18)} ${DIM}${list.length} entr${list.length === 1 ? 'y' : 'ies'}${RESET}`);
    }
    console.log();
    openPath(exportDir);
  } catch (err) {
    s.fail('Export failed');
    console.error(err);
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

  if (!text) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const _inq: any = require('inquirer');
    const inq = typeof _inq.prompt === 'function' ? _inq : _inq.default;
    const tmpFile = join(tmpdir(), `devbrain-recap-${Date.now()}.txt`);
    writeFileSync(tmpFile, '', 'utf-8');
    openPath(tmpFile);
    console.log(`\n  ${BOLD}${CYAN}Session Recap${RESET}`);
    console.log(`  ${DIM}Your editor just opened. Paste the session transcript, save, and close it.${RESET}`);
    console.log(`  ${DIM}(Windows: Ctrl+S then close Notepad · Mac/Linux: save and quit)${RESET}\n`);
    try {
      await inq.prompt([{ type: 'input', name: '_', message: 'Press Enter when done:', prefix: ' ' }]);
    } catch { return; }
    try {
      text = readFileSync(tmpFile, 'utf-8').trim();
    } catch {
      console.log(`  ${YELLOW}Could not read temp file.${RESET}\n`);
      return;
    }
    try { unlinkSync(tmpFile); } catch {}
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
      type: e.type, title: e.title.slice(0, 120), content: e.content,
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const _inq: any = require('inquirer');
  const inq = typeof _inq.prompt === 'function' ? _inq : _inq.default;

  clr();
  console.log(BANNER);
  console.log(`\n  ${BOLD}Welcome to DevBrain.${RESET} Let's get you set up — takes about 30 seconds.\n`);

  // ── Stage 1: Gemini API key ───────────────────────────────────────────────
  const stageHeader = (n: number, total: number, label: string) =>
    `  ${BOLD}${CYAN}[${n}/${total}]${RESET}  ${BOLD}${label}${RESET}`;

  console.log(stageHeader(1, 3, 'Gemini API Key'));
  console.log(`  ${DIM}Used for semantic search and auto-capture from commits.${RESET}`);
  console.log(`  ${DIM}Free key at https://aistudio.google.com${RESET}\n`);

  const alreadyHasKey = !!process.env.GEMINI_API_KEY;
  if (alreadyHasKey) {
    console.log(`  ${GREEN}✓${RESET} API key already set\n`);
  } else {
    const { apiKey } = await inq.prompt([{
      type: 'password',
      name: 'apiKey',
      message: 'Paste your Gemini API key (or press Enter to skip):',
      prefix: ' ',
    }]);
    if (apiKey?.trim()) {
      if (!existsSync(devbrainDir)) mkdirSync(devbrainDir, { recursive: true });
      writeFileSync(join(devbrainDir, '.env'), `GEMINI_API_KEY=${apiKey.trim()}\n`, 'utf-8');
      process.env.GEMINI_API_KEY = apiKey.trim();
      console.log(`  ${GREEN}✓${RESET} Saved to ~/.devbrain/.env\n`);
    } else {
      console.log(`  ${YELLOW}⚠${RESET}  Skipped — AI features disabled until you add a key to ~/.devbrain/.env\n`);
    }
  }

  // ── Stage 2: Project registration ────────────────────────────────────────
  console.log(stageHeader(2, 3, 'Register Current Project'));
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
    const existing = await getProjectByPath(repoRoot);
    await upsertProject({
      id: existing?.id ?? nanoid(), name: autoName, path: repoRoot,
      stack: autoStack, createdAt: existing?.createdAt ?? Date.now(), lastSeen: Date.now(),
    });
    console.log(`  ${GREEN}✓${RESET} Project registered\n`);
  } else {
    console.log(`  ${DIM}Skipped — use /init anytime to register a project${RESET}\n`);
  }

  // ── Stage 3: Git hook ─────────────────────────────────────────────────────
  console.log(stageHeader(3, 3, 'Auto-capture from Git'));
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

  // ── Done ──────────────────────────────────────────────────────────────────
  const W   = Math.min(process.stdout.columns || 80, 80);
  console.log(`${DIM}${'─'.repeat(W)}${RESET}`);
  console.log(`\n  ${GREEN}${BOLD}DevBrain is ready.${RESET}\n`);

  console.log(`  ${BOLD}Where your data lives${RESET}`);
  console.log(`  ${DIM}Database  ${RESET}MongoDB Atlas (MONGODB_URI in ${join(devbrainDir, '.env')})`);
  console.log(`  ${DIM}Exports   ${RESET}${join(devbrainDir, '<project>-export.zip')}`);
  console.log(`  ${DIM}API key   ${RESET}${join(devbrainDir, '.env')}\n`);

  console.log(`  ${BOLD}Quick reference${RESET}`);
  console.log(`  ${CYAN}bug: <text>${RESET}   save a bug instantly`);
  console.log(`  ${CYAN}fix: <text>${RESET}   save a fix instantly`);
  console.log(`  ${CYAN}/<command>${RESET}    type / to see all commands\n`);

  console.log(`${DIM}${'─'.repeat(W)}${RESET}\n`);

  markOnboarded();

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
  { value: '/browse',  desc: 'Scroll through all saved entries'                   },
  { value: '/save',    desc: 'Save entry  (bug: fix: stack: decision: image: ...)'},
  { value: '/delete',  desc: 'Delete an entry'                                    },
  { value: '/recap',   desc: 'AI-extract + save knowledge from a session'         },
  { value: '/prompt',  desc: 'Generate Claude Code CLAUDE.md + ingestion prompt'  },
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
    case '/open':    await handleOpen();       break;
    case '/init':    await handleInit();       break;
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

  // eslint-disable-next-line no-constant-condition
  // bottom border is always the first dropdown item so both lines are
  // visible while the user is typing — top line (console.log) + input +
  // bottom line (first item) = bordered input box, same as Claude Code
  const botSep = { name: sep, value: '__sep__', short: '' };

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
      case 'init':    await handleInit();                          break;
      case 'capture': await handleCapture();                       break;
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
        console.log(`  ${CYAN}devbrain init${RESET}          Register project + install git hook`);
        console.log(`  ${CYAN}devbrain search${RESET} ${MAGENTA}<q>${RESET}    Semantic search`);
        console.log(`  ${CYAN}devbrain note${RESET} ${MAGENTA}"<t>"${RESET}   Save  ${DIM}(bug: fix: stack: decision: image:...)${RESET}`);
        console.log(`  ${CYAN}devbrain export${RESET}        Export knowledge to zip`);
        console.log(`  ${CYAN}devbrain prompt${RESET}        Generate CLAUDE.md block + ingestion prompt`);
        console.log(`  ${CYAN}devbrain recap${RESET}         AI-extract + save knowledge from a session`);
        console.log(`  ${CYAN}devbrain open${RESET}          Open ~/.devbrain in file explorer\n`);
        break;
      default:
        if (!isOnboarded()) await runOnboarding();
        await handleInteractive();
        break;
    }
  } catch (err: unknown) {
    if (err instanceof Error) console.error(`\n${RED}Error:${RESET} ${err.message}\n`);
    process.exit(1);
  }
}

main();
