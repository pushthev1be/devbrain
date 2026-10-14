/**
 * The committed plugin bundles must not be older than the source they came from.
 *
 * `plugin/dist/cli.js`, `plugin/dist/mcp.js` and the chunks they share under
 * `plugin/dist/lib/` are in git because installing a
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
import { POST_TOOL_MATCHER } from '@devbrain/core';

const REPO = join(__dirname, '..', '..', '..');
const DIST = join(REPO, 'plugin', 'dist');
const BUNDLES = ['cli.js', 'mcp.js'];

/** Every file the build wrote: the two entries and the chunks they share. */
function builtFiles(): string[] {
  const lib = join(DIST, 'lib');
  const chunks = existsSync(lib) ? readdirSync(lib).map(name => join('lib', name)) : [];
  return [...BUNDLES, ...chunks];
}

/** All the bundled code, since what an entry runs may sit in any chunk. */
function allCode(): string {
  return builtFiles().map(file => readFileSync(join(DIST, file), 'utf-8')).join('\n');
}

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

  // Anthropic's plugin directory holds a version for a reviewer when any file
  // in the plugin folder that is not an image or a font is 256 KiB or more,
  // reporting it as one it "couldn't inspect" -- bundled code included. One
  // file per entry was 1.8 and 2.5 MB; the build now splits the code into
  // chunks, and this keeps a heavy dependency from quietly undoing that.
  it('keeps every built file under the 256 KiB the plugin directory inspects', () => {
    for (const file of builtFiles()) {
      const kib = statSync(join(DIST, file)).size / 1024;
      expect(kib, `${file} is ${kib.toFixed(0)} KiB -- the directory holds any file of 256 KiB or more`)
        .toBeLessThan(256);
    }
  });

  // The security scan holds code it cannot read. The Mongo driver brought two
  // such payloads, which scripts/bundle.mjs replaces with readable source.
  it('ships no WebAssembly and no packed payloads', () => {
    for (const file of builtFiles()) {
      const code = readFileSync(join(DIST, file), 'utf-8');
      expect(code, `${file} instantiates WebAssembly`)
        .not.toMatch(/WebAssembly\.(Module|Instance|compile|instantiate)\(/);
      expect(code, `${file} carries a long base64 run`).not.toMatch(/[A-Za-z0-9+/]{1000,}/);
    }
  });

  // Anthropic's plugin directory holds a plugin that reads a credential from
  // the user's machine instead of taking it as a userConfig value. The plugin
  // build therefore loads no .env file, leaves out the setup wizard that checks
  // for Gemini keys, and takes MONGODB_URI from its own settings alone.
  it('reads no credential from the machine', () => {
    const code = allCode();
    expect(code, 'a .env loader is bundled').not.toMatch(/dotenv/);
    expect(code, 'the setup wizard is bundled').not.toMatch(/function writeEnvVars/);
    expect(code, 'a Gemini or Google key is read'
    ).not.toMatch(/process\.env\.(GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_CLOUD_PROJECT)/);
    for (const file of BUNDLES) {
      const entry = readFileSync(join(DIST, file), 'utf-8');
      expect(entry, `${file} loads ~/.devbrain/.env`).not.toMatch(/loadGlobalEnv\(\)/);
      expect(entry, `${file} does not take the plugin's settings`).toMatch(/usePluginSettings\(\)/);
    }
  });

  // Reading a key in one place and running curl in another is held as a
  // credential leaving the machine in two steps, even when curl only asks
  // localhost whether the dashboard is up. The server answers that itself.
  it('runs no curl from a plugin command', () => {
    const dir = join(REPO, 'plugin', 'commands');
    for (const name of readdirSync(dir)) {
      expect(readFileSync(join(dir, name), 'utf-8'), name).not.toMatch(/\bcurl\b/);
    }
  });

  // The plugin's hooks are written by hand, not by withDevbrainHooks, so the
  // matcher that keeps Claude Code from starting node for every Read and Edit
  // is checked against the one the hook's own filter is built from.
  it('hooks.json skips exactly the tools the post-tool hook drops', () => {
    const hooks = JSON.parse(readFileSync(join(REPO, 'plugin', 'hooks', 'hooks.json'), 'utf-8')).hooks;
    for (const event of ['PostToolUse', 'PostToolUseFailure']) {
      expect(hooks[event].map((g: { matcher: string }) => g.matcher), event).toEqual([POST_TOOL_MATCHER]);
    }
  });

  // Replaces a guard that asserted the opposite. It checked that gcp-metadata
  // was inlined, because marking it external once broke embeddings silently —
  // every getEmbedding call site catches, so the damage showed up as "found
  // nothing" rather than as an error. The plugin build now omits Gemini on
  // purpose, so the old assertion was inverted by that decision, not made
  // irrelevant by it: the same silent-failure risk is why the omission has to be
  // verifiable rather than assumed.
  it('really does leave the Gemini client out', () => {
    const code = allCode();
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
  it('carries a stub that explains itself if it is ever reached', () => {
    const code = allCode();
    expect(code).toContain('DevBrain was built without');
  });

  // The flag the short-circuits read, compiled in by the build's replace step. If this
  // is false the stubs become reachable, and the first symptom would be the
  // silent "found nothing" the test above exists to prevent.
  it('compiles isNoAiBuild to true', () => {
    const code = allCode();
    // Rollup leaves the replaced value as a comparison rather than folding it.
    expect(code).toMatch(/function isNoAiBuild\d*\(\)\s*\{\s*return (true|"1" === '1');/);
  });
});
