import { GeminiProvider } from './providers/geminiProvider';
import { NvidiaProvider } from './providers/nvidiaProvider';
import type { AIProvider } from './providers/types';
import type { ExtractedKnowledge, EntryCategory } from './types';
import type { RecapEntry } from './providers/types';

let currentProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (!currentProvider) {
    const backend = (process.env.DEVBRAIN_AI_BACKEND || 'gemini').toLowerCase();
    if (backend === 'nvidia') {
      currentProvider = new NvidiaProvider();
    } else {
      currentProvider = new GeminiProvider();
    }
  }
  return currentProvider;
}

export function resetProvider(): void {
  currentProvider = null;
}

export async function extractKnowledge(diff: string, commitMessage: string): Promise<ExtractedKnowledge | null> {
  return getProvider().extractKnowledge(diff, commitMessage);
}

export async function getEmbedding(text: string): Promise<number[]> {
  return getProvider().getEmbedding(text);
}

export async function summarizeProjectHistory(entries: { title: string; content: string; type: string }[]): Promise<string> {
  return getProvider().summarizeProjectHistory(entries);
}

export async function synthesizeSection(
  label: string,
  entries: { type: string; title: string; content: string }[]
): Promise<string | null> {
  return getProvider().synthesizeSection(label, entries);
}

export async function classifyQuery(query: string): Promise<{ category: EntryCategory; errorPattern?: string }> {
  return getProvider().classifyQuery(query);
}

export async function recapSession(sessionText: string): Promise<RecapEntry[]> {
  return getProvider().recapSession(sessionText);
}

export async function findMatchExplanation(query: string, matchedEntry: { title: string; content: string }): Promise<string> {
  return getProvider().findMatchExplanation(query, matchedEntry);
}
