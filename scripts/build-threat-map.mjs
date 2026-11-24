import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';

const root = fileURLToPath(new URL('../', import.meta.url));
const atlas = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url), 'utf8'));
const projection = geoEquirectangular().scale(960 / (2 * Math.PI)).translate([480, 240]);
const path = geoPath(projection).digits(2);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 480"><title>World map</title><rect width="960" height="480" fill="#080f1b"/><path d="${path(geoGraticule10())}" fill="none" stroke="#18253a" stroke-width="0.5"/><path d="${path(feature(atlas, atlas.objects.land))}" fill="#1a2a42" stroke="#405675" stroke-width="0.5"/></svg>`;
writeFileSync(new URL('../assets/images/threat-world.svg', import.meta.url), svg);
writeFileSync(new URL('../assets/images/threat-world-LICENSE.txt', import.meta.url), `Basemap: Natural Earth public domain data, packaged by world-atlas (ISC).\n\n${readFileSync(new URL('../node_modules/world-atlas/LICENSE', import.meta.url), 'utf8')}`);
await build({ absWorkingDir: root, entryPoints: ['assets/js/threat-map-source.js'], outfile: 'assets/js/threat-map.js', bundle: true, minify: true, format: 'iife', target: ['es2020'] });
console.log('Built Threat Map interface and local basemap.');