import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['assets/js/globe-source.js'],
  outfile: 'assets/js/globe.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'eof'
});
// Retain third-party notices alongside the distributable. No runtime CDN needed.
writeFileSync(new URL('../assets/js/globe-LICENSE.txt', import.meta.url),
  ['cobe', 'phenomenon'].map(name => `${name}\n${readFileSync(new URL(`../node_modules/${name}/LICENSE`, import.meta.url), 'utf8')}`).join('\n\n'));
console.log('Built locally bundled globe.');