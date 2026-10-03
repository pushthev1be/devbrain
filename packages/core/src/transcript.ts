// Reading a coding-agent session transcript as evidence.
//
// Commit capture sees a diff, and a diff records what changed but almost never
// why: not the error that started the work, not the approach that failed first,
// not the alternative that was rejected. That knowledge lives in the session —
// the user's request, the tool output that came back red, the edits that
// followed, and the agent's own explanation of the cause. The agent was asked
// to write it down (task_end, save_entry) and mostly did not.
//
// This module turns a Claude Code JSONL transcript into a compact digest of that
// evidence, so it can be extracted without anyone being asked. It is pure: no
// I/O, no model calls, so every rule here is unit-tested.

/** `save` — the agent itself recorded knowledge (save_entry, task_end, devbrain note). */
export type DigestKind = 'prompt' | 'say' | 'edit' | 'command' | 'error' | 'save';

export interface DigestEvent {
  kind: DigestKind;
  text: string;
  /** Transcript line the event came from, so a cursor can stop between events. */
  line?: number;
  /** For an error: the command that produced it. Kept apart so the error text stays verbatim. */
  via?: string;
}

export interface TranscriptSegment {
  events: DigestEvent[];
  /** Number of lines in the transcript; the cursor for the next read. */
  endLine: number;
  sessionId?: string;
  cwd?: string;
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
/** MCP tools through which an agent records knowledge, under any server prefix. */
const SAVE_TOOL = /(?:^|__)(save_entry|task_end|supersede_entry)$/;
const SAVE_COMMAND = /\bdevbrain\s+(?:note|recap)\b/;

// Lines that are an error by their shape, not because the word "error" appears
// somewhere in a grep result or a source file.
const ERROR_LINE =
  // Case-sensitive on purpose: "FAIL" from a test runner is a failure, a
  // `fail:` key in printed source code is not.
  /^\s*(?:[\w.]*(?:Error|Exception)\b|Traceback \(most recent call last\)|npm ERR!|[Ee]rror(?:\[\w+\])?:|[Ff]atal:|panic:|FAIL\b|✗|×|E\d{3,}\b|Exit code [1-9]|.*\berror TS\d+:)/;

// Commands that print files or search them. Their output is source code, which
// is full of the word Error; only the tool reporting failure counts for these.
const READ_COMMAND = /^\s*(?:cd\s+\S+\s*&&\s*)?(?:cat|sed\s+-n|head|tail|less|grep|rg|ls|find|git\s+(?:show|diff|log|grep|blame)|Get-Content|Select-String|type)\b/;

/**
 * True when a command only prints files or searches them.
 *
 * Their output is source code, which is full of the word Error, so error
 * detection on it produces false failures. Only the tool reporting a non-zero
 * exit counts for these.
 */
export function isReadOnlyCommand(command: string): boolean {
  return READ_COMMAND.test(command);
}

// Wrappers the IDE and harness put into user turns. They are context for the
// agent, not something the user asked.
const NOISE_TAGS = /<(system-reminder|ide_opened_file|ide_selection|ide_diagnostics|command-message|command-name|command-args|local-command-stdout|local-command-stderr|pasted_content)[^>]*>[\s\S]*?<\/\1>/g;

function cleanPrompt(text: string): string {
  return text.replace(NOISE_TAGS, ' ').replace(/\s+/g, ' ').trim();
}

function resultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(b => (b && typeof b === 'object' && (b as { type?: string }).type === 'text' ? String((b as { text?: unknown }).text ?? '') : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * The error-bearing part of a tool result: the lines that look like an error,
 * each with the line after it (usually the location or the real message). Kept
 * verbatim, because a literal error string is what lets a future search match.
 */
export function errorExcerpt(output: string, max = 600): string {
  const lines = output.split(/\r?\n/);
  const keep: string[] = [];
  for (let i = 0; i < lines.length && keep.join('\n').length < max; i++) {
    if (ERROR_LINE.test(lines[i])) {
      keep.push(lines[i].trimEnd());
      if (lines[i + 1]?.trim()) keep.push(lines[i + 1].trimEnd());
      i++;
    }
  }
  const text = (keep.length ? keep : lines.filter(l => l.trim()).slice(-6)).join('\n').trim();
  return text.length > max ? text.slice(0, max) : text;
}

/** True when a tool result reports a failure. */
export function looksLikeError(output: string, isError: boolean): boolean {
  if (isError) return true;
  return output.split(/\r?\n/).slice(0, 400).some(l => ERROR_LINE.test(l));
}

/**
 * Parse a transcript from line `fromLine` onward.
 *
 * Subagent (sidechain) turns are skipped: their final answer comes back to the
 * main agent as a tool result anyway, and their exploration is noise here.
 */
export function parseTranscript(jsonl: string, fromLine = 0): TranscriptSegment {
  const lines = jsonl.split('\n');
  // A trailing newline leaves an empty last element; a transcript still being
  // written may end mid-line. Either way the last element is not a complete
  // record yet, so it is not consumed — the next read starts there.
  const complete = lines.length - 1;
  const events: DigestEvent[] = [];
  const toolNames = new Map<string, { name: string; command?: string }>();
  let sessionId: string | undefined;
  let cwd: string | undefined;

  for (let i = Math.max(0, fromLine); i < complete; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    let ev: Record<string, unknown>;
    try { ev = JSON.parse(raw); } catch { continue; }
    if (ev.isSidechain) continue;
    if (typeof ev.sessionId === 'string') sessionId = ev.sessionId;
    if (typeof ev.cwd === 'string') cwd = ev.cwd;

    const message = ev.message as { content?: unknown } | undefined;
    const content = message?.content;

    if (ev.type === 'user') {
      if (typeof content === 'string') {
        const text = cleanPrompt(content);
        if (text && !text.startsWith('[Request interrupted')) events.push({ kind: 'prompt', text, line: i });
        continue;
      }
      if (!Array.isArray(content)) continue;
      for (const block of content as Record<string, unknown>[]) {
        if (block?.type === 'text') {
          const text = cleanPrompt(String(block.text ?? ''));
          if (text && !text.startsWith('[Request interrupted')) events.push({ kind: 'prompt', text, line: i });
        } else if (block?.type === 'tool_result') {
          const out = resultText(block.content);
          const tool = toolNames.get(String(block.tool_use_id ?? ''));
          // Only shell output carries errors worth keeping. A Read of a file that
          // happens to contain "Error:" is not a failure.
          const fromShell = !tool || SHELL_TOOLS.has(tool.name);
          const failed = block.is_error === true;
          const reading = !!tool?.command && READ_COMMAND.test(tool.command);
          if (fromShell && (reading ? failed : looksLikeError(out, failed))) {
            events.push({
              kind: 'error', text: errorExcerpt(out), line: i,
              ...(tool?.command ? { via: tool.command.slice(0, 120) } : {}),
            });
          }
        }
      }
      continue;
    }

    if (ev.type === 'assistant' && Array.isArray(content)) {
      for (const block of content as Record<string, unknown>[]) {
        if (block?.type === 'text') {
          const text = String(block.text ?? '').trim();
          if (text) events.push({ kind: 'say', text, line: i });
        } else if (block?.type === 'tool_use') {
          const name = String(block.name ?? '');
          const input = (block.input ?? {}) as Record<string, unknown>;
          const id = String(block.id ?? '');
          if (SAVE_TOOL.test(name)) {
            events.push({ kind: 'save', text: String(input.title ?? input.summary ?? input.reason ?? name).slice(0, 200), line: i });
            toolNames.set(id, { name });
          } else if (EDIT_TOOLS.has(name)) {
            const file = String(input.file_path ?? input.notebook_path ?? '');
            if (file) events.push({ kind: 'edit', text: file, line: i });
            toolNames.set(id, { name });
          } else if (SHELL_TOOLS.has(name)) {
            const command = String(input.command ?? '').replace(/\s+/g, ' ').trim();
            if (command) events.push({ kind: SAVE_COMMAND.test(command) ? 'save' : 'command', text: command.slice(0, 200), line: i });
            toolNames.set(id, { name, command });
          } else {
            toolNames.set(id, { name });
          }
        }
      }
    }
  }

  return { events, endLine: complete, sessionId, cwd };
}

export interface SegmentAssessment {
  /** Something in it could plausibly be worth remembering. */
  worth: boolean;
  /** An error is still open: it came after the last edit, so the fix is pending. */
  unresolved: boolean;
  edits: number;
  errors: number;
}

const DECISION_CUE = /\b(instead of|rather than|decided|chose|trade-?off|root cause|the cause|turns out|because)\b/i;

/**
 * Cheap gate before any model call. Most turns are reading, answering and
 * small edits; spending an extraction on each would cost money and produce the
 * noise this system exists to avoid.
 */
export function assessSegment(events: DigestEvent[]): SegmentAssessment {
  let edits = 0, errors = 0, lastEdit = -1, lastError = -1, said = 0;
  let cue = false;
  events.forEach((e, i) => {
    if (e.kind === 'edit') { edits++; lastEdit = i; }
    if (e.kind === 'error') { errors++; lastError = i; }
    if (e.kind === 'say') { said += e.text.length; if (DECISION_CUE.test(e.text)) cue = true; }
  });

  const debugged = errors > 0 && edits > 0;
  const substantialWork = edits >= 2 && said >= 800 && cue;
  const discussion = edits === 0 && said >= 2500 && cue;   // a design call made in conversation

  return {
    worth: debugged || substantialWork || discussion,
    unresolved: lastError > lastEdit,
    edits,
    errors,
  };
}

const LABEL: Record<DigestKind, string> = {
  prompt: 'USER', say: 'AGENT', edit: 'EDITED', command: 'RAN', error: 'ERROR', save: 'SAVED',
};
const CAP: Record<DigestKind, number> = { prompt: 600, say: 900, edit: 200, command: 200, error: 700, save: 200 };

function line(e: DigestEvent): string {
  const t = e.text.length > CAP[e.kind] ? `${e.text.slice(0, CAP[e.kind])}…` : e.text;
  return `${LABEL[e.kind]}${e.via ? ` [${e.via}]` : ''}: ${t}`;
}

/**
 * Render events as a digest under `budget` characters.
 *
 * When it does not fit, the agent's prose goes first, oldest first — errors,
 * the user's words, and what was edited are the evidence and are kept longest.
 * The agent's last few messages are also kept: they usually state the cause.
 */
export function buildDigest(events: DigestEvent[], budget = 14_000): string {
  const rendered = events.map(e => ({ e, text: line(e), keep: true }));
  const size = () => rendered.reduce((n, r) => n + (r.keep ? r.text.length + 1 : 0), 0);

  const lastSays = new Set(
    rendered.map((r, i) => (r.e.kind === 'say' ? i : -1)).filter(i => i >= 0).slice(-3),
  );
  for (const kind of ['say', 'command', 'edit', 'prompt'] as DigestKind[]) {
    for (let i = 0; i < rendered.length && size() > budget; i++) {
      if (rendered[i].e.kind === kind && !(kind === 'say' && lastSays.has(i))) rendered[i].keep = false;
    }
  }

  // Collapse runs of the same file edited repeatedly into one line.
  const out: string[] = [];
  for (const r of rendered) {
    if (!r.keep) continue;
    if (out.length && out[out.length - 1] === r.text && r.e.kind !== 'say') continue;
    out.push(r.text);
  }
  const text = out.join('\n');
  return text.length > budget ? text.slice(text.length - budget) : text;
}

/**
 * Split a long session into chunks that each fit the budget, cutting only where
 * the user spoke, so a problem and its fix are not separated mid-thought.
 */
export function chunkEvents(events: DigestEvent[], budget = 14_000): DigestEvent[][] {
  const chunks: DigestEvent[][] = [];
  let current: DigestEvent[] = [];
  let size = 0;
  for (const e of events) {
    const len = line(e).length + 1;
    if (e.kind === 'prompt' && current.length && size + len > budget) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(e);
    size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}
