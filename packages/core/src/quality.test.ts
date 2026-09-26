/**
 * Tests for enforceEntryQuality — the mechanical floor under extraction.
 *
 * What auto-capture chooses to keep matters more than anything downstream: a
 * reader who opens the dashboard and finds six dependency-bump summaries will not
 * open it again. The prompt carries the judgement, but a model drifts, so the
 * objectively checkable rules are enforced in code:
 *   - titles state a symptom, not a narration of the diff
 *   - errorPattern holds a literal error, not a template lifted from source
 *   - tags stay few enough to scan
 *   - titles stay short enough that the UI does not cut them mid-word
 */

import { describe, it, expect } from 'vitest';
import { enforceEntryQuality } from './gemini';
import type { ExtractedKnowledge } from './types';

function k(overrides: Partial<ExtractedKnowledge> = {}): ExtractedKnowledge {
  return {
    problem: 'ADK ignores Vertex AI on Cloud Run when GOOGLE_API_KEY is set',
    solution: 'Deleting GOOGLE_API_KEY before init forces ADC, which routes to Vertex.',
    tags: ['adk', 'vertex-ai', 'cloud-run'],
    type: 'fix',
    ...overrides,
  } as ExtractedKnowledge;
}

describe('narration titles', () => {
  it('drops entries that narrate the diff instead of naming a symptom', () => {
    // These are the real titles that prompted this work.
    for (const bad of [
      'The project lacked the `@google/adk` package as a declared dependency',
      'An incorrect or unavailable version of the `@google/adk` dependency was specified',
      'This commit implemented three key features',
      'The system faced challenges related to external API dependencies',
      'the codebase was missing a cleanup step',
    ]) {
      expect(enforceEntryQuality(k({ problem: bad })), bad).toBeNull();
    }
  });

  it('keeps symptom-first titles', () => {
    for (const good of [
      'ADK ignores Vertex AI on Cloud Run when GOOGLE_API_KEY is set',
      'MongoDB $vectorSearch returns zero rows instead of erroring without an index',
      'Dashboard script fails to parse, leaving every button dead',
    ]) {
      expect(enforceEntryQuality(k({ problem: good })), good).not.toBeNull();
    }
  });

  it('drops entries with no real content', () => {
    expect(enforceEntryQuality(k({ problem: 'bug' }))).toBeNull();
    expect(enforceEntryQuality(k({ solution: 'fixed' }))).toBeNull();
    expect(enforceEntryQuality(null)).toBeNull();
  });
});

describe('error patterns', () => {
  it('rejects template strings lifted from source code', () => {
    // The live example: a format string from the codebase, not an error anyone
    // could paste into a search.
    for (const template of [
      'Gemini error {errorCode}: {errorMessage}',
      'Error: ${err.message}',
      'failed with %s',
      'connection to <HOST> refused',
    ]) {
      expect(enforceEntryQuality(k({ errorPattern: template }))?.errorPattern, template).toBeUndefined();
    }
  });

  it('keeps literal error text', () => {
    for (const real of [
      'MongoServerError: bad auth : authentication failed',
      'Gemini error 429: Rate limit exceeded',
      'SyntaxError: Unexpected string',
    ]) {
      expect(enforceEntryQuality(k({ errorPattern: real }))?.errorPattern).toBe(real);
    }
  });

  it('drops error patterns too short to match on', () => {
    expect(enforceEntryQuality(k({ errorPattern: '429' }))?.errorPattern).toBeUndefined();
  });
});

describe('tags', () => {
  it('caps at four so a card stays scannable', () => {
    // One live entry carried eleven.
    const many = ['typescript','google-cloud','vertex-ai','gemini-api','cloud-run',
                  'application-default-credentials','environment-variables','api-client',
                  'error-handling','authentication','rate-limiting'];
    expect(enforceEntryQuality(k({ tags: many }))!.tags).toHaveLength(4);
  });

  it('lowercases and de-duplicates', () => {
    expect(enforceEntryQuality(k({ tags: ['Vertex', 'vertex', 'ADK'] }))!.tags).toEqual(['vertex', 'adk']);
  });

  it('tolerates a missing tag list', () => {
    expect(enforceEntryQuality(k({ tags: undefined as never }))!.tags).toEqual([]);
  });
});

describe('title length', () => {
  it('never cuts a title mid-word', () => {
    // The dashboard showed "...which was required for integrating with Google se".
    const long = 'Vertex AI rejects the request when the configured region does not serve the requested Gemini model variant at all';
    const title = enforceEntryQuality(k({ problem: long }))!.problem;
    expect(title.length).toBeLessThanOrEqual(100);
    expect(long.startsWith(title)).toBe(true);
    expect(long[title.length]).toMatch(/\s/);   // cut landed on a word boundary
  });

  it('leaves a short title untouched', () => {
    const short = 'ADK ignores Vertex AI on Cloud Run when GOOGLE_API_KEY is set';
    expect(enforceEntryQuality(k({ problem: short }))!.problem).toBe(short);
  });

  it('collapses whitespace', () => {
    expect(enforceEntryQuality(k({ problem: 'ADK   ignores\n\nVertex on Cloud Run' }))!.problem)
      .toBe('ADK ignores Vertex on Cloud Run');
  });
});

describe('cause archetype', () => {
  it('keeps a transferable archetype', () => {
    const a = 'environment config divergence between local and deploy target';
    expect(enforceEntryQuality(k({ causeArchetype: a }))!.causeArchetype).toBe(a);
  });

  it('drops one too short to be transferable', () => {
    expect(enforceEntryQuality(k({ causeArchetype: 'bad config' }))!.causeArchetype).toBeUndefined();
  });
});
