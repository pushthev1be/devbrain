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

// The rule this list follows, and the mistake that produced it: gcp-metadata
// once looked like one more cloud credential helper and was marked external.
// That broke embeddings outright — google-auth-library requires it
// unconditionally, and @google/genai reaches it for Application Default
// Credentials. The damage was invisible because every getEmbedding call site
// catches: recall simply stopped finding anything by meaning and fell back to
// literal matching. Only a probe that printed the rejection showed
// "Cannot find module 'gcp-metadata'".
//
// So a module belongs in this list only when the code requiring it already
// handles its absence. Guessing from the name is how a code path goes quiet.
//
// Gemini is now omitted from this build altogether — see OMITTED_FROM_PLUGIN,
// which stubs it rather than externalising it for exactly the reason above. The
// rule still governs this list, which is only the Mongo driver's optional
// probes, each already wrapped in a try/catch where it is required.

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

/**
 * Packages the plugin build leaves out, and why it has to.
 *
 * Anthropic's plugin directory stops validating a repository outright if any
 * file in the plugin folder is over 5 MiB — the report is "Repository too large
 * to validate", with no findings. Measured on this bundle:
 *
 *   as shipped with both           14.54 MB   over
 *   without @google/adk             3.91 MB   under
 *   without both                    2.35 MB   under
 *
 * @google/adk is 0.34 MB of itself and brings @mikro-orm/core,
 * @google-cloud/storage, @grpc/grpc-js, protobufjs and esprima with it. It backs
 * only the HTTP POST /agent route, which no plugin component calls.
 *
 * Stubbed rather than marked `external`. External leaves a real
 * `require('@google/genai')` in the output, which throws MODULE_NOT_FOUND at
 * runtime — and every getEmbedding call site catches, so the whole semantic path
 * would go quiet with nothing to show why. That exact mistake was made once
 * already with gcp-metadata. A stub cannot be reached at all, because
 * isNoAiBuild() short-circuits every path above it; it exists so that if one is
 * ever missed the message says what happened.
 */
const OMITTED_FROM_PLUGIN = [
  // The HTTP POST /agent route. 0.34 MB of itself, and it brings
  // @mikro-orm/core, @google-cloud/storage, @grpc/grpc-js, protobufjs and
  // esprima with it. Stubbed at `./agent` rather than at `@google/adk`, so
  // agent.ts is not bundled either and nothing is left importing named bindings
  // from a stub -- doing it the other way round built fine but printed three
  // "will always be undefined" warnings on every run, which is how a real
  // warning gets missed.
  { filter: '^[.]/agent$', why: 'the ADK agent route' },
  // Embeddings, archetypes and context synthesis. Reached only through a
  // runtime require inside loadGenAI(), so no static import refers to it.
  { filter: '^@google/genai($|/)', why: 'Gemini' },
];

/**
 * Replace the omitted modules with one that explains itself.
 *
 * Stubbed rather than marked `external`. External leaves a real require in the
 * output, which throws MODULE_NOT_FOUND at run time -- and every getEmbedding
 * call site catches, so the semantic path would go silent with nothing to say
 * why. That exact mistake was made once already with gcp-metadata, and it cost
 * a session to find. A stub is unreachable anyway, because isNoAiBuild()
 * short-circuits every path above it; it is here so that if a path is ever
 * missed, the message names what happened.
 */
const stubOmitted = {
  name: 'stub-omitted',
  setup(build) {
    for (const { filter, why } of OMITTED_FROM_PLUGIN) {
      // A character class instead of an escape: a backslash in a generated
      // string is one more thing to get wrong.
      build.onResolve({ filter: new RegExp(filter) }, args => ({
        path: args.path, namespace: 'omitted', pluginData: { why },
      }));
    }
    build.onLoad({ filter: /.*/, namespace: 'omitted' }, args => ({
      contents: `throw new Error(${JSON.stringify(
        `DevBrain was built without ${args.pluginData.why}, so the plugin stays under ` +
        `the 5 MiB per-file limit Anthropic's plugin directory enforces. Matching on ` +
        `wording and on exact error text still works. Install the devbrain CLI for ` +
        `the full build.`,
      )});`,
      loader: 'js',
    }));
  },
};

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
    plugins: [stubOmitted],
    // Read by isNoAiBuild() in core. Set here rather than at run time because it
    // is a property of the artifact, not of the machine running it.
    define: { 'process.env.DEVBRAIN_NO_AI': '"1"' },
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
