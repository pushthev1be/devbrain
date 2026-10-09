/**
 * The claims PRIVACY.md makes, checked against the code that has to keep them.
 *
 * A privacy page is a promise written in prose, which means it goes stale
 * silently: someone adds a read of a new path, or a crash reporter, and the page
 * still says otherwise. These are the claims specific enough to test, pinned the
 * same way the generated icons and the committed bundles are.
 *
 * What is deliberately NOT tested here: that redaction catches every secret, and
 * that MongoDB is only reached when configured. The first is a judgement call
 * covered by redact.test.ts, and the second by db.ts's own tests.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REPO = join(__dirname, '..', '..', '..');

/** Every non-test source file across the workspace, with its path. */
function sources(): { path: string; code: string }[] {
  const out: { path: string; code: string }[] = [];
  for (const pkg of ['core', 'cli', 'mcp']) {
    const dir = join(REPO, 'packages', pkg, 'src');
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
      out.push({ path: `packages/${pkg}/src/${name}`, code: readFileSync(join(dir, name), 'utf-8') });
    }
  }
  return out;
}

describe('the claims in PRIVACY.md', () => {
  it('has a privacy page, and the manifest points at it', () => {
    expect(existsSync(join(REPO, 'PRIVACY.md'))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(REPO, 'plugin', '.claude-plugin', 'plugin.json'), 'utf-8'),
    );
    expect(manifest.privacyPolicyUrl, 'plugin.json should link the privacy page')
      .toMatch(/PRIVACY[.]md$/);
  });

  // "No telemetry, no analytics, no usage reporting. None."
  it('contains no telemetry or crash-reporting client', () => {
    const banned = ['posthog', 'mixpanel', 'amplitude', 'segment.io', '@sentry/', 'bugsnag', 'datadog'];
    for (const { path, code } of sources()) {
      const lower = code.toLowerCase();
      for (const name of banned) {
        expect(lower.includes(name), `${path} mentions ${name} — PRIVACY.md claims there is none`)
          .toBe(false);
      }
    }
  });

  // "no outbound HTTP of its own". The dashboard's inline browser script calls
  // the dashboard's own localhost endpoints, which is why it is exempt; a fetch
  // anywhere else would be a request from the user's machine to somewhere the
  // privacy page does not mention.
  it('makes no outbound request of its own outside the dashboard page script', () => {
    for (const { path, code } of sources()) {
      if (path.endsWith('/dashboard.ts')) continue;
      expect(code, `${path} makes an outbound request — PRIVACY.md says only a database you configure`)
        .not.toMatch(/\bfetch\(|https?\.(request|get)\(|axios\.|require\('got'\)/);
    }
  });

  // "What DevBrain reads" is a table in PRIVACY.md. A read of a new path under
  // the home directory makes that table incomplete, which is the quiet way a
  // privacy page becomes untrue.
  it('reads only the home-directory paths the page lists', () => {
    const allowed = [".devbrain", ".claude"];
    const found = new Set<string>();
    for (const { code } of sources()) {
      for (const m of code.matchAll(/homedir\(\),\s*'([^']+)'/g)) found.add(m[1]);
    }
    expect(found.size, 'expected at least one home-directory read to be found').toBeGreaterThan(0);
    for (const dir of found) {
      expect(allowed, `reads ~/${dir}, which PRIVACY.md does not list`).toContain(dir);
    }
  });
});
