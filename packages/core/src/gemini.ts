// Optional AI. DevBrain captures and recalls with no model at all: the coding
// agent writes every entry. When Gemini is configured it adds embeddings for
// semantic search and a few refinements (archetypes, section summaries, query
// routing); without it each of these quietly does nothing.

import { GoogleGenAI } from '@google/genai';
import type { EntryCategory } from './types';
import { ENTRY_CATEGORIES } from './types';

// Model is overridable via GEMINI_MODEL. Default is gemini-2.5-flash — the current
// Flash model, available on both the Gemini Developer API and Vertex AI (incl. the
// `global` location used by AI-Studio-origin projects, where 2.0-flash is unavailable).
const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIM = 3072;

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter = 60) {
    super(`Rate limited — retry in ${retryAfter}s`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

function parseRetryDelay(body: string): number {
  try {
    const parsed = JSON.parse(body);
    for (const d of (parsed?.error?.details ?? [])) {
      if (d.retryDelay) return parseInt(String(d.retryDelay).replace('s', ''), 10) || 60;
    }
  } catch {}
  return 60;
}

function rethrowIfRateLimit(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    throw new RateLimitError(parseRetryDelay(msg));
  }
  // "This model is currently experiencing high demand" — transient capacity, not
  // a bad request. Callers already know how to stop and resume on a rate limit,
  // which is exactly the right response to this too.
  if (/\b503\b|UNAVAILABLE|overloaded/i.test(msg)) {
    throw new RateLimitError(30);
  }
  throw err;
}

function useVertex(): boolean {
  const v = (process.env.GOOGLE_GENAI_USE_VERTEXAI ?? '').toLowerCase();
  return v === 'true' || v === '1';
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (useVertex()) {
      // Google Cloud AI path — Gemini on Vertex AI, authenticated via ADC.
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      if (!project) {
        throw new Error(
          'GOOGLE_CLOUD_PROJECT is not set. Required when GOOGLE_GENAI_USE_VERTEXAI=true. ' +
          'Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION, and ensure ADC is configured ' +
          '(gcloud auth application-default login, or a service account on Cloud Run).'
        );
      }
      client = new GoogleGenAI({ vertexai: true, project, location });
    } else {
      // Gemini Developer API path (AI Studio) — used for local/offline dev.
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          'No Gemini credentials. Set GOOGLE_GENAI_USE_VERTEXAI=true with GOOGLE_CLOUD_PROJECT ' +
          'for Vertex AI, or GEMINI_API_KEY for the Gemini Developer API.'
        );
      }
      client = new GoogleGenAI({ vertexai: false, apiKey });
    }
  }
  return client;
}

async function generateText(prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({ model: TEXT_MODEL, contents: prompt });
  return (res.text ?? '').trim();
}

/** True when a Gemini backend is configured (either Vertex AI or the Developer API). */
export function hasGeminiCreds(): boolean {
  if (useVertex()) return Boolean(process.env.GOOGLE_CLOUD_PROJECT);
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    // Return a reproducible pseudo-random vector of 3072 dimensions
    const vec = new Array(3072).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 3072; i++) {
      vec[i] = Math.sin(hash + i) * 0.1;
    }
    return vec;
  }

  try {
    const res = await getClient().models.embedContent({
      model: EMBED_MODEL,
      contents: text,
      config: { outputDimensionality: EMBED_DIM },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Embedding response contained no values');
    }
    return values;
  } catch (err) {
    rethrowIfRateLimit(err);
  }
}

export async function synthesizeSection(
  label: string,
  entries: { type: string; title: string; content: string }[]
): Promise<string | null> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    return "• ALWAYS return cleanups for event subscriptions inside React hooks\n• Standardize off-listeners in statusEmitter calls";
  }

  if (entries.length < 2 || !hasGeminiCreds()) return null;
  try {
    const items = entries
      .map(e => `[${e.type}] ${e.title}: ${e.content.slice(0, 200)}`)
      .join('\n');
    const prompt =
      `You are DevBrain, a developer knowledge system. Compress these related ${label} entries into ` +
      `2-4 bullet points capturing the essential pattern, recurring root cause, or key insight. ` +
      `Each bullet must be specific and actionable. Return ONLY the bullet points, each starting with "•", no headers.\n\n${items}`;
    return await generateText(prompt);
  } catch {
    return null;
  }
}

export async function classifyQuery(query: string): Promise<{ category: EntryCategory; errorPattern?: string }> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    const q = query.toLowerCase();
    if (q.includes('leak') || q.includes('emitter') || q.includes('react')) {
      return { category: 'performance', errorPattern: 'MaxListenersExceededWarning' };
    }
    return { category: 'other' };
  }

  const categoryList = ENTRY_CATEGORIES.join(' | ');
  try {
    const prompt =
      `Classify this developer problem query for search routing. Return ONLY valid JSON:\n` +
      `{ "category": one of [${categoryList}], "errorPattern": "extracted error text if present, else omit" }\n\n` +
      `Query: "${query}"`;
    const text   = await generateText(prompt);
    const match  = text.match(/\{[\s\S]*\}/);
    if (!match) return { category: 'other' };
    const parsed = JSON.parse(match[0]);
    return {
      category:     ENTRY_CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
      errorPattern: parsed.errorPattern ?? undefined,
    };
  } catch {
    return { category: 'other' };
  }
}

/**
 * Given a raw title + content, derive the abstract root-cause archetype that makes this
 * knowledge transferable across projects.  Returns null when not applicable (e.g. stack notes).
 */
export async function autoArchetype(title: string, content: string, type: string): Promise<string | null> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    if (type === 'bug' || type === 'fix' || type === 'anti-pattern') {
      return 'missing cleanup or teardown in async lifecycle';
    }
    return null;
  }
  if (!hasGeminiCreds()) return null;
  if (!['bug', 'fix', 'anti-pattern', 'lesson'].includes(type)) return null;
  try {
    const prompt =
      `Given this developer knowledge entry, write the abstract root-cause archetype in one sentence.\n` +
      `The archetype must be transferable — it should describe the class of mistake, not this specific instance.\n` +
      `Examples: "environment config divergence on time-dependent values", "missing guard middleware causes silent runtime failure",\n` +
      `"unhandled async callback after component unmount or dependency update".\n\n` +
      `Type: ${type}\nTitle: ${title}\nContent: ${content.slice(0, 400)}\n\n` +
      `Return ONLY the archetype string, no quotes, no explanation. If not applicable, return: null`;
    const text = (await generateText(prompt)).trim();
    if (!text || text.toLowerCase() === 'null') return null;
    return text.slice(0, 200);
  } catch {
    return null;
  }
}
