import { GoogleGenAI } from '@google/genai';
import type { ExtractedKnowledge, EntryCategory, Entry, EntryType } from './types';
import { ENTRY_CATEGORIES, DIFF_ENTRY_TYPES, ENTRY_TYPES, normalizeType } from './types';

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
function hasGeminiCreds(): boolean {
  if (useVertex()) return Boolean(process.env.GOOGLE_CLOUD_PROJECT);
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

// A template string lifted out of source code rather than a real error someone
// could paste into a search: "Gemini error {errorCode}: {errorMessage}".
const PLACEHOLDER = /\$\{[^}]*\}|\{[a-zA-Z_][\w.]*\}|<[A-Z_]{2,}>|%[sd]\b/;

// Narration detection, by structure rather than by phrase list.
//
// A narration reads "The project lacked X" or "An incorrect version was
// specified" — an article-led subject followed by a past-tense verb describing
// what the diff did. A symptom reads "ADK ignores Vertex on Cloud Run": either it
// leads with the component, or its verb is present-tense. Requiring both signals
// keeps titles like "The dashboard script fails to parse" (article-led, but a
// present-tense symptom).
const NARRATION_OPENER = /^(the|this|these|those|an|a)\s+\S+/i;
const NARRATION_VERB = /\b(lacked|missed|faced|encountered|implemented|introduced|refactored|contained|needed|required)\b|\b(was|were)\s+(specified|modified|added|updated|changed|introduced|created|removed|missing|incorrect|unavailable|renamed|refactored|implemented)\b/i;

/**
 * Last line of defence on extraction quality.
 *
 * The prompt carries the rules, but a model drifts. These are the checks that can
 * be made mechanically: reject narration titles and placeholder "errors", cap
 * tags, and keep titles short enough that the UI does not cut them mid-word.
 * Returns null to drop the entry entirely — a bad entry is worse than none,
 * because it costs a reader attention every time it surfaces.
 */
export function enforceEntryQuality(k: ExtractedKnowledge | null): ExtractedKnowledge | null {
  if (!k) return null;

  const problem = String(k.problem ?? '').trim();
  const solution = String(k.solution ?? '').trim();
  if (problem.length < 12 || solution.length < 12) return null;
  if (NARRATION_OPENER.test(problem) && NARRATION_VERB.test(problem)) return null;

  // Keep the title whole: trim at a word boundary rather than mid-word.
  let title = problem.replace(/\s+/g, ' ');
  if (title.length > 100) {
    const cut = title.slice(0, 100);
    title = cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[\s,;:—-]+$/, '');
  }

  const errorPattern = typeof k.errorPattern === 'string' ? k.errorPattern.trim() : '';
  const keepError = errorPattern.length >= 6 && !PLACEHOLDER.test(errorPattern);

  const archetype = typeof k.causeArchetype === 'string' ? k.causeArchetype.trim() : '';

  return {
    ...k,
    problem: title,
    solution,
    tags: Array.isArray(k.tags)
      ? [...new Set(k.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 4)
      : [],
    ...(keepError ? { errorPattern } : { errorPattern: undefined }),
    ...(archetype.length >= 12 ? { causeArchetype: archetype } : { causeArchetype: undefined }),
  };
}

