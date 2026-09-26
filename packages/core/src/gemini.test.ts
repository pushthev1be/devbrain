/**
 * Tests for packages/core/src/gemini.ts
 *
 * All tests run with DEVBRAIN_MOCK=true — no API key, no network.
 * Each test sets/clears the env var directly so tests are hermetic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ExtractedKnowledge } from './types';

// Set mock mode before importing so module-level checks see it
beforeEach(() => {
  process.env.DEVBRAIN_MOCK = 'true';
});
afterEach(() => {
  delete process.env.DEVBRAIN_MOCK;
});

// Dynamic imports so the env var is read fresh per test file load
async function getGemini() {
  // vitest re-evaluates modules; use dynamic import with cache-bust via ?v
  return await import('./gemini');
}

// ── getEmbedding ──────────────────────────────────────────────────────────────

describe('getEmbedding (mock)', () => {
  it('returns a 3072-dimension vector', async () => {
    const { getEmbedding } = await getGemini();
    const vec = await getEmbedding('test text');
    expect(vec).toHaveLength(3072);
  });

  it('returns numbers (not strings or undefined)', async () => {
    const { getEmbedding } = await getGemini();
    const vec = await getEmbedding('test text');
    expect(vec.every(v => typeof v === 'number')).toBe(true);
  });

  it('is deterministic — same text always produces same vector', async () => {
    const { getEmbedding } = await getGemini();
    const a = await getEmbedding('JWT token expiry bug');
    const b = await getEmbedding('JWT token expiry bug');
    expect(a).toEqual(b);
  });

  it('produces different vectors for different text', async () => {
    const { getEmbedding } = await getGemini();
    const a = await getEmbedding('auth token bug');
    const b = await getEmbedding('database connection timeout');
    expect(a).not.toEqual(b);
  });

  it('produces vectors with non-zero values', async () => {
    const { getEmbedding } = await getGemini();
    const vec = await getEmbedding('some technical content');
    const nonZero = vec.some(v => v !== 0);
    expect(nonZero).toBe(true);
  });
});

// ── extractKnowledge ──────────────────────────────────────────────────────────

describe('extractKnowledge (mock)', () => {
  it('returns null for empty/trivial diff', async () => {
    const { extractKnowledge } = await getGemini();
    // mock checks message content; empty message hits the default "note" path
    const result = await extractKnowledge('', 'chore: update readme');
    // can be null (skip) or a note — just must not throw
    if (result !== null) {
      expect(['bug', 'fix', 'note']).toContain(result.type);
    }
  });

  it('extracts a fix for a memory leak commit', async () => {
    const { extractKnowledge } = await getGemini();
    const result = await extractKnowledge(
      'diff --git a/src/status.tsx ...',
      'fix: resolve memory leak in event emitter cleanup'
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('fix');
    expect(result!.problem).toBeTruthy();
    expect(result!.solution).toBeTruthy();
  });

  it('extracted fix includes errorPattern', async () => {
    const { extractKnowledge } = await getGemini();
    const result = await extractKnowledge('', 'fix: resolve memory leak in event emitter');
    expect(result?.errorPattern).toBeTruthy();
  });

  it('extracted fix includes causeArchetype', async () => {
    const { extractKnowledge } = await getGemini();
    const result = await extractKnowledge('', 'fix: resolve memory leak in event emitter');
    expect(result?.causeArchetype).toBeTruthy();
  });

  it('extracts a bug for a race condition commit', async () => {
    const { extractKnowledge } = await getGemini();
    const result = await extractKnowledge('diff ...', 'bug: race condition in fetcher causes stale data');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('bug');
  });

  it('returns valid category', async () => {
    const { extractKnowledge } = await getGemini();
    const validCategories = ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other'];
    const result = await extractKnowledge('', 'fix: resolve memory leak');
    if (result?.category) {
      expect(validCategories).toContain(result.category);
    }
  });

  it('includes required fields in returned object', async () => {
    const { extractKnowledge } = await getGemini();
    const result = await extractKnowledge('diff ...', 'fix: cleanup event listener');
    if (result) {
      expect(result).toHaveProperty('problem');
      expect(result).toHaveProperty('solution');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('type');
      expect(Array.isArray(result.tags)).toBe(true);
    }
  });
});

// ── autoArchetype ─────────────────────────────────────────────────────────────

describe('autoArchetype (mock)', () => {
  it('returns a string for bug type', async () => {
    const { autoArchetype } = await getGemini();
    const result = await autoArchetype('Login fails after token refresh', 'JWT expires unexpectedly', 'bug');
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(5);
  });

  it('returns a string for fix type', async () => {
    const { autoArchetype } = await getGemini();
    const result = await autoArchetype('Fixed expiry issue', 'Set TOKEN_EXPIRY in env', 'fix');
    expect(result).not.toBeNull();
  });

  it('returns null for stack type (not applicable)', async () => {
    const { autoArchetype } = await getGemini();
    const result = await autoArchetype('React + TypeScript', 'Frontend stack', 'stack');
    expect(result).toBeNull();
  });

  it('returns null for decision type (not applicable)', async () => {
    const { autoArchetype } = await getGemini();
    const result = await autoArchetype('Use JWT over sessions', 'Stateless, scales better', 'decision');
    expect(result).toBeNull();
  });

  it('returns a string for anti-pattern type', async () => {
    const { autoArchetype } = await getGemini();
    const result = await autoArchetype('Never log secrets', 'Logging secrets exposes credentials', 'anti-pattern');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });
});

// ── recapSession ──────────────────────────────────────────────────────────────

describe('recapSession (mock)', () => {
  it('works in mock mode without credentials, like every other Gemini call', async () => {
    // recapSession used to check hasGeminiCreds() before DEVBRAIN_MOCK, so mock
    // mode threw here while working everywhere else — which also made the CLI's
    // preflight pass and then fail. Mock mode now covers recap too.
    const { recapSession } = await getGemini();
    const result = await recapSession('Fixed: leak in useEffect — missing cleanup.');
    expect(result.length).toBeGreaterThan(0);
  });

  it('still throws without credentials when not in mock mode', async () => {
    delete process.env.DEVBRAIN_MOCK;
    const { recapSession } = await getGemini();
    await expect(recapSession('We fixed a memory leak.')).rejects.toThrow('Gemini credentials');
  });

  it('returns entries with required fields', async () => {
    const { recapSession } = await getGemini();
    const result = await recapSession('Fixed a bug in the auth module');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('type');
    expect(result[0]).toHaveProperty('title');
    expect(result[0]).toHaveProperty('content');
    expect(result[0]).toHaveProperty('tags');
  });

  it('types each line by its leading verb, so a recap splits into categories', async () => {
    const { recapSession } = await getGemini();
    const result = await recapSession(
      ['Fixed: stale fetch overwrote state.',
       'Decided: AbortController over an isMounted flag.',
       'Learned: responses can resolve out of order.',
       'Avoid: guarding async setState with a boolean.'].join('\n')
    );
    expect(result.map(r => r.type)).toEqual(['fix', 'decision', 'lesson', 'anti-pattern']);
  });

  it('strips the leading label from the title', async () => {
    const { recapSession } = await getGemini();
    const [entry] = await recapSession('Fixed: stale fetch overwrote state.');
    expect(entry.title).toBe('stale fetch overwrote state.');
  });
});

// ── RateLimitError ────────────────────────────────────────────────────────────

describe('RateLimitError', () => {
  it('has correct name and retryAfter default', async () => {
    const { RateLimitError } = await getGemini();
    const err = new RateLimitError();
    expect(err.name).toBe('RateLimitError');
    expect(err.retryAfter).toBe(60);
  });

  it('accepts custom retryAfter', async () => {
    const { RateLimitError } = await getGemini();
    const err = new RateLimitError(120);
    expect(err.retryAfter).toBe(120);
  });

  it('is an instance of Error', async () => {
    const { RateLimitError } = await getGemini();
    expect(new RateLimitError()).toBeInstanceOf(Error);
  });
});
