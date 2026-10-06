/**
 * Tests for toolOutputText — reading what a tool produced from a hook event.
 *
 * The hook once read only `tool_output`, which Claude Code never sends, so it
 * saw empty output after every command and never recalled anything.
 */

import { describe, it, expect } from 'vitest';
import { toolOutputText } from './index';

const ERR = 'SyntaxError: Bad control character in string literal in JSON at position 20';

describe('toolOutputText', () => {
  it('reads stdout and stderr from a PostToolUse tool_response', () => {
    const text = toolOutputText({ tool_response: { stdout: 'building', stderr: ERR, interrupted: false } });
    expect(text).toContain('building');
    expect(text).toContain(ERR);
  });

  it('reads the error from a PostToolUseFailure event', () => {
    expect(toolOutputText({ hook_event_name: 'PostToolUseFailure', error: `Exit code 1\n${ERR}` })).toContain(ERR);
  });

  it('still reads tool_output for harnesses that send it', () => {
    expect(toolOutputText({ tool_output: ERR })).toBe(ERR);
  });

  it('serialises a non-shell response such as MCP content blocks', () => {
    expect(toolOutputText({ tool_response: [{ type: 'text', text: ERR }] })).toContain('Bad control character');
  });

  it('is empty when the event carries no output', () => {
    expect(toolOutputText({})).toBe('');
  });
});
