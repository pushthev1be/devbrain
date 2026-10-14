/**
 * Claude Code's own settings files, where the npm CLI installs DevBrain's hooks
 * (`devbrain hooks`, and the last step of `devbrain init`).
 *
 * A module of its own so the plugin build can leave it out (OMITTED_FROM_PLUGIN
 * in scripts/bundle.mjs). The plugin brings its own hooks and never touches
 * these files, and Anthropic's plugin directory holds a plugin that reads
 * ~/.claude/settings.json -- where an apiKeyHelper or API keys can live -- and
 * writes commands into it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { installedDevbrainHooks } from '@devbrain/core';

export function agentSettingsPath(repoRoot: string, global: boolean): string {
  return global
    ? join(homedir(), '.claude', 'settings.json')
    : join(repoRoot, '.claude', 'settings.local.json');
}

export function readAgentSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf-8').replace(/^﻿/, '').trim();
  // Refuse to overwrite a file we cannot parse — it is the user's config.
  return raw ? JSON.parse(raw) : {};
}

export function writeAgentSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

/** True when Claude Code runs DevBrain's hooks here, from project or user settings. */
export function agentHooksInstalled(repoRoot: string): boolean {
  for (const global of [false, true]) {
    try {
      if (installedDevbrainHooks(readAgentSettings(agentSettingsPath(repoRoot, global))).length) return true;
    } catch { /* unreadable settings: treat as not installed */ }
  }
  return false;
}
