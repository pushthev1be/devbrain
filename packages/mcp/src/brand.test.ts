/**
 * Tests for the mark.
 *
 * A logo kept in more than one place becomes more than one logo. The sidebar,
 * the favicon and assets/logo.svg are all generated from LOGO_MARK, and these
 * check that nothing has been edited into one of them alone.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LOGO_MARK, BRAND_COLOR, logoSvg, faviconDataUri } from './brand';
import { HTML_DASHBOARD } from './dashboard';

const REPO_ROOT = join(__dirname, '..', '..', '..');

describe('the mark', () => {
  // Both copies: the README embeds the repo one, and plugin.json's `icon` points
  // at the plugin one, which has to be inside the plugin root to validate.
  it.each([['assets'], ['plugin/assets']])(
    'is the same geometry in %s/logo.svg — run `npm run brand` if this fails',
    dir => {
      const onDisk = readFileSync(join(REPO_ROOT, ...dir.split('/'), 'logo.svg'), 'utf-8').trim();
      expect(onDisk).toBe(logoSvg().trim());
    });

  it('is drawn in the dashboard from the same source, not a copy', () => {
    expect(HTML_DASHBOARD).toContain(LOGO_MARK);
  });

  it('gives the tab an icon, which it did not have at all', () => {
    expect(HTML_DASHBOARD).toMatch(/<link rel="icon" href="data:image\/svg\+xml,/);
  });
});

describe('the favicon data URI', () => {
  // A '#' left raw ends the URI at the colour, so the icon silently does not
  // load — the exact failure the tab already had, from having no icon at all.
  it('escapes the characters that would truncate it', () => {
    const uri = faviconDataUri();
    expect(uri).not.toContain('#');
    expect(uri).not.toContain('<');
    expect(uri).not.toContain('>');
    expect(uri).toContain('%23');
  });

  it('still carries the brand colour, escaped', () => {
    expect(faviconDataUri()).toContain(BRAND_COLOR.replace('#', '%23'));
  });

  it('round-trips back to valid SVG', () => {
    const decoded = decodeURIComponent(faviconDataUri().replace('data:image/svg+xml,', ''));
    expect(decoded).toMatch(/^<svg[^>]*viewBox='0 0 24 24'/);
    expect(decoded).toContain('</svg>');
  });
});

describe('the mark at favicon size', () => {
  // Three elements, not five, and a hub clearly larger than the nodes: at 16px
  // a thin even-weight network turns to mush.
  it('has one hub and two nodes, with the hub the largest', () => {
    const radii = [...LOGO_MARK.matchAll(/r="([\d.]+)"/g)].map(m => Number(m[1]));
    expect(radii).toHaveLength(3);
    const [hub, ...nodes] = radii;
    for (const n of nodes) expect(hub).toBeGreaterThan(n);
  });

  it('inherits its colour rather than hard-coding one', () => {
    expect(LOGO_MARK).toContain('currentColor');
    expect(LOGO_MARK).not.toContain('#');
  });
});
