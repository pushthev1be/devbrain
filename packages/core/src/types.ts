export interface Project {
  id: string;
  name: string;
  path: string;
  stack: string[];
  createdAt: number;
  lastSeen: number;
  /**
   * Work that task_start opened and task_end never closed. Left set, it is the
   * evidence that a session happened and was never written down. See sessions.ts.
   */
  openSession?: { projectId: string; description: string; startedAt: number } | null;
}

export const ENTRY_CATEGORIES = [
  'auth', 'database', 'deployment', 'build', 'config',
  'network', 'performance', 'ui', 'data', 'testing', 'security', 'other',
] as const;

export type EntryCategory = typeof ENTRY_CATEGORIES[number];

// ── entry types ───────────────────────────────────────────────────────────────
//
// The single source of truth for what kinds of knowledge DevBrain stores. Every
// surface derives its list from here — the CLI's quick-save prefixes, the
// dashboard's form, the Gemini extraction prompts, the context builder and the
// project dossier — so they cannot drift apart again.
//
// The `section` field is the important part: every type declares which section of
// a project's record it appears under. A type with no section would be saveable
// but invisible, which is exactly the bug this registry exists to prevent.

/** Sections of a project record, in the order they are presented. */
export const ENTRY_SECTIONS = [
  'issues',       // what broke and what fixed it
  'decisions',    // choices made, and what was rejected
  'architecture', // how the system is shaped
  'patterns',     // approaches that work, and lessons
  'antiPatterns', // approaches that fail
  'stack',        // environment and tooling facts
  'notes',        // everything else, still findable
  'attachments',  // pointers to external artefacts (screenshots, diagrams)
] as const;

export type EntrySection = typeof ENTRY_SECTIONS[number];

/** Presentation for each section: heading, filename, and what it holds. */
export const SECTION_META: Record<EntrySection, { heading: string; file: string; blurb: string }> = {
  issues:       { heading: 'Bugs & Fixes',   file: 'issues.md',        blurb: 'What broke here before, and what actually fixed it.' },
  decisions:    { heading: 'Decisions',      file: 'decisions.md',     blurb: 'Choices made, alternatives rejected, and why.' },
  architecture: { heading: 'Architecture',   file: 'architecture.md',  blurb: 'How the system is shaped and what constrains it.' },
  patterns:     { heading: 'Patterns & Lessons', file: 'patterns.md',  blurb: 'Approaches that work, and things that looked right but were not.' },
  antiPatterns: { heading: 'Anti-Patterns',  file: 'anti-patterns.md', blurb: 'Do not do these. Each one cost somebody time.' },
  stack:        { heading: 'Stack & Environment', file: 'stack.md',    blurb: 'Versions, tools and environment facts that bite when forgotten.' },
  notes:        { heading: 'Notes',          file: 'notes.md',         blurb: 'Everything else worth keeping.' },
  attachments:  { heading: 'Attachments',    file: 'attachments.md',   blurb: 'Screenshots and diagrams, with what they show.' },
};

export interface EntryTypeSpec {
  /** Canonical stored value. */
  readonly type: string;
  /** Section of a project record this type belongs to. Never optional. */
  readonly section: EntrySection;
  /** Human label for UI surfaces. */
  readonly label: string;
  /** What the author should write. Feeds form hints and agent instructions. */
  readonly hint: string;
  /** Older stored values that mean the same thing, normalised on read. */
  readonly aliases?: readonly string[];
  /** Whether Gemini may assign this type when reading a commit diff. */
  readonly fromDiff: boolean;
}

export const ENTRY_TYPES: readonly EntryTypeSpec[] = [
  { type: 'bug',          section: 'issues',       label: 'Bug',          fromDiff: true,
    hint: 'the symptom, the misleading surface error, and the real cause' },
  { type: 'fix',          section: 'issues',       label: 'Fix',          fromDiff: true,
    aliases: ['solution'],
    hint: 'what broke, the root cause, and the exact resolution' },
  { type: 'decision',     section: 'decisions',    label: 'Decision',     fromDiff: true,
    hint: 'what was chosen, what was rejected, and why' },
  { type: 'architecture', section: 'architecture', label: 'Architecture', fromDiff: true,
    hint: 'how a part of the system is structured and what constrains it' },
  { type: 'pattern',      section: 'patterns',     label: 'Pattern',      fromDiff: true,
    hint: 'a reusable approach that applies beyond this one file' },
  { type: 'lesson',       section: 'patterns',     label: 'Lesson',       fromDiff: true,
    hint: 'what looked right but was wrong, and why' },
  { type: 'anti-pattern', section: 'antiPatterns', label: 'Anti-pattern', fromDiff: true,
    hint: 'what to never do here, and the consequence' },
  { type: 'stack',        section: 'stack',        label: 'Stack',        fromDiff: true,
    hint: 'a version, tool or environment fact that bites if forgotten' },
  { type: 'note',         section: 'notes',        label: 'Note',         fromDiff: true,
    hint: 'anything worth keeping that does not fit the other kinds' },
  { type: 'image',        section: 'attachments',  label: 'Attachment',   fromDiff: false,
    hint: 'a path or URL to a screenshot or diagram, plus what it shows' },
] as const;

