import { GoogleGenAI } from '@google/genai';
import type { ExtractedKnowledge, EntryCategory } from '../types';
import { ENTRY_CATEGORIES } from '../types';
import type { AIProvider, RecapEntry } from './types';
import { RateLimitError } from './types';

const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIM = 3072;

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

function hasGeminiCreds(): boolean {
  if (useVertex()) return Boolean(process.env.GOOGLE_CLOUD_PROJECT);
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export class GeminiProvider implements AIProvider {
  async extractKnowledge(diff: string, commitMessage: string): Promise<ExtractedKnowledge | null> {
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

      const text = await generateText(prompt);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.skip) return null;

      // Validate type and category
      const validTypes = ['bug', 'fix', 'note'];
      if (!validTypes.includes(parsed.type)) {
        parsed.type = 'note';
      }
      if (parsed.category && !ENTRY_CATEGORIES.includes(parsed.category)) {
        parsed.category = 'other';
      }

      return parsed as ExtractedKnowledge;
    } catch (err) {
      rethrowIfRateLimit(err);
      return null;
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (process.env.DEVBRAIN_MOCK === 'true') {
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

  async summarizeProjectHistory(entries: { title: string; content: string; type: string }[]): Promise<string> {
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

  async synthesizeSection(
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

  async classifyQuery(query: string): Promise<{ category: EntryCategory; errorPattern?: string }> {
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

  async recapSession(sessionText: string): Promise<RecapEntry[]> {
    if (!hasGeminiCreds() && process.env.DEVBRAIN_MOCK !== 'true') {
      throw new Error('No Gemini credentials configured (set GOOGLE_GENAI_USE_VERTEXAI + GOOGLE_CLOUD_PROJECT, or GEMINI_API_KEY)');
    }
    if (process.env.DEVBRAIN_MOCK === 'true') {
      return [
        {
          type: "bug",
          title: "React memory leak in status monitor dashboard",
          content: "A memory leak occurred because useEffect subscribed to statusEmitter.on() but did not clean up the listener.",
          tags: ["react", "memory-leak"],
          category: "performance"
        }
      ];
    }
    const categoryList = ENTRY_CATEGORIES.join(' | ');
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

  async findMatchExplanation(query: string, matchedEntry: { title: string; content: string }): Promise<string> {
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
}
