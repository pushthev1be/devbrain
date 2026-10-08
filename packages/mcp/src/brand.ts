// The DevBrain mark, in one place.
//
// Three nodes, all linked: a graph closed on itself, which is the shape of what
// the product stores. Entries are connected to each other — a fix to the bug it
// closed, a correction to what it corrects — and the graph view draws exactly
// this.
//
// A hub with two nodes fanning off it was drawn first and thrown away: that is
// the universal share glyph, and a logo that reads as a UI control is not a
// logo. A closed triangle is not any standard icon, and the closure is the
// point — memory that refers back to itself rather than passing something on.
//
// Drawn for 16px first, not 24. A favicon is the smallest place it appears and
// the one where a thin even-weight network turns to mush, so there are three
// elements, one node is clearly larger than the other two, and the links are as
// thick as they will bear. Lines are drawn before the circles so the filled
// nodes cover their ends and no join shows.
//
// Exported as inner markup rather than a whole file, so the sidebar, the
// favicon and assets/logo.svg are all the same geometry — a logo that drifts
// between the tab and the page is two logos.

/** Inner SVG for a 24x24 viewBox. Inherits colour from `currentColor`. */
export const LOGO_MARK =
  '<path d="M7 16.4 12.6 6.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
  '<path d="M12.6 6.2 18 15.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
  '<path d="M7 16.4 18 15.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
  '<circle cx="6.8" cy="16.6" r="3.2" fill="currentColor"/>' +
  '<circle cx="12.7" cy="6" r="2.2" fill="currentColor"/>' +
  '<circle cx="18.2" cy="15.8" r="2.2" fill="currentColor"/>';

/** The brand amber. Readable on a light tab bar and a dark one alike. */
export const BRAND_COLOR = '#d4a053';

/** A standalone SVG document for the mark, at a fixed colour. */
export function logoSvg(color = BRAND_COLOR, size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" `
    + `fill="none" color="${color}">${LOGO_MARK}</svg>`;
}

/**
 * The mark as a `data:` URI, for the favicon.
 *
 * Inlined rather than served as a file: the dashboard is one string with no
 * static route, and a favicon that 404s leaves the browser showing its default
 * — which is what it was doing. Only `#` and the quotes need escaping; leaving
 * the rest literal keeps it legible in view-source.
 */
export function faviconDataUri(color = BRAND_COLOR): string {
  const svg = logoSvg(color, 32)
    .replace(/#/g, '%23')
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `data:image/svg+xml,${svg}`;
}
