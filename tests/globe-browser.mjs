import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ATTACK_ROUTES, locationVector, projectPoint, arcPoint } from '../assets/js/globe-attacks.js';

// Front, rear, and limb landmarks validate the overlay's globe projection.
assert(projectPoint(locationVector([0, -90]), 0, 0).depth > 0.99);
assert(!projectPoint(locationVector([0, 90]), 0, 0).visible);
assert(Math.abs(projectPoint(locationVector([0, 0]), 0, 0).x - 0.924) < 0.001);
assert.equal(ATTACK_ROUTES.length, 12);
for (const route of ATTACK_ROUTES) {
  for (const [t, expected] of [[0, route.start], [1, route.end]]) {
    const actual = arcPoint(route.start, route.end, t);
    assert(actual.every((value, i) => Math.abs(value - expected[i]) < 1e-10));
  }
  assert(route.points.flat().every(Number.isFinite));
}

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4338;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
const output = join(tmpdir(), 'aicc-globe-preview');
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server timed out')), 10000);
    server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
  });
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-unsafe-swiftshader']
  });
  await mkdir(output, { recursive: true });

  if (process.argv.includes('--update-poster')) {
    // Generate the fallback from our own renderer, not from reference-site artwork.
    const poster = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
    await poster.setContent(`<style>html,body{margin:0;background:transparent}canvas{display:block;width:900px;height:900px}.globe-toggle{display:none}</style><div class="globe-stage" data-globe-poster><canvas width="900" height="900"></canvas><button class="globe-toggle" hidden></button></div>`);
    await poster.addScriptTag({ content: await readFile(join(root, 'assets/js/globe.js'), 'utf8') });
    await poster.waitForSelector('.globe-ready');
    await poster.waitForTimeout(800);
    await poster.locator('canvas').screenshot({ path: join(root, 'assets/images/globe-preview.png'), omitBackground: true });
    await poster.close();
    console.log('Generated local globe fallback.');
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const thirdParty = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (/^https?:/.test(req.url()) && !req.url().startsWith(base)) thirdParty.push(req.url()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.waitForSelector('.globe-ready');
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('.attack-legend').count(), 0, 'Removed legend must not appear');
  assert(await page.locator('.attack-readout').innerText().then(text => text.includes('simulated')));
  const trailPixels = () => page.locator('.globe-attacks').evaluate(canvas => canvas.toDataURL());
  const trailsA = await trailPixels();
  assert(await page.locator('.globe-attacks').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let drawn = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) drawn++;
    return drawn > 200;
  }), 'Simulation must draw visible route pixels');
  await page.waitForTimeout(250);
  assert.notEqual(await trailPixels(), trailsA, 'Attack packets must animate');
  assert.equal(await page.locator('.globe-stage').getAttribute('data-motion'), 'running');
  const movingA = await page.locator('.globe-art').screenshot();
  await page.waitForTimeout(300);
  const movingB = await page.locator('.globe-art').screenshot();
  assert(!movingA.equals(movingB), 'Globe must visibly rotate');
  await page.getByRole('button', { name: 'Pause globe and threat simulation' }).click();
  await page.waitForTimeout(300);
  const pausedTrails = await trailPixels();
  const pausedReadout = await page.locator('.attack-readout').innerText();
  const frozenA = await page.locator('.globe-art').screenshot();
  await page.waitForTimeout(300);
  const frozenB = await page.locator('.globe-art').screenshot();
  if (!frozenA.equals(frozenB)) {
    const changedFraction = await page.evaluate(async images => {
      const arrays = await Promise.all(images.map(async data => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      }));
      let changed = 0;
      for (let i = 0; i < arrays[0].length; i++) if (arrays[0][i] !== arrays[1][i]) changed++;
      return changed / arrays[0].length;
    }, [frozenA.toString('base64'), frozenB.toString('base64')]);
    assert(changedFraction < 0.00005, `Pause must freeze pixels (difference ${changedFraction})`);
  }
  assert.equal(await page.locator('.globe-stage').getAttribute('data-motion'), 'static');
  assert.equal(await trailPixels(), pausedTrails, 'Pause must freeze attack paths too');
  assert.equal(await page.locator('.attack-readout').innerText(), pausedReadout);

  // Verify a real, detailed rendered globe, rather than merely canvas markup.
  const pixels = await page.evaluate(async data => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const values = ctx.getImageData(0, 0, image.width, image.height).data;
    let bright = 0;
    const colors = new Set();
    for (let i = 0; i < values.length; i += 16) {
      if (values[i] + values[i + 1] + values[i + 2] > 270) bright++;
      colors.add(`${values[i]},${values[i + 1]},${values[i + 2]}`);
    }
    return { bright, colors: colors.size };
  }, frozenA.toString('base64'));
  assert(pixels.bright > 1000 && pixels.colors > 500, `Expected geographic detail: ${JSON.stringify(pixels)}`);

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const rect = s => document.querySelector(s).getBoundingClientRect();
      const copy = rect('.globe-hero-copy');
      const control = rect('.globe-toggle');
      const readout = rect('.attack-readout');
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        copyFits: copy.left >= 0 && copy.right <= innerWidth,
        controlFits: control.left >= 0 && control.right <= innerWidth,
        simulationFits: readout.left >= 0 && readout.right <= innerWidth,
        globeWidth: rect('.globe-art').width,
        links: [...document.querySelectorAll('.globe-services a')].every(a => a.getBoundingClientRect().height >= 44)
      };
    });
    assert(!layout.overflow && layout.copyFits && layout.controlFits && layout.simulationFits && layout.links, `${width}px: ${JSON.stringify(layout)}`);
    assert(layout.globeWidth > width * 0.45, 'Globe should be prominent');
    if ([390, 1440].includes(width)) await page.screenshot({ path: join(output, `home-${width}.png`) });
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Play globe and threat simulation' }).click();
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.globe-stage').getAttribute('data-motion'), 'static', 'Offscreen globe must stop');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.globe-stage').getAttribute('data-motion'), 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.globe-stage').dataset.motion === 'static');
  assert.equal(await page.locator('.globe-stage').getAttribute('data-motion'), 'static');
  assert(await page.locator('.globe-toggle').isHidden());
  assert.equal(await page.locator('.globe-fallback').evaluate(el => getComputedStyle(el).opacity), '1');
  const reducedTrails = await trailPixels();
  await page.waitForTimeout(250);
  assert.equal(await trailPixels(), reducedTrails, 'Reduced motion must freeze simulation');
  await page.reload();
  assert(!await page.locator('.globe-stage').evaluate(el => el.classList.contains('globe-ready')), 'Reduced motion should not initialize WebGL');
  assert(await page.locator('.globe-fallback').evaluate(img => img.complete && img.naturalWidth > 0));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForSelector('.globe-ready');

  const noWebgl = await browser.newPage();
  await noWebgl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.includes('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await noWebgl.goto(base);
  assert(await noWebgl.locator('.globe-fallback').evaluate(img => img.complete && img.naturalWidth > 0));
  assert(await noWebgl.locator('.globe-toggle').isHidden());
  const noWebglTrails = await noWebgl.locator('.globe-attacks').evaluate(canvas => canvas.toDataURL());
  assert(Number(await noWebgl.locator('.globe-attacks').getAttribute('data-routes')) > 0);
  await noWebgl.waitForTimeout(200);
  assert.equal(await noWebgl.locator('.globe-attacks').evaluate(canvas => canvas.toDataURL()), noWebglTrails);
  await noWebgl.close();

  const noJs = await browser.newPage({ javaScriptEnabled: false });
  await noJs.goto(base);
  assert(await noJs.locator('.globe-fallback').evaluate(img => img.complete && img.naturalWidth > 0));
  await noJs.close();
  assert.deepEqual(errors, [], 'No browser errors or failed assets');
  assert.deepEqual(thirdParty, [], 'No external runtime requests');
  console.log(`Globe checks passed: geographic projection, simulated trails, disclosure, rendering, pause, six widths, offscreen, reduced motion, no-WebGL, no-JS. Screenshots: ${output}`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}