export interface Project {
  id: string;
  name: string;
  path: string;
  stack: string[];
  createdAt: number;
  lastSeen: number;
}

export const ENTRY_CATEGORIES = [
  'auth', 'database', 'deployment', 'build', 'config',
  'network', 'performance', 'ui', 'data', 'testing', 'security', 'other',
] as const;

export type EntryCategory = typeof ENTRY_CATEGORIES[number];

export interface Entry {
  id: string;
  projectId: string;
  type: 'bug' | 'fix' | 'note' | 'solution' | 'stack' | 'decision' | 'pattern' | 'lesson' | 'image' | 'anti-pattern';
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: number;
  category?: EntryCategory;
  errorPattern?: string;
  causeArchetype?: string;
  seenInProjects?: string[];
  retrievalCount?: number;
  lastRetrievedAt?: number;
  confidence?: 'observation' | 'corroborated' | 'confirmed';
  supersededBy?: string;
  supersededAt?: number;
}

export interface SearchResult {
  entry: Entry;
  similarity: number;
  project: Project;
}

export interface ExtractedKnowledge {
  problem: string;
  solution: string;
  tags: string[];
  type: 'bug' | 'fix' | 'note';
  category?: EntryCategory;
  errorPattern?: string;
  causeArchetype?: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  diff: string;
  timestamp: number;
}

export interface ContextEntry {
  entry: Entry;
  project: Project;
  score: number;
}

export interface DevBrainContext {
  crossProjectPatterns?: ContextEntry[];
  issues:                ContextEntry[];
  decisions:             ContextEntry[];
  patterns:              ContextEntry[];
  antiPatterns:          ContextEntry[];
  stacks:                ContextEntry[];
  supersededDecisions?:  ContextEntry[];
  currentProject:        Project | null;
  synthesis?: {
    issues?:       string;
    decisions?:    string;
    patterns?:     string;
    antiPatterns?: string;
  };
}
