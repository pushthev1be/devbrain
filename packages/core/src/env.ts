// Reading ~/.devbrain/.env, which is where `devbrain setup` puts MONGODB_URI,
// GEMINI_API_KEY and the Vertex AI variables. The npm CLI only: the plugin build
// reads its settings from Claude Code instead, through usePluginSettings.
//
// This lived twice, copied between the CLI and the MCP server, which is how the
// two drifted into disagreeing about a case neither of them was tested on.

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/** Parse `.env` text into pairs. Blank lines and `#` comments are skipped. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Strip a UTF-8 BOM: Notepad and PowerShell's `>` both write one, and it
  // would otherwise become part of the first key's name.
  for (const line of text.replace(/^﻿/, '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...rest] = trimmed.split('=');
    const key = k?.trim();
    // A value may legitimately contain '=' — a Mongo URI usually does.
    if (key && rest.length) out[key] = rest.join('=').trim();
  }
  return out;
}

/**
 * True when an environment variable carries no usable value.
 *
 * An empty string has to count as absent, and this is not a nicety. A launcher
 * that substitutes a value the user never filled in sets the variable to ""
 * rather than leaving it out: the Claude Code plugin manifest passes
 * `MONGODB_URI: "${user_config.mongodb_uri}"`, and leaving that optional field
 * blank — the default, and what the field's own description recommends — sets
 * it to the empty string.
 *
 * With a `=== undefined` check, "" counted as "the user set this deliberately",
 * so the configured MONGODB_URI in ~/.devbrain/.env was never loaded, and
 * db.ts's own `!uri.trim()` test then quietly chose local JSON storage. The
 * plugin installed, connected, answered every call and found nothing, with no
 * error anywhere. Reproduced directly: `MONGODB_URI="" devbrain search
 * "Illegal return statement"` printed "No matches found" where the same search
 * without the variable found the entry.
 */
function unset(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

/** Path of the config file `devbrain setup` writes. */
export function globalEnvPath(): string {
  return join(homedir(), '.devbrain', '.env');
}

/**
 * Load ~/.devbrain/.env into process.env.
 *
 * A real environment variable wins over the file, so `MONGODB_URI=… devbrain …`
 * and a container's injected config both still override it — but only when it
 * actually carries a value. Returns the names of the keys it set.
 */
export function loadGlobalEnv(path: string = globalEnvPath()): string[] {
  if (!existsSync(path)) return [];
  const applied: string[] = [];
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(path, 'utf-8')))) {
    if (unset(process.env[key])) { process.env[key] = value; applied.push(key); }
  }
  return applied;
}

/**
 * In the Claude Code plugin, take the database from the plugin's own settings
 * and from nothing else on the machine.
 *
 * Claude Code hands the `mongodb_uri` option to hooks as
 * CLAUDE_PLUGIN_OPTION_MONGODB_URI and to the MCP server as DEVBRAIN_MONGODB_URI,
 * which plugin.json sets from `${user_config.mongodb_uri}`. A MONGODB_URI the
 * user's shell or project happens to carry is theirs, usually for their own app,
 * and is overwritten here: read, it would have put DevBrain's memory in that
 * app's database. Anthropic's plugin directory holds a plugin that reads a
 * credential from the machine rather than from a value the user chose to share.
 *
 * Unset in both means local storage, the same as an empty option.
 */
export function usePluginSettings(env: NodeJS.ProcessEnv = process.env): void {
  env.MONGODB_URI = env.CLAUDE_PLUGIN_OPTION_MONGODB_URI ?? env.DEVBRAIN_MONGODB_URI ?? '';
}
