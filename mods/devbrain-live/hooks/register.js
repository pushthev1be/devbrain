// devbrain-live — what memory did this session actually move?
//
// DevBrain's hooks are deliberately quiet: the briefing goes into the agent's
// context, the save prompt goes to the agent, the recall after a failing
// command goes to the agent. None of it is addressed to the person watching, so
// from the outside a session looks identical whether memory is working or doing
// nothing at all. That is how it went write-only for two days without anyone
// noticing.
//
// This mod is the dial on the outside of the box. It counts what it can see
// from tool calls, reads the recall count DevBrain records for the session, and
// pins one line under the prompt:
//
//   DevBrain · 2 saved · 1 already known · 1 recalled
//
// It watches, and changes nothing: every hook passes its event straight on.

/** A save through the MCP tool, under any server prefix, or through the CLI. */
const SAVE_TOOL = /(?:^|__)save_entry$/;
const SAVE_COMMAND = /\bdevbrain\s+note\b/;

/** Titles saved this session, newest last. */
let saved = [];
/** Saves DevBrain rejected as near-duplicates — memory working, not failing. */
let known = 0;
/** Past fixes DevBrain volunteered after a failing command. */
let recalled = 0;

/** True when this tool call is an attempt to record knowledge. */
function isSaveCall(e) {
  const tool = typeof e.tool === 'string' ? e.tool : '';
  if (SAVE_TOOL.test(tool)) return true;
  return typeof e.command === 'string' && SAVE_COMMAND.test(e.command);
}

/**
 * The entry's title, from the MCP argument or from the quoted text of a
 * `devbrain note` command, with its type prefix and detail trimmed off — the
 * same "<title> — <detail>" shape the CLI splits on.
 */
function savedTitle(e) {
  if (typeof e.title === 'string' && e.title.trim()) return e.title.trim();
  const command = typeof e.command === 'string' ? e.command : '';
  const quoted = command.match(/devbrain\s+note\s+["']([\s\S]+?)["']\s*$/);
  const body = (quoted ? quoted[1] : '').replace(/^\s*[a-z-]+:\s*/i, '');
  const dash = body.search(/\s[—–]\s|\s--\s/);
  return (dash > 10 ? body.slice(0, dash) : body).trim() || 'untitled';
}

/** Whatever came back, as text we can look for a phrase in. */
function resultText(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? '');
  } catch {
    return '';
  }
}

/**
 * The one line under the prompt.
 *
 * It says something even at rest. A counter that is blank until the first save
 * is indistinguishable from a mod that failed to load, which defeats the point
 * of having a dial at all.
 */
function statusText() {
  const parts = [];
  if (saved.length > 0) parts.push(saved.length + ' saved');
  if (known > 0) parts.push(known + ' already known');
  if (recalled > 0) parts.push(recalled + ' recalled');
  return 'DevBrain · ' + (parts.length > 0 ? parts.join(' · ') : 'watching');
}

/**
 * How many past fixes DevBrain has volunteered this session.
 *
 * DevBrain's PostToolUse hook records every entry it surfaces in the session's
 * own state file, so the count is read from there rather than guessed at. Any
 * failure leaves the number out of the line instead of breaking it.
 */
async function readRecalled($) {
  try {
    const home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME'));
    if (!home) return 0;
    const id = await $.session.id();
    const text = await $.fs.read(home + '/.devbrain/sessions/' + id + '.json');
    const state = JSON.parse(typeof text === 'string' ? text : String(text));
    return Array.isArray(state.surfaced) ? state.surfaced.length : 0;
  } catch {
    return 0;
  }
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'devbrain-session',
      description: 'What DevBrain recorded and recalled this session',
    });
    recalled = await readRecalled($);
    $.ui.status(statusText());
    return next(e);
  });

  // Watch every tool call for an attempt to record knowledge. The call itself
  // is passed straight through — this mod never changes what Claude does.
  on('tool.call', async ($, e, next) => {
    if (!isSaveCall(e)) return next(e);

    const title = savedTitle(e);
    const result = await next(e);

    // A rejected near-duplicate is memory working. Counted apart, so the line
    // does not read as a failure and does not inflate the saved count.
    if (/already known/i.test(resultText(result))) {
      known += 1;
    } else {
      saved = [...saved, title];
      $.ui.toast('DevBrain saved: ' + title);
    }
    $.ui.status(statusText());
    return result;
  });

  // Recall happens inside DevBrain's own hook, which this mod cannot observe
  // directly, so the count is refreshed when the turn settles.
  on('turn.complete', async ($, e, next) => {
    recalled = await readRecalled($);
    $.ui.status(statusText());
    return next(e);
  });

  on('command.run', { command: 'devbrain-session' }, async () => {
    if (saved.length === 0 && known === 0 && recalled === 0) {
      return { text: 'Nothing recorded or recalled yet this session.' };
    }
    const lines = saved.map((title, i) => '  ' + (i + 1) + '. ' + title);
    return {
      text: [
        'Saved this session: ' + saved.length,
        ...lines,
        known > 0 ? 'Already known, not duplicated: ' + known : '',
        recalled > 0 ? 'Past fixes recalled after a failing command: ' + recalled : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  });
}
