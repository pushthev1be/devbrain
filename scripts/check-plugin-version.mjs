/**
 * Refuse to publish a changed plugin under a version that is already published.
 *
 *   node scripts/check-plugin-version.mjs        (run by `npm run release:plugin`)
 *
 * Claude Code decides whether an installed plugin needs updating by its
 * version. Ship new code under the old one and `/plugin update` answers
 * "already at the latest version" while the installed copy keeps the old code:
 * that is how 0.1.0 kept serving a build from before the cross-project fix to
 * everyone who had installed it, with no sign anything was missing.
 *
 * Compares all of plugin/ — bundles, hooks, skills, commands — with the
 * published repository's tree, by git tree hash, so line endings and checkout
 * state cannot make two identical trees differ. Hooks and skills are behaviour
 * as much as the bundles are, and are delivered by the same update.
 */
import { execSync } from 'child_process';

const PUBLISHED = 'https://github.com/pushthev1be/Devbrain-memory-Claudeplugin.git';
const git = args => execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

git(`fetch --quiet ${PUBLISHED} main`);
const published = JSON.parse(git('show FETCH_HEAD:.claude-plugin/plugin.json')).version;
const local = JSON.parse(git('show HEAD:plugin/.claude-plugin/plugin.json')).version;
const changed = git('rev-parse FETCH_HEAD:') !== git('rev-parse HEAD:plugin');

if (changed && local === published) {
  console.error(
    `\n  Not publishing: plugin/ differs from the published plugin, but plugin.json is still ${local}.\n` +
    `  Installed copies would keep the old version — /plugin update compares versions, not files.\n` +
    `  Bump "version" in plugin/.claude-plugin/plugin.json, commit, and release again.\n`,
  );
  process.exit(1);
}
console.log(`  plugin ${published} -> ${local}${changed ? ', changed' : ', unchanged'}`);
