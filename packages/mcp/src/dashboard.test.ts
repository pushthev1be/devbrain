/**
 * Tests for the dashboard HTML served at GET /.
 *
 * The dashboard is a TypeScript template literal containing HTML, CSS and an
 * inline <script>. Nothing in the toolchain parses that script: `tsc` sees an
 * opaque string, and fetching the page with curl returns HTML without executing
 * it. A single stray quote therefore shipped a page whose entire <script> block
 * failed to parse — every button dead, stats never loaded, nothing saveable —
 * and every automated check still passed.
 *
 * These tests parse the emitted script for real, so that cannot recur.
 */

import { describe, it, expect } from 'vitest';
import * as vm from 'vm';
// Straight from the dashboard module — not via testExports, which drags in the
// whole MCP server and its SDK transports just to read a string.
import { HTML_DASHBOARD } from './dashboard';

function inlineScript(): string {
  const match = HTML_DASHBOARD.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('dashboard has no inline <script> block');
  return match[1];
}

describe('dashboard inline script', () => {
  it('parses as valid JavaScript', () => {
    // The regression: `\'` inside the template literal collapsed to a bare quote,
    // terminating a string early and throwing SyntaxError at page load, which
    // killed every handler on the page.
    expect(() => new vm.Script(inlineScript(), { filename: 'dashboard.js' })).not.toThrow();
  });

  it('uses no inline event handlers at all', () => {
    // Inline handlers are what forced quote-escaping inside the template literal
    // in the first place. Clicks are delegated from data attributes instead.
    const handlers = HTML_DASHBOARD.match(/\son[a-z]+="/g) ?? [];
    expect(handlers, `found inline handlers: ${handlers.join(', ')}`).toHaveLength(0);
  });

  it('defines the functions its delegated handler dispatches to', () => {
    const js = inlineScript();
    for (const fn of ['selectProject', 'renderProject', 'renderSearch', 'renderSave',
                      'doSearch', 'doSave', 'supersedeDecision', 'loadProjects', 'loadStorage']) {
      expect(js, `${fn}() is dispatched but never defined`).toMatch(new RegExp(`function\\s+${fn}\\b`));
    }
  });

  it('registers exactly one delegated click listener', () => {
    const listeners = inlineScript().match(/document\.addEventListener\('click'/g) ?? [];
    expect(listeners).toHaveLength(1);
  });

  it('escapes interpolated values before putting them in innerHTML', () => {
    const js = inlineScript();
    expect(js).toMatch(/function esc\(/);
    // Entry titles and content come from commit messages and agent output, so
    // they are untrusted. Every card field must go through esc().
    for (const field of ['e.title', 'r.title', 'r.content', 'p.name']) {
      expect(js, `${field} is rendered without esc()`).toContain(`esc(${field})`);
    }
    // e.content reaches a card through bodyOf(), which trims a repeated title
    // off the front. What it returns still has to be escaped, and the raw field
    // must never be concatenated into markup — which this now checks directly,
    // rather than inferring it from the presence of one call.
    expect(js, 'the body is rendered without esc()').toContain('esc(body)');
    // The risk is the raw field landing on a line that emits tags. It may still
    // be read for the search haystack and by bodyOf, neither of which builds
    // markup, so the check is for markup specifically rather than for any use.
    const markupUses = js.split('\n').map(l => l.trim())
      .filter(l => l.includes('e.content') && l.includes('<'));
    expect(markupUses, 'e.content appears on a line that builds markup').toEqual([]);
  });

  it('has no unescaped quote left by template-literal collapsing', () => {
    expect(inlineScript()).not.toMatch(/'[^'\n]*\('' \+/);
  });
});

describe('dashboard markup', () => {
  it('offers every entry type when saving', async () => {
    const { ENTRY_TYPE_NAMES } = await import('@devbrain/core');
    const js = inlineScript();
    const types = js.match(/var TYPES = (\[[\s\S]*?\]);/)![1];
    const parsed = JSON.parse(types) as { type: string }[];
    expect(parsed.map(t => t.type).sort()).toEqual([...ENTRY_TYPE_NAMES].sort());
  });

  it('declares a viewport and a mobile breakpoint', () => {
    expect(HTML_DASHBOARD).toMatch(/name="viewport"/);
    expect(HTML_DASHBOARD, 'no @media rule — the page cannot adapt to a phone')
      .toMatch(/@media \(max-width/);
  });

  it('is organised around projects', () => {
    expect(HTML_DASHBOARD).toContain('id="project-list"');
    expect(inlineScript()).toContain("getJSON('/api/projects')");
    expect(inlineScript()).toContain("'/api/project?id='");
  });

  it('sends a project id when saving, instead of a hardcoded project', () => {
    expect(inlineScript()).toMatch(/project_id:\s*el\('f-project'\)\.value/);
  });

  it('states the storage backend from the server rather than a fixed label', () => {
    // The old sidebar listed "MongoDB Atlas" and "Google Cloud Run" as static
    // text, which was wrong for anyone on local storage.
    expect(inlineScript()).toContain("getJSON('/api/health')");
    expect(HTML_DASHBOARD).not.toContain('Google Cloud Run');
    expect(HTML_DASHBOARD.replace(/'mongodb'/g, '')).not.toContain('MongoDB Atlas');
  });
});
