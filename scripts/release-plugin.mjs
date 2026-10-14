/**
 * Release the plugin as a pull request to its published repository.
 *
 *   npm run release:plugin              build, test, check, push release/<version>
 *   npm run release:plugin -- --dry-run everything but the push
 *
 * Replaces `git subtree push --prefix=plugin`. That pushed plugin/'s split
 * history straight to the published main, and stopped working once releases
 * went through pull requests there: the merge commits of #3-#5 are in the
 * published main and in no split of this repository, so every push after them
 * is rejected as non-fast-forward even when the files are identical.
 *
 * So the release is committed on top of what is published instead — which always
 * fast-forwards — on a branch of its own, and nothing reaches the directory until
 * that pull request is merged. In order:
 *
 *   1. main, clean, and level with origin/main (a dry run only warns)
 *   2. npm run build, then npm test — and the rebuilt plugin/ must match the
 *      committed one, since what is published is the commit, not this folder
 *   3. scripts/check-plugin-version.mjs: new code needs a new version
 *   4. a temp clone of the published main, its tree replaced with HEAD:plugin
 *   5. stop if that changes nothing; else commit to release/<version>, push,
 *      and print the link that opens the pull request
 */
import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PUBLISHED = 'https://github.com/pushthev1be/Devbrain-memory-Claudeplugin.git';
const PUBLISHED_WEB = 'https://github.com/pushthev1be/Devbrain-memory-Claudeplugin';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const step = msg => console.log(`\n  ── ${msg}`);
function stop(msg, code = 1) {
  console[code ? 'error' : 'log'](`\n  ${msg}\n`);
  process.exit(code);
}
function problem(msg) {
  if (!dryRun) stop(msg);
  console.log(`  (dry run, continuing) ${msg}`);
}

// 1. Where we are.
step('source');
const branch = out('git branch --show-current');
if (branch !== 'main') problem(`On ${branch || 'a detached HEAD'}, not main. Release from main.`);
if (out('git status --porcelain')) problem('The working tree has uncommitted changes. Commit or set them aside first.');
out('git fetch --quiet origin main');
if (out('git rev-parse HEAD') !== out('git rev-parse origin/main')) problem('HEAD is not origin/main. Pull, or push what is not merged.');
const source = out('git rev-parse --short HEAD');
const version = JSON.parse(out('git show HEAD:plugin/.claude-plugin/plugin.json')).version;
console.log(`  ${branch} @ ${source}, plugin ${version}`);

// 2. The committed bundles are what a fresh build makes.
step('build and test');
run('npm run build');
run('npm test');
// BUILD is a timestamp and differs on every build; anything else differing
// means plugin/ was committed without being rebuilt.
const stale = out("git diff --name-only -- plugin \":(exclude)plugin/dist/BUILD\"");
if (stale) {
  stop(`plugin/ was committed stale — a fresh build changes:\n    ${stale.split('\n').join('\n    ')}\n` +
       `  The rebuilt files are left in place: commit them through a pull request, then release.`);
}
// Same content as committed. The bundler writes LF where a Windows checkout
// has CRLF, which git still lists as modified, so put the checkout back as it
// was rather than leave it looking dirty to the next run.
run('git checkout -- plugin');

// 3. New code needs a new version, or /plugin update will not deliver it.
step('version');
run('node scripts/check-plugin-version.mjs');

// 4. The published main with plugin/ laid over it.
step('stage');
const tmp = mkdtempSync(join(tmpdir(), 'devbrain-release-'));
const releaseBranch = `release/${version}`;
let outcome;
try {
  outcome = stageAndPush(tmp);
} finally {
  // A dry run keeps the staged commit so it can be inspected.
  if (!(dryRun && outcome === 'staged')) rmSync(tmp, { recursive: true, force: true });
}
if (outcome === 'unchanged') stop(`The published plugin already matches plugin/ at ${source}. Nothing to release.`, 0);
if (outcome === 'exists') stop(`${releaseBranch} already exists on the published repository. Merge or delete it, or bump the version.`);
if (outcome === 'staged') stop(`Dry run: ${releaseBranch} committed in ${tmp} and not pushed.`, 0);
console.log(`\n  Pushed ${releaseBranch}. Open the pull request:\n` +
            `    ${PUBLISHED_WEB}/compare/main...${releaseBranch}?expand=1\n` +
            `  Merging it publishes ${version}; the plugin directory scans it and sends it for review.\n`);

function stageAndPush(dir) {
  run(`git clone --quiet --branch main ${PUBLISHED} .`, dir);
  // Take the plugin tree of this checkout's HEAD commit. read-tree -u --reset
  // makes the work tree exactly that tree, removing files plugin/ no longer
  // has, and nothing passes through this checkout's working folder.
  run(`git fetch --quiet "${root}" HEAD`, dir);
  run('git read-tree -u --reset FETCH_HEAD:plugin', dir);

  // 5. Nothing to release, or a branch to review.
  if (!out('git status --porcelain', dir)) return 'unchanged';
  console.log(out('git status --short', dir).split('\n').map(l => `    ${l}`).join('\n'));
  run(`git switch --quiet -c ${releaseBranch}`, dir);
  run(`git commit --quiet -m "release: ${version}" -m "Built from pushthev1be/devbrain@${source}."`, dir);
  if (dryRun) return 'staged';

  step('push');
  if (out(`git ls-remote --heads origin ${releaseBranch}`, dir)) return 'exists';
  run(`git push --quiet -u origin ${releaseBranch}`, dir);
  return 'pushed';
}
