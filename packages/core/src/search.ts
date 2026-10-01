import type { Entry, EntryCategory, Project, SearchResult, ContextEntry, DevBrainContext, EntrySection } from './types';
import { sectionFor, normalizeType } from './types';
import { synthesizeSection } from './gemini';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function findSimilar(
  queryEmbedding: number[],
  entries: (Entry & { project: Project })[],
  topK = 5,
  threshold = 0.65
): SearchResult[] {
  return entries
    .filter(e => e.embedding && e.embedding.length > 0)
    .map(e => ({
      entry: e,
      similarity: cosineSimilarity(queryEmbedding, e.embedding!),
      project: e.project,
    }))
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function patternOverlap(query: string, pattern: string): number {
  const q = normalizeText(query);
  const p = normalizeText(pattern);
  if (!q || !p) return 0;
  // exact substring match gets full score
  if (q.includes(p) || p.includes(q)) return 1;
  // word overlap score
  const qWords = new Set(q.split(' ').filter(w => w.length > 2));
  const pWords = p.split(' ').filter(w => w.length > 2);
  if (qWords.size === 0 || pWords.length === 0) return 0;
  const matches = pWords.filter(w => qWords.has(w)).length;
  return matches / Math.max(qWords.size, pWords.length);
}

// ── keyword relevance ─────────────────────────────────────────────────────────
//
// DevBrain works with no AI service configured: the coding agent writes every
// entry, so the only thing a model was still needed for was embeddings. Without
// them, relevance comes from the words themselves. Entries are short and written
// to be searched — a symptom title, a verbatim error, a few tags — which is the
// case keyword matching handles well.

// Words that appear in almost every query or entry and so tell entries apart
// not at all, including the ones every DevBrain query carries ("fix", "issue").
const STOPWORDS = new Set((
  'the and for with that this from into when what why how does did not are was were has have had ' +
  'any all can could should would will just also than then there their them they you your our its ' +
  'fix fixes fixed fixing issue issues problem problems bug bugs about after before past again'
).split(' '));

/** Content words of a text, lowercased and lightly stemmed. */
export function keywordTerms(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .map(w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w));
}

/**
 * Share of the query's content words found in an entry, 0..1. A word in the
 * title, error pattern or tags counts fully; one only in the body counts less,
 * since bodies mention many things in passing.
 */
export function keywordScore(query: string, e: Pick<Entry, 'title' | 'content' | 'tags' | 'errorPattern'>): number {
  const q = [...new Set(keywordTerms(query))];
  if (!q.length) return 0;
  const strong = new Set(keywordTerms(`${e.title} ${e.errorPattern ?? ''} ${e.tags.join(' ')}`));
  const weak = new Set(keywordTerms(e.content ?? ''));
  const hit = q.reduce((sum, w) => sum + (strong.has(w) ? 1 : weak.has(w) ? 0.6 : 0), 0);
  return hit / q.length;
}

/** Minimum keyword score for a search hit; see preciseSearch. */
export const KEYWORD_THRESHOLD = 0.25;

export interface PreciseSearchResult extends SearchResult {
  matchType: 'pattern' | 'semantic';
  patternScore: number;
  categoryMatch: boolean;
  /** True when the hit is from the project the query was made in. */
  sameProject: boolean;
}

