// Indexing a Markdown file as a source of truth.
//
// A project's CLAUDE.md is often the best engineering memory it has — numbered
// bugs with causes, rules, and things already proven not to work. DevBrain
// holding a second copy of that is how two stores drift: fix a bug in the file
// and the copy keeps confidently telling agents the old version.
//
// So the file stays authoritative and DevBrain derives entries from it. Derived
// entries carry a source anchor and are owned by the indexer: each run
// reconciles against the current file, so a changed section updates its entry, a
// deleted section retracts it, and a new section adds one. Drift becomes
// structurally impossible rather than something anyone has to remember.
//
// The corollary, enforced by callers: a derived entry must not be corrected
// inside DevBrain. The next index would resurrect it. Corrections go to the file.

import { createHash } from 'crypto';
import type { Entry, EntryType, EntrySource, Project } from './types';
import { looksLikeError } from './transcript';

export interface ParsedSection {
  anchor: string;
  heading: string;
  /** Breadcrumb of parent headings, outermost first. */
  path: string[];
  title: string;
  body: string;
  hash: string;
  type: EntryType;
  /** File or symbol the section names as the place this lives. */
  where?: string;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function hashOf(text: string): string {
  return createHash('sha1').update(text.trim().replace(/\s+/g, ' ')).digest('hex').slice(0, 16);
}

/**
 * Classify a section from the heading it sits under.
 *
 * The parent heading is a far better signal than the prose: everything under
 * "Critical Bugs Fixed" is a fix whatever its wording, and everything under
 * "Things That Don't Work" is an anti-pattern.
 */
function classify(text: string): EntryType | null {
  if (/don't work|do not work|don't try|non-negotiable|anti-pattern/.test(text)) return 'anti-pattern';
  if (/bug|fixed|regression|incident/.test(text)) return 'fix';
  if (/decision|chose|rationale|why we/.test(text)) return 'decision';
  if (/architecture|data flow|pipeline|overview|key files|tables|schema|deployment/.test(text)) return 'architecture';
  if (/pattern|prompt|learning|loop/.test(text)) return 'pattern';
  if (/stack|environment|secrets|env|performance/.test(text)) return 'stack';
  return null;
}

function typeForPath(path: string[], title: string): EntryType {
  // The parent heading wins. "calibrationBias Never Applied" sits under
  // "Critical Bugs Fixed", so it is a fix — reading the title first classified it
  // as an anti-pattern purely because it contains the word "never", which would
  // have told agents to avoid doing something that was actually the fix.
  return classify(path.join(' ').toLowerCase())
    ?? classify(title.toLowerCase())
    ?? 'note';
}

/** Pull `**Problem**: …` style fields out of a section body. */
function field(body: string, name: string): string | undefined {
  const re = new RegExp(`\\*\\*${name}\\*\\*\\s*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-Za-z]|$)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim().replace(/\s+/g, ' ') : undefined;
}

/**
 * Split a Markdown document into indexable sections, one per heading.
 *
 * Headings are the unit because they are how the document is already organised
 * and because they give a stable anchor: renaming a heading is a real edit, so
 * it should retract the old entry and create a new one.
 */
export function parseMarkdownSource(text: string, opts: { minBody?: number } = {}): ParsedSection[] {
  const { minBody = 40 } = opts;
  const lines = text.split(/\r?\n/);

  const sections: ParsedSection[] = [];
  const stack: { level: number; title: string }[] = [];
  let current: { level: number; title: string; path: string[]; body: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.join('\n').trim();
    // Headings that only introduce sub-headings carry no knowledge of their own.
    if (body.length < minBody) { current = null; return; }

    const problem = field(body, 'Problem');
    const fix = field(body, 'Fix');
    const where = field(body, 'Where');

    // Strip a leading "12. " so the title reads as the thing, not the index.
    const title = current.title.replace(/^\d+[.)]\s*/, '').trim();
    const anchor = [...current.path.map(slug), slug(current.title)].filter(Boolean).join('/');

    sections.push({
      anchor,
      heading: [...current.path, current.title].join(' > '),
      path: [...current.path],
      title,
      // Problem/Fix is the shape DevBrain wants; keep the raw body otherwise.
      body: problem && fix ? `${problem}\n\nFix: ${fix}` : body,
      hash: hashOf(body),
      type: typeForPath(current.path, current.title),
      where,
    });
    current = null;
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      current = { level, title: h[2].trim(), path: stack.map(s => s.title), body: [] };
      stack.push({ level, title: h[2].trim() });
      continue;
    }
    if (current) current.body.push(line);
  }
  flush();

  return sections;
}

export interface IndexPlan {
  added: ParsedSection[];
  updated: { section: ParsedSection; entry: Entry }[];
  unchanged: number;
  /** Derived entries whose section no longer exists in the file. */
  removed: Entry[];
}

/**
 * Work out what indexing this file would change, without writing anything.
 *
 * Kept separate from applying it so the CLI can show a plan, and so the
 * reconciliation logic is testable without a database.
 */
/**
 * @param opts.force Re-derive every section even when its body is unchanged.
 *
 * The hash answers "did the source change", which is not the same question as
 * "would indexing produce something different now". When the indexer itself
 * learns something — extracting error patterns, say — every previously indexed
 * section is stale in a way no hash can see, and without this they would stay
 * frozen at the old logic forever.
 */
export function planIndex(
  sections: ParsedSection[],
  existing: Entry[],
  file: string,
  opts: { force?: boolean } = {},
): IndexPlan {
  const derived = existing.filter(e => e.source?.file === file && !e.supersededBy);
  const byAnchor = new Map(derived.map(e => [e.source!.anchor, e]));

  const plan: IndexPlan = { added: [], updated: [], unchanged: 0, removed: [] };
  const seen = new Set<string>();

  for (const section of sections) {
    seen.add(section.anchor);
    const match = byAnchor.get(section.anchor);
    if (!match) plan.added.push(section);
    else if (opts.force || match.source!.hash !== section.hash) plan.updated.push({ section, entry: match });
    else plan.unchanged++;
  }

  for (const entry of derived) {
    if (!seen.has(entry.source!.anchor)) plan.removed.push(entry);
  }

  return plan;
}

/** Build the stored entry for a parsed section. */
// A template lifted out of source code rather than a real error anyone could
// paste: "Gemini error {errorCode}", "Failed: ${reason}".
const PLACEHOLDER = /\$\{[^}]*\}|\{[a-zA-Z_][\w.]*\}|<[A-Z_]{2,}>|%[sd]\b/;

/** A JSON error payload, which is an error by shape without saying "Error". */
const JSON_ERROR = /^\{[\s\S]*"(?:error|message|code)"\s*:/;

/**
 * A named error type anywhere in the line: `QuotaExceededError`, `TypeError`.
 *
 * The capital is doing the work. It admits the token even with no colon and no
 * message after it — real files name errors that way, in a heading or mid
 * sentence — while "error handling" and "a permissions error" stay out, because
 * a lowercase `error` can never match.
 */
const NAMED_ERROR = /\b[A-Z][\w.]*(?:Error|Exception)\b/;

/**
 * A verbatim error string from a section body, or undefined.
 *
 * This is what makes an indexed entry reachable by the failure hook, which
 * matches a failing command's output against stored error patterns. Without it
 * a CLAUDE.md bug write-up can only be found by someone already searching for
 * it — and on a real file the errors are sitting right there in the prose,
 * usually inside backticks. Measured before this existed: 0 of 85 indexed
 * entries carried a pattern, so none of them could ever be recalled.
 *
 * Shape is required, not the word "error". Prose that merely describes one
 * ("it threw a permissions error") is not something anyone can paste.
 */
export function extractErrorPattern(body: string, title = ''): string | undefined {
  const candidates: string[] = [];

  // An explicit field wins: the author already said this is the error. Prefer a
  // backticked span inside it, because field() reads to the next field and so
  // carries the sentences after the error along with it.
  //
  // "Problem" is here because that is what real files call it. Looking only for
  // "Error" found nothing at all in an 85-section CLAUDE.md whose every bug was
  // written up under **Problem**.
  for (const name of ['Error', 'Symptom', 'Problem']) {
    const explicit = field(body, name);
    if (!explicit) continue;
    for (const m of explicit.matchAll(/`([^`]{6,200})`/g)) candidates.push(m[1]);
    candidates.push(explicit);
  }

  // Then fenced blocks and inline code, where a verbatim error normally goes.
  for (const m of body.matchAll(/```[a-zA-Z]*\n([\s\S]*?)```/g)) candidates.push(...m[1].split('\n'));
  for (const m of body.matchAll(/`([^`\n]{6,200})`/g)) candidates.push(m[1]);
  // The heading often carries the error name when the body only describes it.
  if (title) candidates.push(title);
  candidates.push(...body.split('\n'));

  for (const raw of candidates) {
    const line = raw
      .replace(/^[\s>*\-+#]+/, '')   // bullets, quotes and heading markers
      .replace(/^\d+\.\s*/, '')      // "6. localStorage QuotaExceededError"
      .replace(/`/g, '')
      .trim();
    if (line.length < 6 || line.length > 200) continue;
    if (PLACEHOLDER.test(line)) continue;
    if (looksLikeError(line, false) || JSON_ERROR.test(line) || NAMED_ERROR.test(line)) return line;
  }
  return undefined;
}

