/**
 * `devbrain setup`: the first-run wizard, and the credential checks only it uses.
 *
 * A module of its own so the plugin build can leave it out (OMITTED_FROM_PLUGIN
 * in scripts/bundle.mjs). The plugin takes its settings from Claude Code, and
 * Anthropic's plugin directory holds a plugin whose code reads credentials such
 * as GEMINI_API_KEY from the machine, whether or not that code can run. The npm
 * CLI requires this only when the wizard runs; the plugin build answers `setup`
 * with a pointer to its settings instead and never reaches the stub.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { describeStorage, getLocalDbPath, getProjectName, getRepoRoot, globalEnvPath } from '@devbrain/core';
import { BOLD, DIM, CYAN, GREEN, YELLOW, RESET, BANNER, clr } from './term';

/** What the wizard needs from the CLI that runs it. */
export interface OnboardingSteps {
  markOnboarded(): void;
  handleInit(): Promise<void>;
}

const envFilePath = globalEnvPath();

// Merge keys into ~/.devbrain/.env in place. Never rewrites the whole file —
// writing one credential must not wipe out the others already stored there.
function writeEnvVars(vars: Record<string, string>): void {
  mkdirSync(dirname(envFilePath), { recursive: true });
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

export async function runOnboarding(steps: OnboardingSteps): Promise<void> {
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
  steps.markOnboarded();

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
    await steps.handleInit();
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
