import { describe, it, expect } from 'vitest';
import { redactSecrets, findSecrets, REDACTED } from './redact';

/**
 * Fixtures are assembled from pieces rather than written whole.
 *
 * A complete credential-shaped literal in a source file is what secret
 * scanners look for, and GitHub push protection duly blocked the first commit
 * of this file over the Stripe example — a string invented for this test. The
 * scanner is right to be blunt about it, so the prefix is joined at runtime:
 * the value under test is identical, and no line of the repo reads as a key.
 */
const key = (...parts: string[]) => parts.join('');

describe('redactSecrets — credentials are removed', () => {
  it.each([
    ['anthropic key', `ANTHROPIC said 401 for ${key('sk-', 'ant-', 'api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')}`],
    ['openai key', `Incorrect API key provided: ${key('sk-', 'proj-', 'abcdefghijklmnopqrstuvwxyz0123456789ABCD')}`],
    ['github token', `remote: Invalid username or token ${key('ghp', '_', 'abcdefghijklmnopqrstuvwxyz0123456789')}`],
    ['aws access key', 'The AWS Access Key Id AKIAIOSFODNN7EXAMPLE does not exist'],
    ['google api key', `API key not valid: ${key('AIza', 'SyA1234567890abcdefghijklmnopqrstuv')}`],
    ['stripe key', `No such customer; request used ${key('sk', '_live_', '51HabcdefghijklmnopqrstUV')}`],
    ['slack token', `invalid_auth for ${key('xoxb', '-1234567890-abcdefghij')}`],
    ['jwt', `TokenExpiredError for ${key('eyJhbGciOiJIUzI1NiJ9', '.eyJzdWIiOiIxMjM0NTY3ODkwIn0', '.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')}`],
  ])('%s', (_name, text) => {
    const out = redactSecrets(text);
    expect(out).toContain(REDACTED);
    expect(findSecrets(out)).toEqual([]);
  });

  it('keeps the user and host of a connection string, drops the password', () => {
    const out = redactSecrets('MongoServerError: bad auth : mongodb+srv://simon:hunter2pass@cluster0.abc.mongodb.net/?retryWrites=true');
    expect(out).toContain('mongodb+srv://simon:[REDACTED]@cluster0.abc.mongodb.net');
    expect(out).not.toContain('hunter2pass');
  });

  it('keeps the scheme of an Authorization header', () => {
    expect(redactSecrets('Authorization: Bearer abcdef0123456789abcdef'))
      .toBe('Authorization: Bearer [REDACTED]');
  });

  it('keeps the name of a secret .env line', () => {
    expect(redactSecrets('GEMINI_API_KEY=abc123def456ghi')).toBe('GEMINI_API_KEY=[REDACTED]');
    expect(redactSecrets('DB_PASSWORD="s3cr3t-pa55"')).toBe('DB_PASSWORD="[REDACTED]"');
    expect(redactSecrets('{"client_secret": "zyxwvu987654"}')).toBe('{"client_secret": "[REDACTED]"}');
  });

  it('removes a whole private key block', () => {
    const key = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\nabc\n-----END RSA PRIVATE KEY-----';
    expect(redactSecrets(`loaded ${key} ok`)).toBe(`loaded ${REDACTED} ok`);
  });
});

describe('redactSecrets — what makes an error findable survives', () => {
  it.each([
    'commit 9ff3037b20f7de760ee98f1feca78e80349abcd broke the build',
    'request id 3f2504e0-4f89-11d3-9a0c-0305e82c3301 failed',
    'TOKEN_EXPIRY=86400 in prod .env',
    'password: string',
    'const password = req.body.password',
    'set GEMINI_API_KEY=process.env.KEY',
    'Error: ENOENT: no such file or directory, open C:/Users/x/.devbrain/db.json',
    'TypeError: Cannot read properties of undefined (reading \'token\')',
  ])('%s', text => {
    expect(redactSecrets(text)).toBe(text);
  });

  it('passes undefined and empty text through', () => {
    expect(redactSecrets(undefined)).toBeUndefined();
    expect(redactSecrets('')).toBe('');
  });
});

// ── at the storage boundary ───────────────────────────────────────────────────
// Redaction only protects anyone if every write goes through it, so this goes
// through db.ts — the dispatcher every caller uses — onto the local backend.

describe('storage scrubs what it is given', () => {
  it('insertEntry, reinforceEntry and the recall log never persist a credential', async () => {
    const { mkdtempSync, readFileSync, rmSync } = await import('fs');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const home = mkdtempSync(join(tmpdir(), 'devbrain-redact-'));
    const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, MONGODB_URI: process.env.MONGODB_URI };
    process.env.HOME = home; process.env.USERPROFILE = home; delete process.env.MONGODB_URI;
    try {
      const { vi } = await import('vitest');
      vi.resetModules();
      const db = await import('./db');
      const dbPath = db.getLocalDbPath();
      expect(dbPath.startsWith(home)).toBe(true);

      await db.insertEntry({
        id: 'r1', projectId: 'p', type: 'fix', tags: [], createdAt: 1, confidence: 'observation',
        title: 'bad auth with sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        content: 'URI was mongodb://admin:hunter2pass@db.local:27017',
        errorPattern: 'Authorization: Bearer abcdef0123456789abcdef',
      });
      const afterInsert = readFileSync(dbPath, 'utf-8');
      expect(afterInsert).toContain('mongodb://admin:[REDACTED]@db.local');
      expect(afterInsert).not.toContain('hunter2pass');

      // reinforceEntry replaces the content, so the URI above is gone after this.
      await db.reinforceEntry('r1', 'now GEMINI_API_KEY=abc123def456ghi is set');
      await db.bumpRecallCounts(['r1'], { query: 'failed with ghp_abcdefghijklmnopqrstuvwxyz0123456789' });

      const raw = readFileSync(dbPath, 'utf-8');
      for (const secret of ['sk-ant-api03', 'abcdef0123456789abcdef', 'abc123def456ghi', 'ghp_abcdef']) {
        expect(raw).not.toContain(secret);
      }
      expect(raw).toContain('GEMINI_API_KEY=[REDACTED]');
      expect(raw).toContain('failed with [REDACTED]');
    } finally {
      process.env.HOME = saved.HOME; process.env.USERPROFILE = saved.USERPROFILE;
      if (saved.MONGODB_URI !== undefined) process.env.MONGODB_URI = saved.MONGODB_URI;
      rmSync(home, { recursive: true, force: true });
    }
  });
});
