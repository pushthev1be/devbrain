import { expect, test } from 'claude-code/testing';

/**
 * The mod has one job: say truthfully what memory did this session. A counter
 * that inflates itself is worse than no counter, so these check that a rejected
 * duplicate is not counted as a save, and that a save through either surface is.
 */

test('counts a save made through the MCP tool', async ($, on) => {
  on('tool.call', () => ({ result: 'DevBrain: Saved new fix: Atlas login fails on @ in password' }));

  await $.tool.call({
    tool: 'mcp__devbrain__save_entry',
    type: 'fix',
    title: 'Atlas login fails when the password contains @',
    content: 'URL-encode it.',
  });

  const answer = await $.command.run({ command: 'devbrain-session', args: '' });
  expect(answer.text).toContain('Saved this session: 1');
  expect(answer.text).toContain('Atlas login fails when the password contains @');
});

test('counts a save made through the CLI, and takes the title from the note', async ($, on) => {
  on('tool.call', () => ({ result: 'Saved  [fix]' }));

  await $.tool.call({
    tool: 'Bash',
    command: 'devbrain note "fix: Port 8080 held by a stale dev server — kill it with npx kill-port"',
  });

  const answer = await $.command.run({ command: 'devbrain-session', args: '' });
  expect(answer.text).toContain('Saved this session: 1');
  expect(answer.text).toContain('Port 8080 held by a stale dev server');
  // The detail after the dash belongs in the entry, not in a one-line counter.
  expect(answer.text).not.toContain('kill-port');
});

test('a rejected duplicate is reported as already known, not as a save', async ($, on) => {
  on('tool.call', () => ({
    result: 'DevBrain: already known — this matches an existing entry, so nothing was added.',
  }));

  await $.tool.call({ tool: 'mcp__devbrain__save_entry', type: 'fix', title: 'Something already stored', content: 'x' });

  const answer = await $.command.run({ command: 'devbrain-session', args: '' });
  expect(answer.text).toContain('Already known, not duplicated: 1');
  expect(answer.text).not.toContain('Saved this session: 1');
});

test('ignores tool calls that are not saves', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }));

  await $.tool.call({ tool: 'Bash', command: 'npm test' });
  await $.tool.call({ tool: 'Read', file_path: 'README.md' });

  const answer = await $.command.run({ command: 'devbrain-session', args: '' });
  expect(answer.text).toBe('Nothing recorded or recalled yet this session.');
});

test('does not interfere with the tool call it is watching', async ($, on) => {
  on('tool.call', () => ({ result: 'DevBrain: Saved new fix: x' }));

  const result = await $.tool.call({
    tool: 'mcp__devbrain__save_entry', type: 'fix', title: 'x', content: 'y',
  });

  expect(result.result).toBe('DevBrain: Saved new fix: x');
});
