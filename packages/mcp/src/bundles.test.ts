/**
 * The committed plugin bundles must not be older than the source they came from.
 *
 * `plugin/dist/cli.js` and `plugin/dist/mcp.js` are in git because installing a
 * Claude Code plugin copies the plugin root and runs neither `npm install` nor
 * `tsc` — whatever the hooks and `plugin.json` point at has to be runnable as it
 * stands. They sit under `plugin/` rather than at the repo root because a plugin
 * root holding a `package.json` makes Claude Code install its Node
 * dependencies, which for this workspace means recreating the `packages/*`
 * symlinks and failing on Windows with `EPERM: operation not permitted,
 * symlink`. That
 * makes them the one kind of artifact that can silently ship last week's code:
 * everything builds, every test passes, and the plugin runs something nobody
 * wrote today.
 *
 * So the same rule the generated icons and logo follow applies here: edit the
 * source, forget `npm run bundle`, and this fails by name with the command.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const REPO = join(__dirname, '..', '..', '..');
const DIST = join(REPO, 'plugin', 'dist');
const BUNDLES = ['cli.js', 'mcp.js'];

/** Newest mtime among the TypeScript sources the bundles are built from. */
function newestSource(): { path: string; mtime: number } {
  let newest = { path: '', mtime: 0 };
  for (const pkg of ['core', 'cli', 'mcp']) {
    const dir = join(REPO, 'packages', pkg, 'src');
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      // Tests are not bundled, so a test-only edit is not a stale bundle.
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
      const path = join(dir, name);
      const mtime = statSync(path).mtimeMs;
      if (mtime > newest.mtime) newest = { path: join(pkg, 'src', name), mtime };
    }
  }
  return newest;
}

describe('the committed plugin bundles', () => {
  it.each(BUNDLES)('%s exists', file => {
    expect(existsSync(join(DIST, file)), `missing — run \`npm run bundle\``).toBe(true);
  });

  it('are not older than the newest source file', () => {
    const built = JSON.parse(readFileSync(join(DIST, 'BUILD'), 'utf-8')).builtAt as number;
    const source = newestSource();
    expect(
      built,
      `${source.path} is newer than the bundles — run \`npm run bundle\``,
    ).toBeGreaterThanOrEqual(source.mtime);
  });

  // A shebang is only a shebang on line one. Adding a banner put a second one
  // on line two, where node read it as code and the bundle would not start at
  // all — caught by running it, which no unit test had been doing.
  it('starts with exactly one shebang, on the first line', () => {
    for (const file of BUNDLES) {
      const lines = readFileSync(join(DIST, file), 'utf-8').split('\n', 3);
      expect(lines[0].startsWith('#!'), `${file} line 1`).toBe(true);
      expect(lines[1]?.startsWith('#!'), `${file} line 2 is a second shebang`).toBe(false);
    }
  });

  // Marking a dependency external that the code requires unconditionally breaks
  // it at runtime, and every getEmbedding call site catches, so the damage shows
  // up as "found nothing" rather than as an error. gcp-metadata did exactly
  // that: google-auth-library requires it for Application Default Credentials.
  it.each(BUNDLES)('%s inlines the credential helpers the Gemini client needs', file => {
    // Checked by a string from inside gcp-metadata rather than by its name:
    // the name appears either way, so it cannot tell "bundled" from "left
    // external and about to fail at runtime".
    const code = readFileSync(join(DIST, file), 'utf-8');
    expect(code, 'gcp-metadata is not inlined — is it in the external list?')
      .toContain('metadata.google.internal');
  });
});
