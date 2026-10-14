/**
 * Bundle the CLI and the MCP server for the plugin: one entry file each, plus
 * the chunks under `lib/` that they share, every file under 256 KiB.
 *
 *   npm run bundle
 *
 * Installing a Claude Code plugin copies the plugin root and runs neither `npm
 * install` nor `tsc`, so whatever the hooks and `plugin.json` point at has to be
 * runnable as it stands in git. These files are therefore committed, which is
 * why `.gitignore` un-ignores exactly them and nothing else under
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

import { transform } from 'esbuild';
import { rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { builtinModules } from 'module';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative, sep } from 'path';

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
  // The interactive terminal UI -- onboarding wizard and REPL. Required lazily
  // and only on a TTY, which no hook or command reaches. With rxjs it was most
  // of what made cli.js larger than mcp.js, and the directory's scan held
  // cli.js as a file it could not inspect while passing the smaller mcp.js.
  { filter: '^inquirer(-autocomplete-prompt)?$', why: 'the interactive terminal UI' },
  // The setup wizard, and with it every read of a Gemini or Google credential
  // the CLI makes. The plugin takes its settings from Claude Code, and the
  // directory holds a plugin whose code reads credentials from the machine.
  { filter: '^[.]/onboarding$', why: 'the setup wizard' },
  // The file opener and `devbrain run`'s shell. No plugin component starts
  // either, and the directory holds code that starts a program from a path or a
  // command put together at run time.
  { filter: '^[.]/launch$', why: 'the file opener and devbrain run' },
  // Reading and writing Claude Code's settings files to install hooks. The
  // plugin brings its own, and the directory holds code that reads
  // ~/.claude/settings.json and writes commands into it.
  { filter: '^[.]/agentSettings$', why: 'hook installation into Claude Code settings' },
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
  resolveId(source) {
    const hit = OMITTED_FROM_PLUGIN.find(({ filter }) => new RegExp(filter).test(source));
    // A plain path, not a \0 virtual id: the commonjs plugin skips those, and
    // its wrapping is what keeps the stub from running at load (see below).
    return hit ? join(root, 'omitted', `${hit.why.replace(/\W+/g, '-')}.cjs`) : null;
  },
  load(id) {
    const hit = OMITTED_FROM_PLUGIN.find(({ why }) =>
      id === join(root, 'omitted', `${why.replace(/\W+/g, '-')}.cjs`));
    if (!hit) return null;
    const why = hit.why;
    // CommonJS, so the commonjs plugin defers it to the require() that asks for
    // it -- every omitted module is required lazily. As an ES module Rollup
    // would hoist it and it would throw while the bundle is still loading.
    return `module.exports = {};\nthrow new Error(${JSON.stringify(
      `DevBrain was built without ${why}, so the plugin stays inside the file ` +
      `limits Anthropic's plugin directory enforces. Matching on wording and on ` +
      `exact error text still works. Install the devbrain CLI for the full build.`,
    )});`;
  },
};

/**
 * Keep every byte of the bundle readable source.
 *
 * The plugin directory's security scan holds any file it cannot read -- a
 * native binary, WebAssembly, a packed payload -- for manual review, and the
 * Mongo driver brings in two:
 *
 *   bson               a 64-bit multiply/divide helper as an inline WebAssembly
 *                      module. bson wraps it in a try/catch and falls back to
 *                      its own JavaScript Long arithmetic, so it goes to
 *                      `undefined` and that fallback runs instead.
 *   @mongodb-js/saslprep  its Unicode tables as gzipped base64. The package
 *                      ships the same tables as plain Sets in code-points-src,
 *                      so its entry point is rebuilt on those.
 *
 * Each replacement fails the build when its pattern is no longer found, so an
 * upgrade that moves the payload cannot slip one back in unnoticed -- and
 * assertReadable() below checks the output either way.
 */
