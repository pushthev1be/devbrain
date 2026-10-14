/**
 * Refuse to publish plugin code under a version that is already published.
 *
 *   node scripts/check-plugin-version.mjs        (run by `npm run publish:plugin`)
 *
 * Claude Code decides whether an installed plugin needs updating by its
 * version. Ship new code under the old one and `/plugin update` answers
 * "already at the latest version" while the installed copy keeps the old code:
 * that is how 0.1.0 kept serving a build from before the cross-project fix to
 * everyone who had installed it, with no sign anything was missing.
 *
 * Compares the committed plugin/dist with the published dist, by git tree hash,
 * so line endings and checkout state cannot make two identical builds differ.
 */
import { execSync } from 'child_process';

const PUBLISHED = 'https://github.com/pushthev1be/Devbrain-memory-Claudeplugin.git';
const git = args => execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

git(`fetch --quiet ${PUBLISHED} main`);
const published = JSON.parse(git('show FETCH_HEAD:.claude-plugin/plugin.json')).version;
const local = JSON.parse(git('show HEAD:plugin/.claude-plugin/plugin.json')).version;
const codeChanged = git('rev-parse FETCH_HEAD:dist') !== git('rev-parse HEAD:plugin/dist');

if (codeChanged && local === published) {
  console.error(
    `\n  Not publishing: plugin/dist differs from the published build, but plugin.json is still ${local}.\n` +
    `  Installed copies would keep the old code — /plugin update compares versions, not files.\n` +
    `  Bump "version" in plugin/.claude-plugin/plugin.json, commit, and publish again.\n`,
  );
  process.exit(1);
}
console.log(`  plugin ${published} -> ${local}${codeChanged ? ', new code' : ', same code'}`);
