import type { ExtractedKnowledge, EntryCategory } from '../types';

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter = 60) {
    super(`Rate limited — retry in ${retryAfter}s`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
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

export interface AIProvider {
  extractKnowledge(diff: string, commitMessage: string): Promise<ExtractedKnowledge | null>;
  getEmbedding(text: string): Promise<number[]>;
  summarizeProjectHistory(entries: { title: string; content: string; type: string }[]): Promise<string>;
  synthesizeSection(label: string, entries: { type: string; title: string; content: string }[]): Promise<string | null>;
  classifyQuery(query: string): Promise<{ category: EntryCategory; errorPattern?: string }>;
  recapSession(sessionText: string): Promise<RecapEntry[]>;
  findMatchExplanation(query: string, matchedEntry: { title: string; content: string }): Promise<string>;
}
