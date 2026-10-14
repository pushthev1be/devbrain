/**
 * The case these tests exist for: a variable set to the empty string.
 *
 * The Claude Code plugin manifest passes `MONGODB_URI: "${user_config.mongodb_uri}"`,
 * and that option is optional — its own description tells people to leave it
 * blank for local storage. Blank substitutes as "", so the plugin's server
 * started with MONGODB_URI set to an empty string, the loader read that as
 * "deliberately set" and skipped ~/.devbrain/.env, and db.ts then chose local
 * JSON because the URI was empty. Every call answered and found nothing, with
 * no error anywhere.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseEnvFile, loadGlobalEnv, globalEnvPath, usePluginSettings } from './env';

const KEY = 'DEVBRAIN_ENV_TEST_URI';
let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'devbrain-env-'));
  file = join(dir, '.env');
  delete process.env[KEY];
});

afterEach(() => {
  delete process.env[KEY];
  rmSync(dir, { recursive: true, force: true });
});

describe('parseEnvFile', () => {
  it('keeps everything after the first = , because a Mongo URI contains one', () => {
    const uri = 'mongodb+srv://user:p@ss@cluster.example.net/?retryWrites=true&w=majority';
    expect(parseEnvFile(`MONGODB_URI=${uri}`).MONGODB_URI).toBe(uri);
  });

  it('skips blank lines and comments', () => {
    expect(parseEnvFile('\n# MONGODB_URI=commented-out\n\nA=1\n')).toEqual({ A: '1' });
  });

  // Notepad and PowerShell's `>` both write a BOM, which would otherwise become
  // part of the first key's name and make that key unreadable.
  it('strips a leading BOM rather than folding it into the first key', () => {
    expect(parseEnvFile('﻿GEMINI_API_KEY=abc')).toEqual({ GEMINI_API_KEY: 'abc' });
  });

  it('ignores a line with no = at all', () => {
    expect(parseEnvFile('NOT_AN_ASSIGNMENT\nA=1')).toEqual({ A: '1' });
  });
});

describe('loadGlobalEnv', () => {
  it('loads a key that is not in the environment', () => {
    writeFileSync(file, `${KEY}=from-file`);
    expect(loadGlobalEnv(file)).toEqual([KEY]);
    expect(process.env[KEY]).toBe('from-file');
  });

  it('leaves a real environment variable alone', () => {
    process.env[KEY] = 'from-environment';
    writeFileSync(file, `${KEY}=from-file`);
    expect(loadGlobalEnv(file)).toEqual([]);
    expect(process.env[KEY]).toBe('from-environment');
  });

  // The regression. An unfilled plugin option arrives as "", which is not a
  // choice the user made, so the file still has to win.
  it('treats an empty variable as absent, so an unfilled plugin option still reads the file', () => {
    process.env[KEY] = '';
    writeFileSync(file, `${KEY}=from-file`);
    expect(loadGlobalEnv(file)).toEqual([KEY]);
    expect(process.env[KEY]).toBe('from-file');
  });

  it('treats a whitespace-only variable as absent too', () => {
    process.env[KEY] = '   ';
    writeFileSync(file, `${KEY}=from-file`);
    expect(process.env[KEY]).toBe('   ');
    loadGlobalEnv(file);
    expect(process.env[KEY]).toBe('from-file');
  });

  it('is a no-op when the file does not exist', () => {
    expect(loadGlobalEnv(join(dir, 'absent', '.env'))).toEqual([]);
  });

  it('defaults to the path devbrain setup writes', () => {
    const path = globalEnvPath();
    expect(path.endsWith('.env')).toBe(true);
    expect(path).toContain('.devbrain');
  });
});

// The plugin reads the database from its own settings: the option Claude Code
// exports to hooks, or the variable plugin.json gives the MCP server. Never a
// MONGODB_URI the machine already had, which is usually the user's own app's.
describe('usePluginSettings', () => {
  const machine = 'mongodb://the-users-own-app/db';
  const chosen = 'mongodb+srv://devbrain.example.net/memory';

  it('takes the option Claude Code exports to hooks', () => {
    const env: NodeJS.ProcessEnv = { MONGODB_URI: machine, CLAUDE_PLUGIN_OPTION_MONGODB_URI: chosen };
    usePluginSettings(env);
    expect(env.MONGODB_URI).toBe(chosen);
  });

  it('takes the variable plugin.json sets for the MCP server', () => {
    const env: NodeJS.ProcessEnv = { MONGODB_URI: machine, DEVBRAIN_MONGODB_URI: chosen };
    usePluginSettings(env);
    expect(env.MONGODB_URI).toBe(chosen);
  });

  it('keeps an option left blank blank, which means local storage', () => {
    const env: NodeJS.ProcessEnv = { MONGODB_URI: machine, CLAUDE_PLUGIN_OPTION_MONGODB_URI: '' };
    usePluginSettings(env);
    expect(env.MONGODB_URI).toBe('');
  });

  it('ignores a MONGODB_URI the machine had when neither is set', () => {
    const env: NodeJS.ProcessEnv = { MONGODB_URI: machine };
    usePluginSettings(env);
    expect(env.MONGODB_URI).toBe('');
  });
});
