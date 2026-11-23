// Replaces the <footer class="site-footer"> block in every top-level HTML page
// with the shared footer from partials.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOOTER } from './partials.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOOTER_RE = /<footer class="site-footer">[\s\S]*?<\/footer>/;

let updated = 0;
for (const file of readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  if (!FOOTER_RE.test(html)) {
    console.warn(`No footer found in ${file}; skipped.`);
    continue;
  }
  const next = html.replace(FOOTER_RE, FOOTER);
  if (next !== html) {
    writeFileSync(path, next);
    updated += 1;
  }
}
console.log(`Footer applied to ${updated} page(s).`);
