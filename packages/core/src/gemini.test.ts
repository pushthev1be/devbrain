/**
 * Tests for packages/core/src/gemini.ts
 *
 * All tests run with DEVBRAIN_MOCK=true — no API key, no network.
 * Each test sets/clears the env var directly so tests are hermetic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

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

// ── the timeout ───────────────────────────────────────────────────────────────
//
// A `.catch` does not cover a hang: when the API stalls rather than fails the
// promise never settles, and the caller waits for ever. That is what made
// `devbrain search` sit there with no output and no error, and the same stall
// inside a hook would hold the agent's turn open.
describe('within (the Gemini timeout)', () => {
  it('passes a value through when the work finishes in time', async () => {
    const { within } = await getGemini();
    await expect(within(Promise.resolve('ok'), 500)).resolves.toBe('ok');
  });

  it('rejects rather than waiting on a promise that never settles', async () => {
    const { within } = await getGemini();
    const neverSettles = new Promise<string>(() => {});
    await expect(within(neverSettles, 30, 'Embedding')).rejects.toThrow(/Embedding timed out after 30ms/);
  });

  it('keeps the original failure when the work rejects first', async () => {
    const { within } = await getGemini();
    await expect(within(Promise.reject(new Error('bad auth')), 500)).rejects.toThrow('bad auth');
  });

  // The timer must not keep the process alive after a fast success, or every
  // CLI command would hang for the length of the timeout before exiting.
  it('clears its timer once the work settles', async () => {
    const { within } = await getGemini();
    const before = process.getActiveResourcesInfo?.().length ?? 0;
    await within(Promise.resolve(1), 10_000);
    const after = process.getActiveResourcesInfo?.().length ?? 0;
    expect(after).toBeLessThanOrEqual(before);
  });
});