export async function extractKnowledge(diff: string, commitMessage: string): Promise<ExtractedKnowledge | null> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    const msg = commitMessage.toLowerCase();
    if (msg.includes('abort') || msg.includes('race') || msg.includes('fetcher')) {
      if (msg.includes('fix') || msg.includes('resolved') || msg.includes('abort')) {
        return {
          problem: "Race condition in asynchronous data fetching causes stale profiles to overwrite active views",
          solution: "Resolved the race condition by using an AbortController inside the useEffect hook to cancel outstanding fetch requests on dependency changes/unmount",
          tags: ["react", "async", "race-condition", "abort-controller", "useEffect"],
          type: "fix",
          category: "performance",
          errorPattern: "Stale asynchronous fetch overwrites current state",
          causeArchetype: "unhandled async callback after component unmount or dependency update"
        };
      }
      if (msg.includes('bug') || msg.includes('debug') || msg.includes('race')) {
        return {
          problem: "Race condition in asynchronous data fetching causes stale profiles to overwrite active views",
          solution: "Identified that rapid tab switching triggers multiple concurrent fetch requests whose responses resolve out-of-order, causing the UI to display incorrect user profiles",
          tags: ["react", "async", "race-condition", "useEffect"],
          type: "bug",
          category: "performance",
          errorPattern: "Stale asynchronous fetch overwrites current state"
        };
      }
      return {
        problem: "Asynchronous profile fetcher component for user details",
        solution: "Implemented baseline async profile fetcher executing fetch requests on user ID change",
        tags: ["react", "async", "fetch"],
        type: "note",
        category: "ui"
      };
    }
    if (msg.includes('stale') || msg.includes('closure') || msg.includes('counter')) {
      return {
        problem: "React state value inside useEffect captures stale value due to empty dependency array closure",
        solution: "Resolved the stale closure bug by using a functional state updater inside the interval callback (setCount(prev => prev + 1))",
        tags: ["react", "hooks", "stale-closure", "useEffect", "useState"],
        type: "fix",
        category: "performance",
        errorPattern: "React hook captures stale state value",
        causeArchetype: "stale closure capture in hook lifecycle"
      };
    }
    const isFix = msg.includes('fix') || msg.includes('resolve') || msg.includes('solve') || msg.includes('leak');
    if (isFix) {
      return {
        problem: "React memory leak due to missing event listener unsubscribe/cleanup inside useEffect hook",
        solution: "Resolved the memory leak by ensuring the useEffect hook returns a cleanup callback that removes the listener using statusEmitter.off()",
        tags: ["react", "typescript", "memory-leak", "hooks", "event-emitter"],
        type: "fix",
        category: "performance",
        errorPattern: "MaxListenersExceededWarning: Possible EventEmitter memory leak detected",
        causeArchetype: "missing cleanup callback in lifecycle subscription"
      };
    }
    return {
      problem: "Initial status monitor system dashboard component",
      solution: "Created baseline dashboard subscribing to statusEmitter.on() events",
      tags: ["react", "ui", "event-emitter"],
      type: "note",
      category: "ui"
    };
  }

  try {
    const categoryList = ENTRY_CATEGORIES.join(' | ');
    const prompt = `You decide whether a git commit contains knowledge worth remembering.

Most commits do not. Your default answer is to skip. Keep a commit ONLY if a
developer who hits the same situation months from now would be saved real time by
reading it.

THE TEST — keep it only if you can state all three:
  1. a SYMPTOM someone could observe again (an error, a wrong behaviour, a failure)
  2. the CAUSE, which was not obvious from the symptom
  3. the FIX, specific enough to act on

If the commit is only "we changed X to Y" with no symptom behind it, skip it.

ALWAYS SKIP these, no matter how large the diff:
  - dependency version bumps, lockfile updates, adding a package to package.json
  - refactors, renames, file moves, formatting, lint or type-only changes
  - documentation, comments, README edits
  - new features with no problem behind them; scaffolding; initial commits
  - test additions that do not encode a past bug
  - generated files, build output, config with no symptom attached
  - merges, reverts, version tags, WIP commits

WRITING RULES:
  - "problem" is the SYMPTOM, written so someone searching for it would find it.
    It is NOT a narration of the diff.
      BAD:  "The project lacked the @google/adk package as a declared dependency"
      BAD:  "packages/mcp/package.json was modified to update the version"
      GOOD: "ADK ignores Vertex AI on Cloud Run when GOOGLE_API_KEY is set"
      GOOD: "MongoDB $vectorSearch returns zero rows instead of erroring without an index"
    Start with the component and what goes wrong. Under 90 characters. No trailing
    ellipsis, no sentence fragments cut mid-word.
  - "solution" states the cause and the exact fix, in that order. Include the
    specific setting, flag, version or line that mattered.
  - "errorPattern" is a LITERAL error string someone could paste into a search.
    Copy it verbatim from the diff or the commit message.
      BAD:  "Gemini error {errorCode}: {errorMessage}"   (a template from the code)
      BAD:  "an authentication error occurred"           (a description, not a message)
      GOOD: "MongoServerError: bad auth : authentication failed"
    If no literal error text exists in the commit, omit the field entirely.
  - "tags" — at most 4, lowercase, the ones a searcher would actually type.
  - "causeArchetype" — the transferable class of mistake, if there is one.
      e.g. "environment config divergence between local and deploy target"
      Omit it rather than restating the specific fix.

Commit message: ${commitMessage}

Diff (truncated to 6000 chars):
${diff.slice(0, 6000)}

If this commit fails THE TEST, return exactly: {"skip": true}

Otherwise return ONLY valid JSON, no markdown, no explanation:
{
  "problem": "the symptom, under 90 chars, searchable",
  "solution": "the cause, then the exact fix",
  "tags": ["at", "most", "four"],
  "type": one of [${DIFF_ENTRY_TYPES.join(' | ')}] — pick the kind of knowledge this is,
  "category": one of [${categoryList}] — pick the best fit,
  "errorPattern": "literal error text copied verbatim — omit if none exists",
  "causeArchetype": "transferable class of mistake — omit if not applicable"
}

If this commit is just a merge, version bump, or has no meaningful knowledge, return:
{"skip": true}`;

    const text = await generateText(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.skip) return null;

    // Validate type and category. normalizeType maps a legacy or unexpected value
    // onto a canonical one (unknown → note) rather than inventing a second list
    // that can drift from the registry.
    parsed.type = DIFF_ENTRY_TYPES.includes(parsed.type)
      ? normalizeType(parsed.type)
      : 'note';
    if (parsed.category && !ENTRY_CATEGORIES.includes(parsed.category)) {
      parsed.category = 'other';
    }

    return enforceEntryQuality(parsed) as ExtractedKnowledge | null;
  } catch (err) {
    rethrowIfRateLimit(err);
    return null;
  }
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