const readableOnly = {
  name: 'readable-only',
  load(id) {
    if (/[\\/]bson[\\/]lib[\\/]bson\.cjs$/.test(id)) {
      const source = readFileSync(id, 'utf8');
      const wasm = /new WebAssembly\.Instance\(new WebAssembly\.Module\(new Uint8Array\(\[[\d,\s]+\]\)\),\s*\{\}\)\.exports/;
      if (!wasm.test(source)) throw new Error(`bson's inline WebAssembly not found in ${id}`);
      return source.replace(wasm, 'undefined');
    }
    if (/[\\/]@mongodb-js[\\/]saslprep[\\/]dist[\\/]node\.js$/.test(id)) {
      if (!readFileSync(id, 'utf8').includes('./code-points-data')) {
        throw new Error(`saslprep's entry point changed: ${id}`);
      }
      return `
        const prep = require('./index').default;
        const src = require('./code-points-src');
        // index.js asks each table .get(codePoint); the Sets answer .has().
        const codePoints = {};
        for (const key of Object.keys(src)) {
          if (src[key] instanceof Set) codePoints[key] = { get: c => src[key].has(c) };
        }
        function saslprep(input, opts) { return prep(codePoints, input, opts); }
        saslprep.saslprep = saslprep;
        saslprep.default = saslprep;
        module.exports = saslprep;
      `;
    }
    return null;
  },
};

/** TypeScript to JavaScript, one file at a time; type checking is tsc's job. */
const typescript = {
  name: 'typescript',
  async transform(code, id) {
    if (!id.endsWith('.ts')) return null;
    // The shebang is put back on each entry by `banner` below. Left in, it
    // would sit wherever Rollup places the module, and anywhere but line one
    // node reads it as code.
    const result = await transform(code.replace(/^#!.*\r?\n/, ''), {
      loader: 'ts', format: 'esm', target: 'node20', sourcefile: id,
    });
    return { code: result.code, map: null };
  },
};

/**
 * The plugin directory holds any file over 256 KiB that is not an image or a
 * font as one it "couldn't inspect", and it checks bundled code like any other
 * file. One bundle per entry was 1.8 and 2.5 MB, so the code is split into
 * chunks below that, each still plain readable source.
 *
 * Modules are grouped by package, so a chunk's name says what is in it, and a
 * package too big for one chunk is cut in module order. Sizes come from a first
 * pass that writes nothing and renders every module on its own, so they are
 * what each module really adds after tree-shaking. Chunk boilerplate adds a
 * little on top, so the budget sits under the limit, and every written file is
 * checked against the real one.
 */
const FILE_LIMIT = 256 * 1024;
const CHUNK_BUDGET = 200 * 1024;

function packageOf(id) {
  const path = relative(root, id).split(sep).join('/');
  const nm = path.lastIndexOf('node_modules/');
  if (nm !== -1) {
    const [scope, name] = path.slice(nm + 'node_modules/'.length).split('/');
    return scope.startsWith('@') ? `${scope.slice(1)}-${name}` : scope;
  }
  if (path.startsWith('omitted/')) return 'omitted';
  const own = path.match(/^packages\/([^/]+)\//);
  return own ? `devbrain-${own[1]}` : 'misc';
}

/** Module id to chunk name, from each module's rendered size. */
function planChunks(sizes, entries) {
  const groups = new Map();
  for (const id of [...sizes.keys()].sort()) {
    // Entries stay in their own file, which is what the hooks and plugin.json
    // run; Rollup's own helper modules go wherever their importers do.
    if (entries.has(id) || id.startsWith('\0')) continue;
    const pkg = packageOf(id);
    if (!groups.has(pkg)) groups.set(pkg, []);
    groups.get(pkg).push(id);
  }
  const plan = new Map();
  for (const [pkg, ids] of groups) {
    let part = 1, used = 0;
    for (const id of ids) {
      const size = sizes.get(id);
      if (used > 0 && used + size > CHUNK_BUDGET) { part += 1; used = 0; }
      plan.set(id, `${pkg}-${part}`);
      used += size;
    }
  }
  return plan;
}

/** Fail the build on anything the directory's scan would refuse to read. */
function assertReadable(file) {
  const text = readFileSync(file, 'utf8');
  const problems = [];
  if (/WebAssembly\.(Module|Instance|compile|instantiate)\(/.test(text)) problems.push('WebAssembly');
  if (/[A-Za-z0-9+/]{1000,}={0,2}/.test(text)) problems.push('a base64 run of 1000+ characters');
  const bytes = statSync(file).size;
  if (bytes >= FILE_LIMIT) problems.push(`${(bytes / 1024).toFixed(0)} KiB, over the 256 KiB limit`);
  if (problems.length) throw new Error(`${file} contains ${problems.join(' and ')}`);
}

const outDir = join(root, 'plugin', 'dist');
// Chunk names change with the code, so the old ones must not linger.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const bundle = await rollup({
  input: {
    cli: join(root, 'packages/cli/src/index.ts'),
    mcp: join(root, 'packages/mcp/src/index.ts'),
  },
  external: [...OPTIONAL, ...builtinModules, ...builtinModules.map(m => `node:${m}`)],
  plugins: [
    stubOmitted,
    readableOnly,
    // Read by isNoAiBuild() in core. Set here rather than at run time because it
    // is a property of the artifact, not of the machine running it.
    // DEVBRAIN_PLUGIN_BUILD the same way, read by the CLI and MCP entry points:
    // settings come from Claude Code, and code only the npm CLI runs is dropped.
    replace({ preventAssignment: true, values: {
      'process.env.DEVBRAIN_NO_AI': '"1"',
      'process.env.DEVBRAIN_PLUGIN_BUILD': '"1"',
    } }),
    nodeResolve({ preferBuiltins: true, extensions: ['.ts', '.mjs', '.js', '.cjs', '.json'] }),
    typescript,
    // Compact: the tr46 mapping table rendered with spacing came to 267 KiB.
    json({ compact: true }),
    // strictRequires keeps CommonJS load order exactly as node would run it,
    // which the Mongo driver's circular requires depend on once they are spread
    // across chunks. The optional modules above are required inside a
    // try/catch, so leaving those calls alone is what lets the driver find them
    // absent.
    commonjs({
      // .ts too: cli and mcp require inquirer and ./agent lazily, and only a
      // file the plugin reads has those calls routed to the stubs above.
      extensions: ['.js', '.cjs', '.ts'],
      strictRequires: true,
      transformMixedEsModules: true,
      ignoreTryCatch: true,
      ignoreDynamicRequires: true,
    }),
  ],
  onwarn(warning, warn) {
    // Expected with strictRequires: every CommonJS module is wrapped lazily, so
    // a cycle between chunks is resolved at call time, not at load.
    // Between chunks too, for the same reason: cutting the Mongo driver and
    // ajv into several files puts their own cycles across file boundaries.
    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'CIRCULAR_CHUNK') return;
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
});

