/**
 * Tests for detectStack.
 *
 * The case that mattered and was missing: a repo whose root holds only
 * documentation and two folders. That is the normal shape of anything with an
 * app and a server in it, and reading the root alone reported no stack at all
 * for three of five real projects — which showed up as a project with no marks
 * beside it and nothing to say why.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectStack, ALL_STACK_LABELS } from './stack';

let root: string;

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'devbrain-stack-')); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

function write(rel: string, body = '{}') {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body);
}

const pkg = (deps: Record<string, string>) => JSON.stringify({ dependencies: deps });

describe('detectStack', () => {
  it('reads the root, as it always did', () => {
    write('package.json', pkg({ react: '19', typescript: '5' }));
    expect(detectStack(root)).toEqual(expect.arrayContaining(['Node.js', 'React', 'TypeScript']));
  });

  // The whole reason for the change.
  it('finds both halves of an app-and-server repo with nothing at its root', () => {
    write('backend/package.json', pkg({ express: '4', mongoose: '8' }));
    write('mobile/pubspec.yaml', 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n');
    const stack = detectStack(root);
    expect(stack).toEqual(expect.arrayContaining(['Node.js', 'Express', 'MongoDB/Mongoose', 'Dart', 'Flutter']));
  });

  it('reports a Dart package without Flutter as Dart alone', () => {
    write('pubspec.yaml', 'name: cli_tool\ndependencies:\n  args: ^2.0.0\n');
    const stack = detectStack(root);
    expect(stack).toContain('Dart');
    expect(stack).not.toContain('Flutter');
  });

  // Vendored code would otherwise report the stack of every dependency.
  it('does not descend into node_modules or build output', () => {
    write('node_modules/svelte/package.json', pkg({ svelte: '5' }));
    write('dist/package.json', pkg({ vue: '3' }));
    const stack = detectStack(root);
    expect(stack).not.toContain('Svelte');
    expect(stack).not.toContain('Vue');
  });

  // One level, deliberately. Deeper starts reading examples and fixtures.
  it('stops at one level down', () => {
    write('apps/web/deep/package.json', pkg({ angular: '18' }));
    expect(detectStack(root)).not.toContain('Angular');
  });

  it('reports each label once however many folders carry it', () => {
    write('api/package.json', pkg({ express: '4' }));
    write('worker/package.json', pkg({ express: '4' }));
    const stack = detectStack(root);
    expect(stack.filter(s => s === 'Express')).toHaveLength(1);
    expect(stack.filter(s => s === 'Node.js')).toHaveLength(1);
  });

  it('returns nothing for an empty directory rather than throwing', () => {
    expect(detectStack(root)).toEqual([]);
  });

  it('survives an unreadable path', () => {
    expect(() => detectStack(join(root, 'does-not-exist'))).not.toThrow();
  });

  it('only ever reports labels that are in ALL_STACK_LABELS', () => {
    write('package.json', pkg({ react: '19', express: '4', prisma: '5', vite: '5' }));
    write('mobile/pubspec.yaml', 'dependencies:\n  flutter:\n');
    for (const label of detectStack(root)) {
      expect(ALL_STACK_LABELS, label).toContain(label);
    }
  });
});
