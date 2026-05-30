import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedKnowledge, EntryCategory, Entry } from './types';
import { ENTRY_CATEGORIES } from './types';

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
  if (err instanceof Error && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
    throw new RateLimitError();
  }
  throw err;
}

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Run: export GEMINI_API_KEY=your_key');
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export async function extractKnowledge(diff: string, commitMessage: string): Promise<ExtractedKnowledge | null> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    const msg = commitMessage.toLowerCase();
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
    const isFix = msg.includes('fix') || msg.includes('resolve') || msg.includes('leak');
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
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const categoryList = ENTRY_CATEGORIES.join(' | ');
    const prompt = `You are analyzing a git commit to extract developer knowledge. Be specific and technical.

Commit message: ${commitMessage}

Diff (truncated to 6000 chars):
${diff.slice(0, 6000)}

Return ONLY valid JSON, no markdown, no explanation:
{
  "problem": "specific technical problem or bug that was being solved",
  "solution": "exactly how it was solved, include key technical details",
  "tags": ["language", "framework", "error-type", "concept"],
  "type": "bug" | "fix" | "note",
  "category": one of [${categoryList}] — pick the best fit,
  "errorPattern": "the exact error message, code, or symptom if one exists — omit if not applicable",
  "causeArchetype": "the abstract root-cause pattern, transferable across projects — e.g. 'environment config divergence on time-dependent values' — omit if not applicable"
}

If this commit is just a merge, version bump, or has no meaningful knowledge, return:
{"skip": true}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.skip) return null;

    return parsed as ExtractedKnowledge;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (res.status === 429) {
    const body = await res.text();
    throw new RateLimitError(parseRetryDelay(body));
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

export async function summarizeProjectHistory(entries: { title: string; content: string; type: string }[]): Promise<string> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    return "This project contains registered learnings around clean resource management in React lifecycle events. The team identified and resolved a memory leak due to non-cleared event listeners in useEffect.";
  }

  if (entries.length === 0) return 'No knowledge captured yet.';

  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const sample = entries.slice(0, 15).map(e => `[${e.type}] ${e.title}: ${e.content}`).join('\n');

    const prompt = `Summarize a developer's experience on this project in 2-3 sentences. Focus on patterns, recurring issues, and key learnings:\n\n${sample}`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
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

  if (entries.length < 2 || !process.env.GEMINI_API_KEY) return null;
  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const items = entries
      .map(e => `[${e.type}] ${e.title}: ${e.content.slice(0, 200)}`)
      .join('\n');
    const prompt =
      `You are DevBrain, a developer knowledge system. Compress these related ${label} entries into ` +
      `2-4 bullet points capturing the essential pattern, recurring root cause, or key insight. ` +
      `Each bullet must be specific and actionable. Return ONLY the bullet points, each starting with "•", no headers.\n\n${items}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
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
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt =
      `Classify this developer problem query for search routing. Return ONLY valid JSON:\n` +
      `{ "category": one of [${categoryList}], "errorPattern": "extracted error text if present, else omit" }\n\n` +
      `Query: "${query}"`;
    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();
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

export interface RecapEntry {
  type: 'bug' | 'fix' | 'decision' | 'pattern' | 'lesson' | 'anti-pattern';
  title: string;
  content: string;
  tags: string[];
  category?: EntryCategory;
  errorPattern?: string;
  causeArchetype?: string;
}

export async function recapSession(sessionText: string): Promise<RecapEntry[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const categoryList = ENTRY_CATEGORIES.join(' | ');
  const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt =
    `You are DevBrain, a developer knowledge system. Analyze this coding session transcript and extract ` +
    `every piece of knowledge worth preserving for future sessions. Be specific and technical.\n\n` +
    `Extract only genuinely useful items: bugs fixed, decisions made, patterns discovered, lessons learned, ` +
    `anti-patterns identified (things to avoid). Skip trivial remarks, pleasantries, and exploration that led nowhere.\n\n` +
    `Return ONLY a valid JSON array, no markdown, no explanation:\n` +
    `[\n` +
    `  {\n` +
    `    "type": "bug" | "fix" | "decision" | "pattern" | "lesson" | "anti-pattern",\n` +
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

  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();
  const match  = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed as RecapEntry[] : [];
  } catch {
    return [];
  }
}

export async function findMatchExplanation(query: string, matchedEntry: { title: string; content: string }): Promise<string> {
  if (process.env.DEVBRAIN_MOCK === 'true') {
    return "This past solution shows how to correctly clean up event listeners to resolve performance memory leaks.";
  }

  try {
    const model = getClient().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `A developer is facing: "${query}"

    A past solution was found: "${matchedEntry.title} - ${matchedEntry.content}"

    In one sentence, explain why this past solution is relevant to the current problem.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return '';
  }
}
