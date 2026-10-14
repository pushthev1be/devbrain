'use strict';

const devbrainCore1 = require('./devbrain-core-1.js');

var types = {};

var hasRequiredTypes;

function requireTypes () {
	if (hasRequiredTypes) return types;
	hasRequiredTypes = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.RECALL_LOG_MAX = exports.DIFF_ENTRY_TYPES = exports.ENTRY_TYPE_NAMES = exports.ENTRY_TYPES = exports.SECTION_META = exports.ENTRY_SECTIONS = exports.ENTRY_CATEGORIES = void 0;
		exports.entryTypeSpec = entryTypeSpec;
		exports.normalizeType = normalizeType;
		exports.sectionFor = sectionFor;
		exports.ENTRY_CATEGORIES = [
		    'auth', 'database', 'deployment', 'build', 'config',
		    'network', 'performance', 'ui', 'data', 'testing', 'security', 'other',
		];
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
		exports.ENTRY_SECTIONS = [
		    'issues', // what broke and what fixed it
		    'decisions', // choices made, and what was rejected
		    'architecture', // how the system is shaped
		    'patterns', // approaches that work, and lessons
		    'antiPatterns', // approaches that fail
		    'stack', // environment and tooling facts
		    'notes', // everything else, still findable
		    'attachments', // pointers to external artefacts (screenshots, diagrams)
		];
		/** Presentation for each section: heading, filename, and what it holds. */
		exports.SECTION_META = {
		    issues: { heading: 'Bugs & Fixes', file: 'issues.md', blurb: 'What broke here before, and what actually fixed it.' },
		    decisions: { heading: 'Decisions', file: 'decisions.md', blurb: 'Choices made, alternatives rejected, and why.' },
		    architecture: { heading: 'Architecture', file: 'architecture.md', blurb: 'How the system is shaped and what constrains it.' },
		    patterns: { heading: 'Patterns & Lessons', file: 'patterns.md', blurb: 'Approaches that work, and things that looked right but were not.' },
		    antiPatterns: { heading: 'Anti-Patterns', file: 'anti-patterns.md', blurb: 'Do not do these. Each one cost somebody time.' },
		    stack: { heading: 'Stack & Environment', file: 'stack.md', blurb: 'Versions, tools and environment facts that bite when forgotten.' },
		    notes: { heading: 'Notes', file: 'notes.md', blurb: 'Everything else worth keeping.' },
		    attachments: { heading: 'Attachments', file: 'attachments.md', blurb: 'Screenshots and diagrams, with what they show.' },
		};
		exports.ENTRY_TYPES = [
		    { type: 'bug', section: 'issues', label: 'Bug', fromDiff: true,
		        hint: 'the symptom, the misleading surface error, and the real cause' },
		    { type: 'fix', section: 'issues', label: 'Fix', fromDiff: true,
		        aliases: ['solution'],
		        hint: 'what broke, the root cause, and the exact resolution' },
		    { type: 'decision', section: 'decisions', label: 'Decision', fromDiff: true,
		        hint: 'what was chosen, what was rejected, and why' },
		    { type: 'architecture', section: 'architecture', label: 'Architecture', fromDiff: true,
		        hint: 'how a part of the system is structured and what constrains it' },
		    { type: 'pattern', section: 'patterns', label: 'Pattern', fromDiff: true,
		        hint: 'a reusable approach that applies beyond this one file' },
		    { type: 'lesson', section: 'patterns', label: 'Lesson', fromDiff: true,
		        hint: 'what looked right but was wrong, and why' },
		    { type: 'anti-pattern', section: 'antiPatterns', label: 'Anti-pattern', fromDiff: true,
		        hint: 'what to never do here, and the consequence' },
		    { type: 'stack', section: 'stack', label: 'Stack', fromDiff: true,
		        hint: 'a version, tool or environment fact that bites if forgotten' },
		    { type: 'note', section: 'notes', label: 'Note', fromDiff: true,
		        hint: 'anything worth keeping that does not fit the other kinds' },
		    { type: 'image', section: 'attachments', label: 'Attachment', fromDiff: false,
		        hint: 'a path or URL to a screenshot or diagram, plus what it shows' },
		];
		const TYPE_BY_NAME = new Map();
		for (const spec of exports.ENTRY_TYPES) {
		    TYPE_BY_NAME.set(spec.type, spec);
		    for (const alias of spec.aliases ?? [])
		        TYPE_BY_NAME.set(alias, spec);
		}
		/** Canonical type names, for building prompts, forms and prefix lists. */
		exports.ENTRY_TYPE_NAMES = exports.ENTRY_TYPES.map(t => t.type);
		/** Types Gemini is allowed to assign when reading a commit diff. */
		exports.DIFF_ENTRY_TYPES = exports.ENTRY_TYPES.filter(t => t.fromDiff).map(t => t.type);
		/**
		 * Map any stored type — current, legacy alias, or unrecognised — onto its spec.
		 * Unknown values fall back to `note`, which has a section, so an entry written by
		 * an older or newer version can never become invisible.
		 */
		function entryTypeSpec(type) {
		    return TYPE_BY_NAME.get(type) ?? TYPE_BY_NAME.get('note');
		}
		/** Canonical name for a stored type: `solution` → `fix`, unknown → `note`. */
		function normalizeType(type) {
		    return entryTypeSpec(type).type;
		}
		/** Section a stored type belongs to. */
		function sectionFor(type) {
		    return entryTypeSpec(type).section;
		}
		/**
		 * One occasion this entry was handed to an agent because something failed.
		 *
		 * `recallCount` says how often, which answers "is this earning its place" but
		 * not "on what". Without the query, an entry with 9 recalls cannot be told
		 * apart from one that matched the same flaky command nine times.
		 */
		/** How many recall events one entry keeps. Old ones fall off the front. */
		exports.RECALL_LOG_MAX = 20;
		
	} (types));
	return types;
}

