/**
 * Bundle the CLI and the MCP server into one file each, for the plugin.
 *
 *   npm run bundle
 *
 * Installing a Claude Code plugin copies the plugin root and runs neither `npm
 * install` nor `tsc`, so whatever the hooks and `plugin.json` point at has to be
 * runnable as it stands in git. These two files are therefore committed, which
 * is why `.gitignore` un-ignores exactly them and nothing else under
 * `plugin/dist/`.
 *
 * They go to `plugin/dist/`, not `dist/`, because the plugin root cannot be the
 * repo root: a plugin root with a `package.json` makes Claude Code install its
 * Node dependencies, and for this workspace root that means recreating the
 * `packages/*` symlinks, which fails on Windows with `EPERM: operation not
 * permitted, symlink`. Confirmed both ways — installing from the repo root
 * failed, and installing the same files from a staged directory with no
 * `package.json` succeeded.
 *
 * `bundles.test.ts` fails when they are older than the source they came from,
 * so a forgotten `npm run bundle` cannot ship stale code — the same rule the
 * generated icons and logo follow.
 */

import { build } from 'esbuild';
import { mkdirSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Optional dependencies the Mongo driver probes for at runtime.
 *
 * Each is wrapped in a try/catch there — compression, Kerberos, cloud
 * credential helpers — so leaving them unresolved is exactly how the driver
 * expects to find them absent. Bundling them would pull native modules into a
 * file that has to run on a machine that never compiled anything.
 */
const OPTIONAL = [
  'kerberos', '@mongodb-js/zstd', 'snappy', 'socks', 'aws4', 'mongodb-client-encryption',
  '@aws-sdk/credential-providers', 'bson-ext',
  // ws's optional speedups.
  'bufferutil', 'utf-8-validate',
];

// Not in the list, deliberately: gcp-metadata. It reads like one more cloud
// credential helper, and marking it external broke embeddings outright —
// google-auth-library requires it unconditionally, and @google/genai goes
// through that for Application Default Credentials. The damage was invisible
// because every getEmbedding call site catches: the hook simply stopped
// finding anything by meaning and fell back to literal matching. Only a probe
// that printed the rejection showed "Cannot find module 'gcp-metadata'".
//
// So: a module belongs here only when the code that requires it already
// handles its absence. Guessing from the name is how a code path goes quiet.

/**
 * On V8's compile cache, and why it is not wired in here.
 *
 * Parsing the bundle is most of the cost on the cheap path — a Read, a command
 * that succeeded — and caching the compiled form does help: measured 240ms down
 * to ~195ms with NODE_COMPILE_CACHE set in the environment.
 *
 * But only from the environment. Calling module.enableCompileCache() inside the
 * bundle cannot cache the bundle: that file is already being compiled when the
 * call runs, and a single-file bundle requires nothing afterwards for the cache
 * to apply to. Injecting the call made no measurable difference, which is how
 * this was found.
 *
 * Claude Code hook commands inherit the environment but cannot set it, so there
 * is nowhere to put NODE_COMPILE_CACHE for the plugin path. Left alone rather
 * than left in as a line that looks like an optimisation and is not.
 */

const targets = [
  { name: 'cli', entry: 'packages/cli/src/index.ts' },
  { name: 'mcp', entry: 'packages/mcp/src/index.ts' },
];

const outDir = join(root, 'plugin', 'dist');
mkdirSync(outDir, { recursive: true });

for (const { name, entry } of targets) {
  const outfile = join(outDir, `${name}.js`);
  const result = await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: OPTIONAL,
    // Kept readable on purpose: this file is committed, so a reviewer should be
    // able to see what changed, and minifying would make every diff opaque.
    minify: false,
    sourcemap: false,
    logLevel: 'warning',
    // No banner: packages/cli/src/index.ts already opens with a shebang and
    // esbuild preserves it. Adding one produced two, and node read the second
    // as code — the bundle would not start at all.
    metafile: true,
  });

  const bytes = statSync(outfile).size;
  const inputs = Object.keys(result.metafile.inputs).length;
  console.log(`plugin/dist/${name}.js  ${(bytes / 1024 / 1024).toFixed(2)} MB from ${inputs} files`);
}

// A stamp the test compares against the newest source file, so "the bundles are
// stale" is a failing test rather than something noticed in production.
writeFileSync(
  join(outDir, 'BUILD'),
  JSON.stringify({ builtAt: Date.now() }, null, 2) + '\n',
);
console.log('plugin/dist/BUILD stamped');
