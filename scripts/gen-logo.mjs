/**
 * Write the logo from the one definition of the mark.
 *
 *   npm run brand
 *
 * The files exist because a README and a plugin manifest need a logo they can
 * point at, but that is not where the logo lives - packages/mcp/src/brand.ts
 * is. Generating them means the tab icon, the sidebar and the files cannot
 * drift into four slightly different marks, which is the normal fate of a logo
 * kept in more than one place. brand.test.ts fails if this has not been run.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { logoSvg } = require('../packages/mcp/dist/brand.js');

// Two outputs from the one definition: the repo copy the README embeds, and the
// plugin's own, because plugin.json's `icon` resolves inside the plugin root
// and a path that escapes it fails validation.
const svg = logoSvg() + '\n';
for (const rel of ['../assets/logo.svg', '../plugin/assets/logo.svg']) {
  const out = fileURLToPath(new URL(rel, import.meta.url));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  console.log(`${rel.slice(3)} written from packages/mcp/src/brand.ts`);
}
