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

  // Anthropic's plugin directory stops validating a repository outright when any
  // file in the plugin folder exceeds 5 MiB — the report reads "Repository too
  // large to validate", with no findings to work from. mcp.js was 14.54 MB,
  // almost all of it @google/adk's dependency tree, so the plugin could not be
  // submitted at all. This is the guard that keeps it submittable: re-adding a
  // heavy dependency fails here instead of in the portal.
  it.each(BUNDLES)('%s stays under the 5 MiB the plugin directory allows', file => {
    const mb = statSync(join(DIST, file)).size / 1024 / 1024;
    expect(mb, `${file} is ${mb.toFixed(2)} MB — the directory refuses any plugin file over 5 MiB`)
      .toBeLessThan(5);
  });

  // Replaces a guard that asserted the opposite. It checked that gcp-metadata
  // was inlined, because marking it external once broke embeddings silently —
  // every getEmbedding call site catches, so the damage showed up as "found
  // nothing" rather than as an error. The plugin build now omits Gemini on
  // purpose, so the old assertion was inverted by that decision, not made
  // irrelevant by it: the same silent-failure risk is why the omission has to be
  // verifiable rather than assumed.
  it.each(BUNDLES)('%s really does leave the Gemini client out', file => {
    const code = readFileSync(join(DIST, file), 'utf-8');
    // A string from inside gcp-metadata, which google-auth-library requires
    // unconditionally and @google/genai reaches through. Present means the whole
    // Gemini tree came back, and with it the file size that blocks submission.
    expect(code, 'the Gemini client is bundled again — check the stub in scripts/bundle.mjs')
      .not.toContain('metadata.google.internal');
  });

  // The omission must announce itself. isNoAiBuild() short-circuits every path
  // above these stubs, so they should be unreachable — but if one is ever missed,
  // the failure has to name the cause instead of surfacing as MODULE_NOT_FOUND
  // inside a catch.
  it.each(BUNDLES)('%s carries a stub that explains itself if it is ever reached', file => {
    const code = readFileSync(join(DIST, file), 'utf-8');
    expect(code).toContain('DevBrain was built without');
  });

  // The flag the short-circuits read, compiled in by esbuild's define. If this
  // is false the stubs become reachable, and the first symptom would be the
  // silent "found nothing" the test above exists to prevent.
  it.each(BUNDLES)('%s compiles isNoAiBuild to true', file => {
    const code = readFileSync(join(DIST, file), 'utf-8');
    expect(code).toMatch(/function isNoAiBuild\d*\(\)\s*\{\s*return true;/);
  });
});