export function preciseSearch(
  queryText: string,
  queryEmbedding: number[],
  entries: (Entry & { project: Project })[],
  opts: { category?: EntryCategory; topK?: number; threshold?: number; projectId?: string } = {}
): PreciseSearchResult[] {
  const { category, topK = 8, threshold = 0.60, projectId } = opts;
  const results: PreciseSearchResult[] = [];

  for (const e of entries) {
    if (e.supersededBy) continue;
    // No query embedding (no AI configured, or it failed): rank by keywords.
    // An entry saved without an embedding is also matched by keywords, rather
    // than being unfindable by every embedded query.
    const byVector      = queryEmbedding.length > 0 && !!e.embedding?.length;
    const semantic      = byVector
      ? cosineSimilarity(queryEmbedding, e.embedding!)
      : keywordScore(queryText, e);
    // The threshold is calibrated for cosine similarity. A keyword score is a
    // share of query words found, and a quarter of them is already a real hit.
    const minScore      = byVector ? threshold : Math.min(threshold, KEYWORD_THRESHOLD);
    const patternScore  = e.errorPattern ? patternOverlap(queryText, e.errorPattern) : 0;
    const titleScore    = patternOverlap(queryText, e.title);
    const categoryMatch = !!category && e.category === category;
    const bestPattern   = Math.max(patternScore, titleScore * 0.6);

    // skip entries with no signal
    if (semantic < minScore && bestPattern < 0.25 && !categoryMatch) continue;

    results.push({
      entry: e,
      project: e.project,
      similarity: semantic,
      patternScore: bestPattern,
      categoryMatch,
      matchType: bestPattern >= 0.5 ? 'pattern' : 'semantic',
      sameProject: !!projectId && e.projectId === projectId,
    });
  }

  // Rank: pattern matches first, then combined score — with same-repo results
  // ahead of equally-scoring ones from elsewhere.
  //
  // Without this term a Cloud Run entry from another repo came back level with a
  // same-repo hit for a same-repo query. Knowledge does transfer across projects,
  // but "this happened here" should outrank "this happened somewhere" at equal
  // relevance. The boost is small enough that a markedly better cross-project
  // match still wins.
  const score = (r: PreciseSearchResult) =>
    r.patternScore * 0.5 + r.similarity * 0.35 + (r.categoryMatch ? 0.15 : 0) + (r.sameProject ? 0.12 : 0);
  results.sort((a, b) => score(b) - score(a));

  return results.slice(0, topK);
}