export type EntryType = typeof ENTRY_TYPES[number]['type'];

const TYPE_BY_NAME = new Map<string, EntryTypeSpec>();
for (const spec of ENTRY_TYPES) {
  TYPE_BY_NAME.set(spec.type, spec);
  for (const alias of spec.aliases ?? []) TYPE_BY_NAME.set(alias, spec);
}

/** Canonical type names, for building prompts, forms and prefix lists. */
export const ENTRY_TYPE_NAMES: readonly string[] = ENTRY_TYPES.map(t => t.type);

/** Types Gemini is allowed to assign when reading a commit diff. */
export const DIFF_ENTRY_TYPES: readonly string[] =
  ENTRY_TYPES.filter(t => t.fromDiff).map(t => t.type);

/**
 * Map any stored type — current, legacy alias, or unrecognised — onto its spec.
 * Unknown values fall back to `note`, which has a section, so an entry written by
 * an older or newer version can never become invisible.
 */
export function entryTypeSpec(type: string): EntryTypeSpec {
  return TYPE_BY_NAME.get(type) ?? TYPE_BY_NAME.get('note')!;
}

/** Canonical name for a stored type: `solution` → `fix`, unknown → `note`. */
export function normalizeType(type: string): EntryType {
  return entryTypeSpec(type).type as EntryType;
}

/** Section a stored type belongs to. */
export function sectionFor(type: string): EntrySection {
  return entryTypeSpec(type).section;
}

export interface Entry {
  id: string;
  projectId: string;
  type: EntryType | 'solution';
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: number;
  category?: EntryCategory;
  errorPattern?: string;
  causeArchetype?: string;
  seenInProjects?: string[];
  /** How often this entry has been surfaced. A popularity signal for ranking. */
  retrievalCount?: number;
  /** How often a human explicitly confirmed it. The only input to `confidence`. */
  reinforcedCount?: number;
  lastRetrievedAt?: number;
  /**
   * Evidence that this entry is true — never how often it was read back.
   * observation  — recorded once, unverified
   * corroborated — a human confirmed it, or it recurred in a second project
   * confirmed    — confirmed by a human more than once
   */
  confidence?: 'observation' | 'corroborated' | 'confirmed';
  supersededBy?: string;
  supersededAt?: number;
  /**
   * Set when this entry was derived from a file rather than captured from work.
   *
   * A derived entry is owned by the indexer, not by DevBrain: re-indexing
   * rewrites it from the current file, so correcting it here would be undone on
   * the next run. Corrections belong in the source. See indexSource.ts.
   */
  source?: EntrySource;
}

export interface EntrySource {
  /** Path relative to the project root, e.g. "CLAUDE.md". */
  file: string;
  /** Stable identity of the section within the file, e.g. "critical-bugs-fixed/9". */
  anchor: string;
  /** Hash of the section body, so an unchanged section is not rewritten. */
  hash: string;
  /** Human-readable location, e.g. "Critical Bugs Fixed > 9. settle-props: upsert". */
  heading: string;
  indexedAt: number;
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
  // Any type a diff can justify — previously capped at bug|fix|note, which meant a
  // commit could never record a decision, pattern or anti-pattern.
  type: EntryType;
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
  architecture:          ContextEntry[];
  patterns:              ContextEntry[];
  antiPatterns:          ContextEntry[];
  stacks:                ContextEntry[];
  notes:                 ContextEntry[];
  supersededDecisions?:  ContextEntry[];
  currentProject:        Project | null;
  synthesis?: {
    issues?:       string;
    decisions?:    string;
    patterns?:     string;
    antiPatterns?: string;
  };
}