const common = {
  format: 'cjs',
  exports: 'auto',
  generatedCode: 'es2015',
  // Kept readable on purpose: these files are committed, so a reviewer should
  // be able to see what changed, and minifying would make every diff opaque.
  compact: false,
  sourcemap: false,
};

// Named exports here only to silence a warning per module about mixing default
// and named exports, which matters for a library's consumers and not for sizes.
const measured = await bundle.generate({ ...common, exports: 'named', preserveModules: true });
const sizes = new Map();
const entries = new Set();
for (const chunk of measured.output) {
  if (chunk.type !== 'chunk' || !chunk.facadeModuleId) continue;
  sizes.set(chunk.facadeModuleId, Buffer.byteLength(chunk.code));
  if (chunk.isEntry) entries.add(chunk.facadeModuleId);
}
const plan = planChunks(sizes, entries);

const { output } = await bundle.write({
  ...common,
  dir: outDir,
  entryFileNames: '[name].js',
  chunkFileNames: 'lib/[name].js',
  // Off, so an entry requires only what it uses. On, Rollup hoisted every
  // chunk's own dependencies into cli.js as bare requires -- the Mongo driver's
  // `http` among them -- and the directory's scan read that as cli.js able to
  // send data off the machine. Each chunk still requires what it needs.
  hoistTransitiveImports: false,
  banner: chunk => (chunk.isEntry ? '#!/usr/bin/env node' : ''),
  manualChunks: id => plan.get(id),
});
await bundle.close();
for (const file of output) assertReadable(join(outDir, file.fileName));
const total = output.reduce((n, f) => n + statSync(join(outDir, f.fileName)).size, 0);
const largest = Math.max(...output.map(f => statSync(join(outDir, f.fileName)).size));
console.log(
  `plugin/dist  ${output.length} files, ${(total / 1024 / 1024).toFixed(2)} MB, ` +
  `largest ${(largest / 1024).toFixed(0)} KiB`,
);

// A stamp the test compares against the newest source file, so "the bundles are
// stale" is a failing test rather than something noticed in production.
writeFileSync(
  join(outDir, 'BUILD'),
  JSON.stringify({ builtAt: Date.now() }, null, 2) + '\n',
);
console.log('plugin/dist/BUILD stamped');