export async function summarizeProjectHistory(entries: { title: string; content: string; type: string }[]): Promise<string> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    return "This project contains registered learnings around clean resource management in React lifecycle events. The team identified and resolved a memory leak due to non-cleared event listeners in useEffect.";
  }

  if (entries.length === 0) return 'No knowledge captured yet.';

  try {
    const sample = entries.slice(0, 15).map(e => `[${e.type}] ${e.title}: ${e.content}`).join('\n');

    const prompt = `Summarize a developer's experience on this project in 2-3 sentences. Focus on patterns, recurring issues, and key learnings:\n\n${sample}`;

    return await generateText(prompt);
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

// A session transcript can justify any type a diff can, minus pure attachments.
// Derived from the registry so recap and capture cannot drift apart again.
const RECAP_TYPES: readonly string[] = ENTRY_TYPES
  .filter(t => t.fromDiff && t.type !== 'note')
  .map(t => t.type);

export interface RecapEntry {
  type: EntryType;
  title: string;
  content: string;
  tags: string[];
  category?: EntryCategory;
  errorPattern?: string;
  causeArchetype?: string;
}

export async function recapSession(sessionText: string): Promise<RecapEntry[]> {
  // Every other Gemini call here honours mock mode; this one didn't, so
  // DEVBRAIN_MOCK=true passed the CLI's preflight and then failed on the creds
  // check below. Deterministic entries derived from the text keep it offline.
  if (process.env.DEVBRAIN_MOCK === 'true') {
    const lines = sessionText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 4);
    const typeFor = (line: string): RecapEntry['type'] => {
      const l = line.toLowerCase();
      if (l.startsWith('avoid')) return 'anti-pattern';
      if (l.startsWith('decided')) return 'decision';
      if (l.startsWith('learned')) return 'lesson';
      if (l.startsWith('fixed')) return 'fix';
      return 'pattern';
    };
    return lines.map(line => ({
      type: typeFor(line),
      title: line.replace(/^[A-Za-z]+:\s*/, '').slice(0, 120),
      content: line,
      tags: ['mock'],
      category: 'other' as EntryCategory,
    }));
  }

  if (!hasGeminiCreds()) throw new Error('No Gemini credentials configured (set GOOGLE_GENAI_USE_VERTEXAI + GOOGLE_CLOUD_PROJECT, or GEMINI_API_KEY)');
  const categoryList = ENTRY_CATEGORIES.join(' | ');
  const prompt =
    `You are DevBrain, a developer knowledge system. Analyze this coding session transcript and extract ` +
    `every piece of knowledge worth preserving for future sessions. Be specific and technical.\n\n` +
    `Extract only genuinely useful items: bugs fixed, decisions made, patterns discovered, lessons learned, ` +
    `anti-patterns identified (things to avoid). Skip trivial remarks, pleasantries, and exploration that led nowhere.\n\n` +
    `Return ONLY a valid JSON array, no markdown, no explanation:\n` +
    `[\n` +
    `  {\n` +
    `    "type": one of [${RECAP_TYPES.join(' | ')}],\n` +
    `    "title": "one-line description (max 120 chars)",\n` +
    `    "content": "full detail — what happened, why, how it was resolved",\n` +
    `    "tags": ["language", "framework", "concept"],\n` +
    `    "category": one of [${categoryList}],\n` +
    `    "errorPattern": "exact error text if applicable — omit otherwise",\n` +
    `    "causeArchetype": "abstract root cause transferable across projects — omit if not applicable"\n` +
    `  }\n` +
    `]\n\n` +
    `If nothing worth saving was found, return: []\n\n` +
    `Session transcript:\n${sessionText.slice(0, 12000)}`;

  const text   = await generateText(prompt);
  const match  = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed as RecapEntry[] : [];
  } catch {
    return [];
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

export async function findMatchExplanation(query: string, matchedEntry: { title: string; content: string }): Promise<string> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    return "This past solution shows how to correctly clean up event listeners to resolve performance memory leaks.";
  }

  try {
    const prompt = `A developer is facing: "${query}"

    A past solution was found: "${matchedEntry.title} - ${matchedEntry.content}"

    In one sentence, explain why this past solution is relevant to the current problem.`;

    return await generateText(prompt);
  } catch {
    return '';
  }
}
