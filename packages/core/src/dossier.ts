// Project dossier — everything known about one project, in one place.
//
// Knowledge was previously only reachable by querying across all projects: search
// returned a flat ranked list, context returned a truncated top-N slice, and
// export wrote type-named files (bugs.txt, fixes.txt) that mixed every project
// together. There was no answer to "show me this project and everything in it".
//
// A dossier is that answer: the project's identity and stack, then every entry
// grouped into the sections declared by the type registry. Nothing is truncated
// and nothing is dropped — every entry type maps to a section, so an entry that
// exists is always somewhere a reader can find it.

import type { Entry, EntrySection, Project } from './types';
import { ENTRY_SECTIONS, SECTION_META, normalizeType, sectionFor } from './types';
import { timeAgo } from './search';

export interface DossierSection {
  section: EntrySection;
  heading: string;
  blurb: string;
  file: string;
  entries: Entry[];
}

export interface ProjectDossier {
  project: Project;
  total: number;
  /** Non-empty sections, in declared order. */
  sections: DossierSection[];
  /** Every section including empty ones, for counts. */
  counts: Record<EntrySection, number>;
  firstEntryAt?: number;
  lastEntryAt?: number;
  supersededCount: number;
}

export function buildDossier(project: Project, entries: Entry[]): ProjectDossier {
  const mine = entries.filter(e => e.projectId === project.id);

  const counts = Object.fromEntries(
    ENTRY_SECTIONS.map(s => [s, 0]),
  ) as Record<EntrySection, number>;

  const bySection = new Map<EntrySection, Entry[]>();
  for (const section of ENTRY_SECTIONS) bySection.set(section, []);

  for (const entry of mine) {
    const section = sectionFor(entry.type);
    bySection.get(section)!.push(entry);
    counts[section]++;
  }

  // Newest first within a section — the most recent lesson is usually the one
  // that still applies.
  for (const list of bySection.values()) list.sort((a, b) => b.createdAt - a.createdAt);

  const sections: DossierSection[] = ENTRY_SECTIONS
    .filter(s => bySection.get(s)!.length > 0)
    .map(s => ({
      section: s,
      heading: SECTION_META[s].heading,
      blurb: SECTION_META[s].blurb,
      file: SECTION_META[s].file,
      entries: bySection.get(s)!,
    }));

  const times = mine.map(e => e.createdAt).filter(t => Number.isFinite(t) && t > 0);

  return {
    project,
    total: mine.length,
    sections,
    counts,
    firstEntryAt: times.length ? Math.min(...times) : undefined,
    lastEntryAt: times.length ? Math.max(...times) : undefined,
    supersededCount: mine.filter(e => e.supersededBy).length,
  };
}

function entryMarkdown(entry: Entry): string[] {
  const out: string[] = [];
  const type = normalizeType(entry.type);
  const flags: string[] = [];
  if (entry.supersededBy) flags.push('superseded');
  if (entry.confidence && entry.confidence !== 'observation') flags.push(entry.confidence);
  if ((entry.seenInProjects?.length ?? 0) >= 2) flags.push(`seen in ${entry.seenInProjects!.length} projects`);

  out.push(`### ${entry.title}`);
  out.push('');
  const meta = [`\`${type}\``];
  if (entry.category) meta.push(`\`${entry.category}\``);
  meta.push(timeAgo(entry.createdAt));
  if (flags.length) meta.push(flags.join(' · '));
  out.push(meta.join(' · '));
  out.push('');

  if (entry.content && entry.content !== entry.title) {
    out.push(entry.content);
    out.push('');
  }
  if (entry.errorPattern) {
    out.push('**Error pattern**');
    out.push('');
    out.push('```');
    out.push(entry.errorPattern);
    out.push('```');
    out.push('');
  }
  if (entry.causeArchetype) {
    out.push(`**Root-cause pattern:** ${entry.causeArchetype}`);
    out.push('');
  }
  if (entry.tags.length) {
    out.push(`**Tags:** ${entry.tags.map(t => `\`${t}\``).join(', ')}`);
    out.push('');
  }
  return out;
}

function header(d: ProjectDossier): string[] {
  const out: string[] = [];
  out.push(`# ${d.project.name}`);
  out.push('');
  out.push(`**Stack:** ${d.project.stack.length ? d.project.stack.join(' · ') : 'not detected'}`);
  out.push(`**Path:** \`${d.project.path}\``);
  out.push(`**Memory:** ${d.total} ${d.total === 1 ? 'entry' : 'entries'}`
    + (d.lastEntryAt ? `, last updated ${timeAgo(d.lastEntryAt)}` : '')
    + (d.supersededCount ? ` · ${d.supersededCount} superseded` : ''));
  out.push('');
  return out;
}

/** The whole dossier as one Markdown document. */
export function formatDossierMarkdown(d: ProjectDossier): string {
  const out = header(d);

  if (d.total === 0) {
    out.push('No knowledge recorded for this project yet.');
    out.push('');
    out.push('Run `devbrain backfill` to read past commits, or save something with');
    out.push('`devbrain note "fix: ..."`.');
    return out.join('\n');
  }

  out.push('## Contents');
  out.push('');
  for (const s of d.sections) {
    out.push(`- **${s.heading}** (${s.entries.length}) — ${s.blurb}`);
  }
  out.push('');

  for (const s of d.sections) {
    out.push(`---`);
    out.push('');
    out.push(`## ${s.heading}`);
    out.push('');
    out.push(`_${s.blurb}_`);
    out.push('');
    for (const entry of s.entries) out.push(...entryMarkdown(entry));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export interface DossierFile {
  /** Relative path inside the project's folder. */
  path: string;
  contents: string;
}

/**
 * The dossier split into one Markdown file per section, plus a README index.
 *
 * Useful for committing a project's memory into the repo, or for browsing it in
 * any Markdown viewer without DevBrain installed.
 */
export function dossierFiles(d: ProjectDossier): DossierFile[] {
  const files: DossierFile[] = [];

  const index = header(d);
  if (d.sections.length === 0) {
    index.push('No knowledge recorded for this project yet.');
  } else {
    index.push('## Sections');
    index.push('');
    for (const s of d.sections) {
      index.push(`- [${s.heading}](${s.file}) — ${s.entries.length} · ${s.blurb}`);
    }
  }
  index.push('');
  files.push({ path: 'README.md', contents: index.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' });

  for (const s of d.sections) {
    const out: string[] = [];
    out.push(`# ${s.heading} — ${d.project.name}`);
    out.push('');
    out.push(`_${s.blurb}_`);
    out.push('');
    out.push(`${s.entries.length} ${s.entries.length === 1 ? 'entry' : 'entries'}. [Back to overview](README.md)`);
    out.push('');
    for (const entry of s.entries) out.push(...entryMarkdown(entry));
    files.push({
      path: s.file,
      contents: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n',
    });
  }

  return files;
}