export function entryForSection(
  section: ParsedSection,
  project: Project,
  file: string,
  opts: { id: string; embedding?: number[]; createdAt?: number },
): Entry {
  const source: EntrySource = {
    file,
    anchor: section.anchor,
    hash: section.hash,
    heading: section.heading,
    indexedAt: Date.now(),
  };

  return {
    id: opts.id,
    projectId: project.id,
    // Derived from a file, not captured from work. Said explicitly so the two
    // are distinguishable without inspecting `source` on every row.
    origin: 'indexed',
    type: section.type,
    title: section.title.slice(0, 120),
    content: section.body,
    // Tagged so derived knowledge is distinguishable at a glance from work that
    // was actually done and captured.
    tags: ['claude-md', ...section.path.slice(-1).map(slug)].filter(Boolean).slice(0, 4),
    embedding: opts.embedding,
    createdAt: opts.createdAt ?? Date.now(),
    confidence: 'observation',
    // Lift the verbatim error out of the prose, so the failure hook can reach
    // this entry at all. Without it an indexed section is invisible to the one
    // retrieval path that fires unasked.
    ...(() => {
      const errorPattern = extractErrorPattern(section.body, section.title);
      return errorPattern ? { errorPattern } : {};
    })(),
    source,
  } as Entry;
}
