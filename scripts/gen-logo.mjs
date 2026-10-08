/**
 * Write assets/logo.svg from the one definition of the mark.
 *
 *   npm run brand
 *
 * The file exists because a README and a repo need a logo they can point at,
 * but it is not where the logo lives — packages/mcp/src/brand.ts is. Generating
 * it means the tab icon, the sidebar and the file cannot drift into three
 * slightly different marks, which is the normal fate of a logo kept in more
 * than one place. brand.test.ts fails if this has not been run.
 */

import { writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { logoSvg } = require('../packages/mcp/dist/brand.js');

const out = new URL('../assets/logo.svg', import.meta.url);
writeFileSync(out, logoSvg() + '\n');
console.log('assets/logo.svg written from packages/mcp/src/brand.ts');