export function similarityLabel(score: number): string {
  if (score >= 0.92) return '99% match';
  if (score >= 0.88) return '95% match';
  if (score >= 0.82) return '90% match';
  if (score >= 0.75) return '80% match';
  if (score >= 0.65) return '70% match';
  return `${Math.round(score * 100)}% match`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export function buildContext(
  all: (Entry & { project: Project })[],
  currentProject: Project | null,
  queryEmbedding?: number[],
  queryText?: string,
  queryCategory?: EntryCategory,
): DevBrainContext {
  const now = Date.now();
  const maxAge = 365 * 24 * 60 * 60 * 1000;
  const currentStack = currentProject?.stack ?? [];

  const scored = all.map(e => {
    let semantic = 0;
    if (queryEmbedding && e.embedding && e.embedding.length > 0) {
      semantic = cosineSimilarity(queryEmbedding, e.embedding);
    } else if (!queryEmbedding) {
      // no query: same-project entries rank higher by default
      semantic = e.projectId === currentProject?.id ? 0.8 : 0.35;
      // A query with no embedding still says what the task is about. Blend in
      // keyword relevance so the briefing leans toward it.
      if (queryText?.trim()) semantic = semantic * 0.5 + keywordScore(queryText, e) * 0.5;
    }
    const recency         = Math.max(0, 1 - (now - e.createdAt) / maxAge);
    // with a query: only boost same-project entries that are semantically relevant
    // without a query: always boost same-project entries
    const sameProj        = (e.projectId === currentProject?.id && (semantic > 0.72 || !queryEmbedding)) ? 1 : 0;
    const sameStack       = currentStack.length > 0 && e.project.stack.some(s => currentStack.includes(s)) ? 1 : 0;
    const usage             = Math.min((e.retrievalCount ?? 0) / 20, 1);
    const confidenceScore   = e.confidence === 'confirmed' ? 1 : e.confidence === 'corroborated' ? 0.5 : 0;
    const categoryBoost     = queryCategory && e.category === queryCategory ? 1 : 0;
    const patternBoost      = queryText && e.errorPattern ? patternOverlap(queryText, e.errorPattern) : 0;
    const crossProjectBoost = (e.seenInProjects?.length ?? 0) >= 2 ? 1 : 0;
    const score = semantic * 0.45 + recency * 0.10 + sameProj * 0.10 + sameStack * 0.08 + usage * 0.05 + confidenceScore * 0.05 + categoryBoost * 0.07 + patternBoost * 0.05 + crossProjectBoost * 0.05;
    return { entry: e, project: e.project, score, semantic };
  });

  const relevant = queryEmbedding
    ? scored.filter(r => !r.entry.embedding || r.semantic >= 0.60)
    : scored;

  relevant.sort((a, b) => b.score - a.score);

  function dedupe(list: typeof relevant, limit: number): ContextEntry[] {
    const out: typeof relevant = [];
    for (const item of list) {
      if (out.length >= limit) break;
      const isDupe = out.some(s =>
        s.entry.embedding && item.entry.embedding &&
        cosineSimilarity(s.entry.embedding, item.entry.embedding) > 0.92
      );
      if (!isDupe) out.push(item);
    }
    return out.map(({ entry, project, score }) => ({ entry, project, score }));
  }

  const active     = relevant.filter(r => !r.entry.supersededBy);
  const superseded = relevant.filter(r => r.entry.supersededBy && r.entry.type === 'decision');

  // cross-project: seen in 2+ projects, not project-specific types
  const crossProjectEligible = active.filter(r =>
    (r.entry.seenInProjects?.length ?? 0) >= 2 &&
    r.entry.type !== 'stack' && r.entry.type !== 'note' && r.entry.type !== 'image'
  );

  // Route by the registry rather than by hand-written type lists. Previously
  // `note` and `solution` matched no branch at all, so those entries were stored
  // and then never shown — `devbrain note "..."` without a prefix vanished.
  const inSection = (name: EntrySection, limit: number) =>
    dedupe(active.filter(r => sectionFor(r.entry.type) === name), limit);

  return {
    crossProjectPatterns: crossProjectEligible.length > 0 ? dedupe(crossProjectEligible, 5) : undefined,
    issues:               inSection('issues', 5),
    decisions:            inSection('decisions', 5),
    architecture:         inSection('architecture', 4),
    patterns:             inSection('patterns', 5),
    antiPatterns:         inSection('antiPatterns', 4),
    stacks:               inSection('stack', 3),
    notes:                inSection('notes', 4),
    supersededDecisions:  superseded.length > 0 ? dedupe(superseded, 3) : undefined,
    currentProject,
  };
}

export async function compressContext(ctx: DevBrainContext): Promise<DevBrainContext> {
  const [issues, decisions, patterns, antiPatterns] = await Promise.all([
    ctx.issues.length >= 2
      ? synthesizeSection('issues and fixes', ctx.issues.map(r => r.entry))
      : Promise.resolve(null),
    ctx.decisions.length >= 2
      ? synthesizeSection('architecture decisions', ctx.decisions.map(r => r.entry))
      : Promise.resolve(null),
    ctx.patterns.length >= 2
      ? synthesizeSection('patterns and lessons', ctx.patterns.map(r => r.entry))
      : Promise.resolve(null),
    ctx.antiPatterns.length >= 2
      ? synthesizeSection('anti-patterns and known failure modes', ctx.antiPatterns.map(r => r.entry))
      : Promise.resolve(null),
  ]);
  return {
    ...ctx,
    synthesis: {
      issues:       issues       ?? undefined,
      decisions:    decisions    ?? undefined,
      patterns:     patterns     ?? undefined,
      antiPatterns: antiPatterns ?? undefined,
    },
  };
}

/** Trim to a budget on a word boundary, so an agent never reads a half word. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max * 0.6))).replace(/[\s,;:—-]+$/, '') + '…';
}

/**
 * One entry, rendered for an agent that has to act on it.
 *
 * Context used to carry the title plus 120 characters of the solution, and left
 * out errorPattern and causeArchetype entirely — even though errorPattern is
 * what makes "I am seeing this exact error" match a past fix, and is the field
 * the ranker already leans on. An agent could tell that something similar had
 * happened before, but not what to do about it.
 */
function entryLines(r: ContextEntry, contentBudget: number, opts: { evidence?: boolean } = {}): string[] {
  const out: string[] = [];
  const e = r.entry;
  if (e.content && e.content !== e.title) out.push(`   → ${clip(e.content, contentBudget)}`);
  if (opts.evidence && e.errorPattern) out.push(`   error: ${clip(e.errorPattern, 200)}`);
  if (opts.evidence && e.causeArchetype) out.push(`   root cause: ${clip(e.causeArchetype, 160)}`);
  if (e.tags.length) out.push(`   tags: ${e.tags.slice(0, 6).join(', ')}`);
  return out;
}

export function formatContext(ctx: DevBrainContext, query?: string): string {
  const projectName = ctx.currentProject?.name ?? 'DevBrain';
  const total = ctx.issues.length + ctx.decisions.length + ctx.architecture.length
    + ctx.patterns.length + ctx.antiPatterns.length + ctx.stacks.length + ctx.notes.length;

  if (total === 0 && !ctx.crossProjectPatterns?.length) {
    return `# DevBrain Context — ${projectName}\n\nNo relevant knowledge found${query ? ` for "${query}"` : ''}.`;
  }

  const lines: string[] = [];
  lines.push(`# DevBrain Context — ${projectName}${query ? ` — "${query}"` : ''}`);
  lines.push('');

  if (ctx.crossProjectPatterns && ctx.crossProjectPatterns.length > 0) {
    lines.push('## Cross-Project Patterns');
    ctx.crossProjectPatterns.forEach(r => {
      const projects = r.entry.seenInProjects?.length ?? 0;
      const badge = projects >= 2 ? ` [×${projects} projects]` : '';
      lines.push(`- ${r.entry.title}${badge}`);
      if (r.entry.causeArchetype) lines.push(`  archetype: ${r.entry.causeArchetype}`);
      if (r.entry.content && r.entry.content !== r.entry.title) {
        lines.push(`  → ${clip(r.entry.content, 400)}`);
      }
    });
    lines.push('');
  }

  if (ctx.issues.length > 0) {
    lines.push('## Past Issues & Fixes');
    if (ctx.synthesis?.issues) {
      lines.push(ctx.synthesis.issues);
    } else {
      // Issues carry the most actionable detail, so they get the largest budget
      // and the evidence fields an agent needs to match and apply a past fix.
      ctx.issues.forEach((r, i) => {
        lines.push(`${i + 1}. [${normalizeType(r.entry.type)}] ${r.entry.title}`);
        lines.push(`   ${r.project.name} · ${timeAgo(r.entry.createdAt)}`);
        lines.push(...entryLines(r, 700, { evidence: true }));
      });
    }
    lines.push('');
  }

  if (ctx.decisions.length > 0) {
    lines.push('## Architecture Decisions');
    if (ctx.synthesis?.decisions) {
      lines.push(ctx.synthesis.decisions);
    } else {
      ctx.decisions.forEach(r => {
        lines.push(`- ${r.entry.title}`);
        if (r.entry.content && r.entry.content !== r.entry.title) {
          lines.push(`  → ${clip(r.entry.content, 400)}`);
        }
      });
    }
    lines.push('');
  }

  if (ctx.architecture.length > 0) {
    lines.push('## Architecture');
    ctx.architecture.forEach(r => {
      lines.push(`- ${r.entry.title}`);
      if (r.entry.content && r.entry.content !== r.entry.title) {
        lines.push(`  → ${clip(r.entry.content, 400)}`);
      }
    });
    lines.push('');
  }

  if (ctx.patterns.length > 0) {
    lines.push('## Patterns & Lessons');
    if (ctx.synthesis?.patterns) {
      lines.push(ctx.synthesis.patterns);
    } else {
      ctx.patterns.forEach(r => {
        lines.push(`- ${r.entry.title}`);
        if (r.entry.content && r.entry.content !== r.entry.title) {
          lines.push(`  → ${clip(r.entry.content, 400)}`);
        }
      });
    }
    lines.push('');
  }

  if (ctx.antiPatterns.length > 0) {
    lines.push('## Anti-Patterns (avoid these)');
    if (ctx.synthesis?.antiPatterns) {
      lines.push(ctx.synthesis.antiPatterns);
    } else {
      ctx.antiPatterns.forEach(r => {
        lines.push(`- ${r.entry.title}`);
        if (r.entry.content && r.entry.content !== r.entry.title) {
          lines.push(`  → ${clip(r.entry.content, 400)}`);
        }
      });
    }
    lines.push('');
  }

  if (ctx.stacks.length > 0) {
    lines.push('## Stack Notes');
    ctx.stacks.forEach(r => lines.push(`- ${r.entry.title}`));
    lines.push('');
  }

  // Unclassified saves still surface here. Without this section a bare
  // `devbrain note "..."` was stored and then never shown again.
  if (ctx.notes.length > 0) {
    lines.push('## Notes');
    ctx.notes.forEach(r => {
      lines.push(`- ${r.entry.title}`);
      if (r.entry.content && r.entry.content !== r.entry.title) {
        lines.push(`  → ${clip(r.entry.content, 400)}`);
      }
    });
    lines.push('');
  }

  if (ctx.supersededDecisions && ctx.supersededDecisions.length > 0) {
    lines.push('## Past Decisions (superseded)');
    ctx.supersededDecisions.forEach(r => {
      lines.push(`- [SUPERSEDED] ${r.entry.title}`);
      if (r.entry.content && r.entry.content !== r.entry.title) {
        lines.push(`  → ${clip(r.entry.content, 400)}`);
      }
    });
    lines.push('');
  }

  if (ctx.currentProject?.stack?.length) {
    lines.push('## Tech Stack');
    lines.push(ctx.currentProject.stack.join(' · '));
  }

  return lines.join('\n').trim();
}
