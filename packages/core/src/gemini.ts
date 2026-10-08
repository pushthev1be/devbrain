// Optional AI. DevBrain captures and recalls with no model at all: the coding
// agent writes every entry. When Gemini is configured it adds embeddings for
// semantic search and a few refinements (archetypes, section summaries, query
// routing); without it each of these quietly does nothing.

// Types only — see loadGenAI(). The SDK costs 103ms to load and is needed only
// when something is actually embedded or generated, which most runs never do.
import type { GoogleGenAI } from '@google/genai';
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

/** The genai SDK, loaded on first use. Cached by the module system thereafter. */
function loadGenAI(): typeof import('@google/genai') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@google/genai') as typeof import('@google/genai');
}

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
      const { GoogleGenAI } = loadGenAI();
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
      const { GoogleGenAI } = loadGenAI();
      client = new GoogleGenAI({ vertexai: false, apiKey });
    }
  }
  return client;
}

/**
 * `config.abortSignal` as the SDK will accept it.
 *
 * @google/genai reads it in its request builder but does not declare it in
 * genai.d.ts (checked at 1.52.0), so passing it as a literal fails the excess
 * property check and collapses the call's return type to `unknown`. Spreading a
 * non-literal bypasses that check without widening anything else, which keeps
 * the rest of the params type-checked.
 */
function abortable(signal: AbortSignal): object {
  return { abortSignal: signal };
}

async function generateText(prompt: string): Promise<string> {
  // Bounded for the same reason embedding is: a stalled generation never
  // settles, and `devbrain search` sat for 36 seconds on a query classification
  // nobody was waiting for. Every generation path — classifyQuery,
  // autoArchetype, synthesizeSection — goes through here.
  const res = await withAbort<GenResult>(
    signal => getClient().models.generateContent({
      model: TEXT_MODEL, contents: prompt, config: { ...abortable(signal) },
    }),
    GEMINI_TIMEOUT_MS, 'Generation');
  return (res.text ?? '').trim();
}

/** True when a Gemini backend is configured (either Vertex AI or the Developer API). */
export function hasGeminiCreds(): boolean {
  if (useVertex()) return Boolean(process.env.GOOGLE_CLOUD_PROJECT);
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

/**
 * How long any single Gemini call may take before it is abandoned.
 *
 * A `.catch` does not cover a hang: when the API stalls rather than fails, the
 * promise never settles and the caller waits for ever. That is what made
 * `devbrain search` sit there silently with no output and no error, and the
 * same stall inside a hook would hold up the agent's turn.
 */
export const GEMINI_TIMEOUT_MS = Number(process.env.DEVBRAIN_AI_TIMEOUT_MS) || 8000;

/**
 * Run a Gemini call with a deadline that actually cancels it.
 *
 * `within` below stops *waiting*; it does not stop the request. That is enough
 * to unblock a caller but not to let the process exit: an abandoned HTTPS call
 * holds the event loop open long after the result was printed, which is why
 * `devbrain search` returned its answer and then sat there until it was killed.
 * Exiting out from under it is not the answer either — process.exit over an
 * in-flight request trips a libuv assertion and replaces the output with a
 * crash.
 *
 * So the deadline aborts the request. The SDK takes an AbortSignal on
 * `config.abortSignal`, so the socket is closed rather than orphaned.
 */
/** The SDK's own result types, named so withAbort does not have to infer them. */
type GenResult = Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;
type EmbedResult = Awaited<ReturnType<GoogleGenAI['models']['embedContent']>>;

async function withAbort<T>(
  call: (signal: AbortSignal) => Promise<T>,
  ms = GEMINI_TIMEOUT_MS,
  label = 'Gemini',
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
  try {
    return await Promise.race<T>([call(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Reject rather than hang. The timer is cleared so the process can still exit. */
export function within<T>(work: Promise<T>, ms = GEMINI_TIMEOUT_MS, label = 'Gemini'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      // Never hold the event loop open on the timer alone.
      if (typeof timer.unref === 'function') timer.unref();
    }),
  ]);
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
    const res = await withAbort<EmbedResult>(
      signal => getClient().models.embedContent({
        model: EMBED_MODEL,
        contents: text,
        config: { outputDimensionality: EMBED_DIM, ...abortable(signal) },
      }),
      GEMINI_TIMEOUT_MS, 'Embedding');
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