var transcript = {};

var hasRequiredTranscript;

function requireTranscript () {
	if (hasRequiredTranscript) return transcript;
	hasRequiredTranscript = 1;
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
	Object.defineProperty(transcript, "__esModule", { value: true });
	transcript.isEchoedOutput = isEchoedOutput;
	transcript.isReadOnlyCommand = isReadOnlyCommand;
	transcript.errorExcerpt = errorExcerpt;
	transcript.isGenericFailureLine = isGenericFailureLine;
	transcript.looksLikeError = looksLikeError;
	transcript.parseTranscript = parseTranscript;
	transcript.assessSegment = assessSegment;
	transcript.buildDigest = buildDigest;
	transcript.chunkEvents = chunkEvents;
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
	 * DevBrain's own messages, which quote the error they are about.
	 *
	 * A step-back or a recall lands in the transcript carrying error text, so the
	 * next parse reads it as a fresh failure and the warning becomes its own
	 * evidence. Matched on the opening phrases rather than the word "DevBrain",
	 * which an application is free to print for its own reasons.
	 */
	const SELF_VOICE = /DevBrain: (?:step back|this stretch of work|this failure matches)|# DevBrain backfill/;
	/**
	 * True when output is DevBrain quoting an error back, or a command printing an
	 * error string it was handed.
	 *
	 * The second case is what test fixtures and demo scripts do: the literal error
	 * appears in the command, so the command did not discover a failure, it echoed
	 * one. Both are distinguishable from a real failure precisely because the text
	 * was already there before the command ran.
	 */
	function isEchoedOutput(output, command) {
	    if (SELF_VOICE.test(output))
	        return true;
	    if (!command)
	        return false;
	    const flat = (s) => s.toLowerCase().replace(/\s+/g, ' ');
	    const line = flat(errorExcerpt(output).split('\n')[0]);
	    // Short lines match too easily to be evidence of anything.
	    return line.length >= 20 && flat(command).includes(line.slice(0, 60));
	}
	/**
	 * True when a command only prints files or searches them.
	 *
	 * Their output is source code, which is full of the word Error, so error
	 * detection on it produces false failures. Only the tool reporting a non-zero
	 * exit counts for these.
	 */
	function isReadOnlyCommand(command) {
	    return READ_COMMAND.test(command);
	}
	// Wrappers the IDE and harness put into user turns. They are context for the
	// agent, not something the user asked.
	const NOISE_TAGS = /<(system-reminder|ide_opened_file|ide_selection|ide_diagnostics|command-message|command-name|command-args|local-command-stdout|local-command-stderr|pasted_content)[^>]*>[\s\S]*?<\/\1>/g;
	function cleanPrompt(text) {
	    return text.replace(NOISE_TAGS, ' ').replace(/\s+/g, ' ').trim();
	}
	function resultText(content) {
	    if (typeof content === 'string')
	        return content;
	    if (Array.isArray(content)) {
	        return content
	            .map(b => (b && typeof b === 'object' && b.type === 'text' ? String(b.text ?? '') : ''))
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
	function errorExcerpt(output, max = 600) {
	    const lines = output.split(/\r?\n/);
	    const keep = [];
	    for (let i = 0; i < lines.length && keep.join('\n').length < max; i++) {
	        // A generic line is never the best text available: it announces the failure
	        // without describing it, so it is skipped even though it looks like an error.
	        if (!ERROR_LINE.test(lines[i]) || isGenericFailureLine(lines[i]))
	            continue;
	        keep.push(lines[i].trimEnd());
	        if (lines[i + 1]?.trim()) {
	            keep.push(lines[i + 1].trimEnd());
	            i++;
	        }
	    }
	    const informative = lines.filter(l => l.trim() && !isGenericFailureLine(l)).slice(-6);
	    // Last resort: a command that failed and said nothing else. "Exit code 1" is
	    // then all there is, and an empty excerpt would be worse — it would make
	    // every silent failure identical to every other kind.
	    const anything = lines.filter(l => l.trim()).slice(-3);
	    const text = (keep.length ? keep : informative.length ? informative : anything).join('\n').trim();
	    return text.length > max ? text.slice(0, max) : text;
	}
	/**
	 * A line that announces a failure without describing it.
	 *
	 * "Exit code 1" is equally true of every failed command. Chosen as the failure
	 * text it discards the only part worth matching on — which is exactly what
	 * happened: a command failed with "No Gemini credentials", an entry stored that
	 * very pattern, and the recall matched nothing because it searched for
	 * "Exit code 1". It also makes unrelated failures fingerprint identically, so
	 * the loop detector sees a repeat that never happened.
	 */
	const GENERIC_FAILURE = /^\s*(?:exit (?:code|status) \d+|command failed(?: with exit code \d+)?[.:]?|traceback \(most recent call last\):|build failed|tests? failed|error[.:]?|FAIL|✗|×)\s*$/i;
	/**
	 * A row of a printed table, which is output ABOUT failures rather than one.
	 *
	 * A benchmark that tests error handling prints rows like
	 * `npm ERR! ERESOLVE unable to resolve dependen | ok | ok` — a deliberately
	 * unrelated fixture beside its pass/fail columns. That is error-shaped text
	 * quoted as data, and offering it verbatim as an error_pattern stores a pattern
	 * that matches the benchmark's own output, so every later run of it reads as the
	 * same failure recurring.
	 *
	 * Two separators is the test. A real message rarely carries two, and the lines
	 * that do — an echoed shell pipeline, a table — are not the error either.
	 */
	const TABLE_ROW = / \| .* \| /;
	function isGenericFailureLine(line) {
	    return GENERIC_FAILURE.test(line) || TABLE_ROW.test(line);
	}
	/** True when a tool result reports a failure. */
	function looksLikeError(output, isError) {
	    if (isError)
	        return true;
	    return output.split(/\r?\n/).slice(0, 400).some(l => ERROR_LINE.test(l));
	}
	/**
	 * Parse a transcript from line `fromLine` onward.
	 *
	 * Subagent (sidechain) turns are skipped: their final answer comes back to the
	 * main agent as a tool result anyway, and their exploration is noise here.
	 */
	function parseTranscript(jsonl, fromLine = 0) {
	    const lines = jsonl.split('\n');
	    // A trailing newline leaves an empty last element; a transcript still being
	    // written may end mid-line. Either way the last element is not a complete
	    // record yet, so it is not consumed — the next read starts there.
	    const complete = lines.length - 1;
	    const events = [];
	    const toolNames = new Map();
	    let sessionId;
	    let cwd;
	    for (let i = Math.max(0, fromLine); i < complete; i++) {
	        const raw = lines[i].trim();
	        if (!raw)
	            continue;
	        let ev;
	        try {
	            ev = JSON.parse(raw);
	        }
	        catch {
	            continue;
	        }
	        if (ev.isSidechain)
	            continue;
	        if (typeof ev.sessionId === 'string')
	            sessionId = ev.sessionId;
	        if (typeof ev.cwd === 'string')
	            cwd = ev.cwd;
	        const message = ev.message;
	        const content = message?.content;
	        if (ev.type === 'user') {
	            if (typeof content === 'string') {
	                const text = cleanPrompt(content);
	                if (text && !text.startsWith('[Request interrupted'))
	                    events.push({ kind: 'prompt', text, line: i });
	                continue;
	            }
	            if (!Array.isArray(content))
	                continue;
	            for (const block of content) {
	                if (block?.type === 'text') {
	                    const text = cleanPrompt(String(block.text ?? ''));
	                    if (text && !text.startsWith('[Request interrupted'))
	                        events.push({ kind: 'prompt', text, line: i });
	                }
	                else if (block?.type === 'tool_result') {
	                    const out = resultText(block.content);
	                    const tool = toolNames.get(String(block.tool_use_id ?? ''));
	                    // Only shell output carries errors worth keeping. A Read of a file that
	                    // happens to contain "Error:" is not a failure.
	                    const fromShell = !tool || SHELL_TOOLS.has(tool.name);
	                    const failed = block.is_error === true;
	                    const reading = !!tool?.command && READ_COMMAND.test(tool.command);
	                    if (fromShell && (reading ? failed : looksLikeError(out, failed))
	                        && !isEchoedOutput(out, tool?.command)) {
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
	            for (const block of content) {
	                if (block?.type === 'text') {
	                    const text = String(block.text ?? '').trim();
	                    if (text)
	                        events.push({ kind: 'say', text, line: i });
	                }
	                else if (block?.type === 'tool_use') {
	                    const name = String(block.name ?? '');
	                    const input = (block.input ?? {});
	                    const id = String(block.id ?? '');
	                    if (SAVE_TOOL.test(name)) {
	                        events.push({ kind: 'save', text: String(input.title ?? input.summary ?? input.reason ?? name).slice(0, 200), line: i });
	                        toolNames.set(id, { name });
	                    }
	                    else if (EDIT_TOOLS.has(name)) {
	                        const file = String(input.file_path ?? input.notebook_path ?? '');
	                        if (file)
	                            events.push({ kind: 'edit', text: file, line: i });
	                        toolNames.set(id, { name });
	                    }
	                    else if (SHELL_TOOLS.has(name)) {
	                        const command = String(input.command ?? '').replace(/\s+/g, ' ').trim();
	                        if (command)
	                            events.push({ kind: SAVE_COMMAND.test(command) ? 'save' : 'command', text: command.slice(0, 200), line: i });
	                        toolNames.set(id, { name, command });
	                    }
	                    else {
	                        toolNames.set(id, { name });
	                    }
	                }
	            }
	        }
	    }
	    return { events, endLine: complete, sessionId, cwd };
	}
	/**
	 * Might this stretch have established something? Deliberately loose.
	 *
	 * "because" is in here and is a catch-all: measured over 52 chunks of real
	 * transcript it is present in 81% of them. That is right for "worth a second
	 * look" and far too loose to carry a short stretch on its own — see
	 * STRONG_DECISION_CUE.
	 */
	const DECISION_CUE = /\b(instead of|rather than|decided|chose|trade-?off|root cause|the cause|turns out|because)\b/i;
	/**
	 * A phrase in which a choice is actually stated, rather than merely explained.
	 *
	 * Required instead of DECISION_CUE when there is little prose. A two-line
	 * message containing "because" is not a decision; one saying "we went with X
	 * rather than Y" is. Measured: swapping this in below SHORT_PROSE changed the
	 * rate not at all at chunk scale (42/52 either way), because real 14k chunks
	 * always carry plenty of prose — it exists for the short stretches the Stop hook
	 * actually sees between asks, which that measurement cannot reach.
	 */
	const STRONG_DECISION_CUE = /\b(instead of|rather than|decided|we chose|chose to|chose the|opted for|opted to|went with|going with|settled on|ruled out|rejected|trade-?off|in favour of|in favor of|on purpose|deliberately)\b/i;
	/**
	 * How much prose a stretch needs before a stated choice counts.
	 *
	 * These were 800 and 2500, which meant a decision stated in one clear sentence
	 * was invisible while a rambling one was caught — backwards, since a crisply
	 * stated decision is easier to record and no less worth keeping. Asked for
	 * explicitly, and measured first: at chunk scale, dropping them to zero moved
	 * the nudge rate only from 71% to 77%, because a 14k chunk nearly always clears
	 * any prose bar. The bar binds on the short segments the hook sees between
	 * asks, which is exactly the case this change is for.
	 *
	 * Below SHORT_PROSE the stronger cue is required, so lowering the bar does not
	 * turn "because" in a two-line message into a nudge.
	 */
	//
	// Set from the sentences they have to admit, not from a round number. "We chose
	// Postgres instead of Mongo for the ledger." is 50 characters; at 200 it was
	// still invisible, which was the whole complaint. Below SHORT_PROSE the strong
	// cue is what provides precision, so the length here only has to be long enough
	// to be a sentence.
	const DECISION_PROSE_MIN = 40; // a stretch that also changed code
	// Higher, because with no edits and no errors nothing but the prose is evidence
	// that anything happened at all.
	const DISCUSSION_PROSE_MIN = 120; // a design call with no edits at all
	const SHORT_PROSE = 800; // the old bar; beneath it, demand the strong cue
	/**
	 * Cheap gate before any model call. Most turns are reading, answering and
	 * small edits; spending an extraction on each would cost money and produce the
	 * noise this system exists to avoid.
	 */
	function assessSegment(events) {
	    let edits = 0, errors = 0, lastEdit = -1, lastError = -1, said = 0;
	    let cue = false;
	    let strongCue = false;
	    events.forEach((e, i) => {
	        if (e.kind === 'edit') {
	            edits++;
	            lastEdit = i;
	        }
	        if (e.kind === 'error') {
	            errors++;
	            lastError = i;
	        }
	        if (e.kind === 'say') {
	            said += e.text.length;
	            if (DECISION_CUE.test(e.text))
	                cue = true;
	            if (STRONG_DECISION_CUE.test(e.text))
	                strongCue = true;
	        }
	    });
	    // Little was said, so the phrasing has to carry more weight.
	    const stated = said < SHORT_PROSE ? strongCue : cue;
	    const debugged = errors > 0 && edits > 0;
	    // `edits >= 1`, not 2. At 2 a stretch that changed one file and broke nothing
	    // cleared neither this nor `discussion`, so a one-file decision could never be
	    // asked about at any prose length — 2 of 52 real chunks sat in that hole, both
	    // carrying a cue. Not a threshold, a gap between two branches.
	    const substantialWork = edits >= 1 && said >= DECISION_PROSE_MIN && stated;
	    const discussion = edits === 0 && said >= DISCUSSION_PROSE_MIN && stated;
	    return {
	        worth: debugged || substantialWork || discussion,
	        unresolved: lastError > lastEdit,
	        edits,
	        errors,
	    };
	}
	const LABEL = {
	    prompt: 'USER', say: 'AGENT', edit: 'EDITED', command: 'RAN', error: 'ERROR', save: 'SAVED',
	};
	const CAP = { prompt: 600, say: 900, edit: 200, command: 200, error: 700, save: 200 };
	function line(e) {
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
	function buildDigest(events, budget = 14000) {
	    const rendered = events.map(e => ({ e, text: line(e), keep: true }));
	    const size = () => rendered.reduce((n, r) => n + (r.keep ? r.text.length + 1 : 0), 0);
	    const lastSays = new Set(rendered.map((r, i) => (r.e.kind === 'say' ? i : -1)).filter(i => i >= 0).slice(-3));
	    for (const kind of ['say', 'command', 'edit', 'prompt']) {
	        for (let i = 0; i < rendered.length && size() > budget; i++) {
	            if (rendered[i].e.kind === kind && !(kind === 'say' && lastSays.has(i)))
	                rendered[i].keep = false;
	        }
	    }
	    // Collapse runs of the same file edited repeatedly into one line.
	    const out = [];
	    for (const r of rendered) {
	        if (!r.keep)
	            continue;
	        if (out.length && out[out.length - 1] === r.text && r.e.kind !== 'say')
	            continue;
	        out.push(r.text);
	    }
	    const text = out.join('\n');
	    return text.length > budget ? text.slice(text.length - budget) : text;
	}
	/**
	 * Split a long session into chunks that each fit the budget, cutting only where
	 * the user spoke, so a problem and its fix are not separated mid-thought.
	 */
	function chunkEvents(events, budget = 14000) {
	    const chunks = [];
	    let current = [];
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
	    if (current.length)
	        chunks.push(current);
	    return chunks;
	}
	
	return transcript;
}

var turnReview = {};

var hasRequiredTurnReview;

function requireTurnReview () {
	if (hasRequiredTurnReview) return turnReview;
	hasRequiredTurnReview = 1;
	(function (exports) {
		// Agent-authored capture: DevBrain notices, the coding agent writes.
		//
		// The agent that did the work already holds the whole session in context — the
		// error, the dead ends, the reason the fix works. It can state that knowledge
		// better than any second model reading the transcript afterwards, and asking it
		// costs no extra AI service: DevBrain needs no model of its own to capture.
		//
		// What agents lacked was a reliable trigger. Instructions to "save when you
		// learn something" are followed unevenly, and every miss is silent. So the
		// trigger is mechanical: after each turn, the harness's Stop hook runs this
		// over the new part of the transcript. When the turn worked something out and
		// the agent recorded nothing, the hook holds the agent for one more step and
		// hands it the evidence, and the agent writes the entry with save_entry.
		//
		// Pure: transcript text in, decision out. No I/O, no model.
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ENTRY_GUIDE = void 0;
		exports.buildRecordPrompt = buildRecordPrompt;
		exports.buildNoErrorHint = buildNoErrorHint;
		exports.buildFixHint = buildFixHint;
		exports.reviewTurn = reviewTurn;
		const transcript_1 = requireTranscript();
		const stuck_1 = devbrainCore1.requireStuck();
		/** Past this, a stretch is judged now rather than accumulated further. */
		const MAX_HELD_EVENTS = 600;
		/**
		 * How far back a loop is looked for, in transcript lines.
		 *
		 * Bounded so a long session does not re-read itself every turn, and short
		 * enough that a loop resolved an hour ago does not keep counting against the
		 * agent now.
		 */
		const STUCK_WINDOW_LINES = 400;
		function recentFrom(jsonl) {
		    return Math.max(0, jsonl.split('\n').length - STUCK_WINDOW_LINES);
		}
		function unique(items) {
		    return [...new Set(items)];
		}
		function shortPath(path) {
		    const parts = path.replace(/\\/g, '/').split('/');
		    return parts.slice(-2).join('/');
		}
		/** The message that asks the agent to record this stretch, built from its evidence. */
		function buildRecordPrompt(events, openBugs = []) {
		    // A generic line is offered to nobody as an error_pattern. "Exit code 1" is
		    // true of every failure, so stored as a pattern it would match all of them —
		    // and the prompt asks for it to be copied verbatim, so offering it is how a
		    // pattern that poisons every future query gets written down.
		    const errors = unique(events.filter(e => e.kind === 'error').map(e => e.text.split('\n')[0].trim()))
		        .filter(line => line && !(0, transcript_1.isGenericFailureLine)(line)).slice(-3);
		    const files = unique(events.filter(e => e.kind === 'edit').map(e => shortPath(e.text))).slice(-6);
		    // The exact string is handed over, not described. DevBrain already has it,
		    // and asking the agent to retype an error it read minutes ago is how entries
		    // ended up without one: on a real project only 3 of 130 carried a pattern,
		    // and an entry without one can never be matched to a future failure.
		    const evidence = [];
		    for (const err of errors)
		        evidence.push(`- error seen — use this verbatim as error_pattern:\n    ${err.length > 200 ? `${err.slice(0, 200)}` : err}`);
		    if (files.length)
		        evidence.push(`- files changed: ${files.join(', ')}`);
		    return [
		        'DevBrain: this stretch of work looks like it established something worth remembering, and nothing was saved for it yet.',
		        ...(evidence.length ? ['', ...evidence] : []),
		        '',
		        'You did the work, so you write the record — DevBrain only stores it. For each distinct, non-obvious item',
		        '(usually one, at most three), call the DevBrain `save_entry` tool',
		        ...exports.ENTRY_GUIDE,
		        ...buildNoErrorHint(events),
		        ...buildFixHint(openBugs),
		        '',
		        'If it was routine (a typo, an obvious change) or DevBrain already has it, save nothing.',
		        'Either way, keep it brief: one short line to the user, then stop.',
		    ].join('\n');
		}
		/**
		 * What to ask for when the stretch contains no error at all.
		 *
		 * The ask itself was fix-shaped. It leads with error lines to copy verbatim and
		 * the files changed, and `ENTRY_GUIDE` opens with "the root cause, then the
		 * exact fix". An agent reading that writes a fix, or writes nothing — and the
		 * type distribution shows it: of 224 entries, 88 are `fix` and 11 are
		 * `decision`.
		 *
		 * It is not that decisions go undetected. Measured over 52 chunks of real
		 * transcript, 20 of the 37 stretches that trigger the ask reach it through the
		 * two decision-shaped paths in `assessSegment` rather than the error-and-edit
		 * one. The trigger fires; the prompt then asks the wrong question.
		 *
		 * Keyed off `errors === 0`, which is a fact about the stretch, not a guess about
		 * its prose. An earlier attempt matched decision vocabulary and quoted the
		 * sentence back — the same trick that made `error_pattern` get filled in. It was
		 * abandoned because it could not be made precise: at chunk scale the loose form
		 * fired on 92% of nudges, and the tightened form still quoted "All eight saved,
		 * none rejected as duplicates" and "the headline number to be skeptical of is
		 * 83% vs 60%" as though they were choices. A hint that quotes the wrong sentence
		 * is worse than none: it teaches the agent the hint is noise, and it invites an
		 * entry about a decision nobody made.
		 */
		function buildNoErrorHint(events) {
		    if (events.some(e => e.kind === 'error'))
		        return [];
		    const edited = events.some(e => e.kind === 'edit');
		    return [
		        '',
		        edited
		            ? 'Nothing failed in this stretch, so there is no root cause to write and no error to quote.'
		            : 'No code changed and nothing failed in this stretch, so there is nothing here to write up as a fix.',
		        'If something is worth keeping it is one of these, and each needs a different thing from you:',
		        '- `decision` — what you chose, **what you turned down, and why**. The rejected option is the',
		        '  part that cannot be recovered later: without it the entry cannot be re-judged when the',
		        '  trade-off changes, and it reads as though nothing else was considered.',
		        '- `lesson` — what looked true and was not, and what is actually true.',
		        '- `pattern` / `anti-pattern` — the shape worth repeating, or the one to stop reaching for.',
		        'Leave `error_pattern` off entirely. There was no error, and a plausible-looking one invented',
		        'here would match every future failure of that shape and identify none of them.',
		        'If the choice was obvious, or forced, or already recorded, save nothing — this is the case',
		        'where saving nothing is the common answer.',
		    ];
		}
		/**
		 * Named when this stretch resolved something already recorded.
		 *
		 * A field nobody is prompted for stays empty — error_pattern sat on 3 of 130
		 * entries for exactly that reason. So the open bugs this session recorded are
		 * put in front of the agent at the moment it is writing the fix.
		 */
		function buildFixHint(openBugs) {
		    if (!openBugs.length)
		        return [];
		    return [
		        '',
		        'You recorded these earlier this session and nothing has closed them yet.',
		        'If this stretch fixed one, pass its id as `fixes` — both entries stay, linked:',
		        ...openBugs.slice(0, 3).map(b => `  ${b.id}  ${b.title.slice(0, 70)}`),
		    ];
		}
		/**
		 * How to write an entry. Shared by every place DevBrain asks an agent to record
		 * something, so the Stop hook and backfill hold entries to the same bar.
		 */
		exports.ENTRY_GUIDE = [
		    '(or, if the tool is not available, `devbrain note "fix: <title> — <cause and fix>" --error "<exact error>"`',
		    ' — the --error flag matters, because without it the CLI stores no pattern at all):',
		    '- type: fix, bug, decision, lesson, anti-pattern, pattern or stack',
		    '- title: the symptom or the decision, searchable, under 90 characters. Not "Fixed X" or "Updated Y".',
		    '- content: the root cause, then the exact fix — or for a decision, what was chosen, what was rejected, and why',
		    '- error_pattern: the exact error text, copied verbatim, whenever there was one. This is the',
		    '  field that lets a future failure find the entry — an entry without one can only be found',
		    '  by someone already searching for it. Copy any error quoted above exactly, character for character.',
		];
		/**
		 * Decide what to do after the agent's turn, given the transcript and the line
		 * up to which it has already been reviewed.
		 */
		function reviewTurn(jsonl, fromLine, opts = {}) {
		    const segment = (0, transcript_1.parseTranscript)(jsonl, fromLine);
		    const { events, endLine } = segment;
		    if (endLine <= fromLine || events.length === 0)
		        return { action: 'hold', cursor: fromLine };
		    // Being stuck is checked first, and before the unresolved-error hold below,
		    // because the two look identical from here: an error outstanding and edits
		    // still coming. Held instead of raised, a loop would be waited out in silence
		    // for exactly as long as it kept failing.
		    //
		    // It reads a window of recent history rather than the unreviewed segment,
		    // because the two answer different questions. The cursor tracks what has been
		    // asked about, and it advances every time the agent is asked to record
		    // something — so a loop spread over three turns would be examined one failure
		    // at a time and never look like repetition at all.
		    const recent = (0, transcript_1.parseTranscript)(jsonl, recentFrom(jsonl)).events;
		    const signals = (0, stuck_1.detectStuck)(recent, { warned: opts.warned });
		    if (signals.length) {
		        // The cursor does not move: this stretch has still established nothing to
		        // record, and once the agent gets unstuck it should be asked to write up
		        // the whole episode, not just the part after the interruption.
		        return {
		            action: 'step-back', cursor: fromLine, prompt: (0, stuck_1.formatStepBack)(signals), signals,
		            suppress: (0, stuck_1.episodeFingerprints)(recent),
		        };
		    }
		    // The agent saved on its own during this stretch. It chose what mattered;
		    // asking again would only produce a duplicate.
		    if (events.some(e => e.kind === 'save'))
		        return { action: 'recorded', cursor: endLine };
		    const assessment = (0, transcript_1.assessSegment)(events);
		    const tooLong = events.length > MAX_HELD_EVENTS;
		    // A fix not made yet cannot be recorded yet. Ask once it lands.
		    if (assessment.unresolved && !tooLong)
		        return { action: 'hold', cursor: fromLine };
		    if (!assessment.worth) {
		        // Hold quiet stretches so a question now is judged with the bug it leads
		        // to later — but not forever, or an old stretch would be re-read each turn.
		        return tooLong ? { action: 'hold', cursor: endLine } : { action: 'hold', cursor: fromLine };
		    }
		    return { action: 'ask', cursor: endLine, prompt: buildRecordPrompt(events), events };
		}
		
	} (turnReview));
	return turnReview;
}

exports.requireTranscript = requireTranscript;
exports.requireTurnReview = requireTurnReview;
exports.requireTypes = requireTypes;
