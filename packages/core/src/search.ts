import type { Entry, EntryCategory, Project, SearchResult, ContextEntry, DevBrainContext } from './types';
import { synthesizeSection } from './gemini';

function cosineSimilarity(a: number[], b: number[]): number {
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

export interface PreciseSearchResult extends SearchResult {
  matchType: 'pattern' | 'semantic';
  patternScore: number;
  categoryMatch: boolean;
}

export function preciseSearch(
  queryText: string,
  queryEmbedding: number[],
  entries: (Entry & { project: Project })[],
  opts: { category?: EntryCategory; topK?: number; threshold?: number } = {}
): PreciseSearchResult[] {
  const { category, topK = 8, threshold = 0.60 } = opts;
  const results: PreciseSearchResult[] = [];

  for (const e of entries) {
    if (e.supersededBy) continue;
    const semantic      = e.embedding?.length ? cosineSimilarity(queryEmbedding, e.embedding) : 0;
    const patternScore  = e.errorPattern ? patternOverlap(queryText, e.errorPattern) : 0;
    const titleScore    = patternOverlap(queryText, e.title);
    const categoryMatch = !!category && e.category === category;
    const bestPattern   = Math.max(patternScore, titleScore * 0.6);

    // skip entries with no signal
    if (semantic < threshold && bestPattern < 0.25 && !categoryMatch) continue;

    results.push({
      entry: e,
      project: e.project,
      similarity: semantic,
      patternScore: bestPattern,
      categoryMatch,
      matchType: bestPattern >= 0.5 ? 'pattern' : 'semantic',
    });
  }

  // rank: pattern matches first, then by combined score
  results.sort((a, b) => {
    const scoreA = a.patternScore * 0.5 + a.similarity * 0.35 + (a.categoryMatch ? 0.15 : 0);
    const scoreB = b.patternScore * 0.5 + b.similarity * 0.35 + (b.categoryMatch ? 0.15 : 0);
    return scoreB - scoreA;
  });

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

  return {
    crossProjectPatterns: crossProjectEligible.length > 0 ? dedupe(crossProjectEligible, 5) : undefined,
    issues:               dedupe(active.filter(r => r.entry.type === 'bug' || r.entry.type === 'fix'), 5),
    decisions:            dedupe(active.filter(r => r.entry.type === 'decision'), 5),
    patterns:             dedupe(active.filter(r => r.entry.type === 'pattern' || r.entry.type === 'lesson'), 5),
    antiPatterns:         dedupe(active.filter(r => r.entry.type === 'anti-pattern'), 4),
    stacks:               dedupe(active.filter(r => r.entry.type === 'stack'), 3),
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

export function formatContext(ctx: DevBrainContext, query?: string): string {
  const projectName = ctx.currentProject?.name ?? 'DevBrain';
  const total = ctx.issues.length + ctx.decisions.length + ctx.patterns.length + ctx.antiPatterns.length + ctx.stacks.length;

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
        lines.push(`  → ${r.entry.content.slice(0, 120)}`);
      }
    });
    lines.push('');
  }

  if (ctx.issues.length > 0) {
    lines.push('## Past Issues & Fixes');
    if (ctx.synthesis?.issues) {
      lines.push(ctx.synthesis.issues);
    } else {
      ctx.issues.forEach((r, i) => {
        lines.push(`${i + 1}. [${r.entry.type}] ${r.entry.title}`);
        lines.push(`   ${r.project.name} · ${timeAgo(r.entry.createdAt)}`);
        if (r.entry.content) lines.push(`   → ${r.entry.content.slice(0, 160)}`);
        if (r.entry.tags.length) lines.push(`   tags: ${r.entry.tags.join(', ')}`);
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
          lines.push(`  → ${r.entry.content.slice(0, 120)}`);
        }
      });
    }
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
          lines.push(`  → ${r.entry.content.slice(0, 120)}`);
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
          lines.push(`  → ${r.entry.content.slice(0, 120)}`);
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

  if (ctx.supersededDecisions && ctx.supersededDecisions.length > 0) {
    lines.push('## Past Decisions (superseded)');
    ctx.supersededDecisions.forEach(r => {
      lines.push(`- [SUPERSEDED] ${r.entry.title}`);
      if (r.entry.content && r.entry.content !== r.entry.title) {
        lines.push(`  → ${r.entry.content.slice(0, 120)}`);
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
