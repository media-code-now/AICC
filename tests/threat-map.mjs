import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import schema from '../lib/threat-feed-schema.js';
import reader from '../lib/threat-feed.js';

const { validateFeed, STALE_AFTER_MS } = schema;
const { createThreatFeed } = reader;
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'aicc-threat-test-'));
const file = join(dir, 'fictional-fixture.json');
let browser;
const servers = [];
let now = Date.now();
const iso = offset => new Date(now - offset).toISOString();
// Deliberately fictional fixture; never installed as the site's default feed.
function fixture(count = 3) {
  return { version: 1, publicDisplayApproved: true, generatedAt: iso(1000), privateKey: 'do-not-publish',
    sources: [{ id: 'lab', name: 'Fictional test lab', url: 'https://example.org/', attribution: 'Fictional test attribution', license: 'Test only', secret: 'do-not-publish' }],
    records: Array.from({ length: count }, (_, i) => ({ id: `test-${i}`, sourceId: 'lab', title: i ? `Fictional observation ${i}` : '<img src=x onerror=alert(1)>',
      summary: 'Fictional text <script>alert(1)</script>', category: i % 2 ? 'phishing' : 'bot', priority: i % 2 ? 'high' : 'unknown',
      observedAt: iso(60000 * (i + 1)), location: i === 2 ? null : { latitude: 0, longitude: 0, label: 'Fictional test location' }, secret: 'do-not-publish' })) };
}
async function server(port, feedPath = '') {
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), THREAT_FEED_FILE: feedPath }, stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(child);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server timeout')), 10000);
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    child.once('error', err => { clearTimeout(timer); reject(err); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exit ${code}`)); });
  });
  return `http://127.0.0.1:${port}`;
}
try {
  assert.equal((await createThreatFeed({ filePath: '' }).read()).status, 'unconfigured');
  const cleaned = validateFeed(fixture());
  assert(!JSON.stringify(cleaned).includes('do-not-publish'));
  assert.equal(validateFeed(fixture(0)).records.length, 0);
  for (const mutate of [
    f => { f.publicDisplayApproved = false; }, f => { f.version = 2; }, f => { f.sources[0].url = 'javascript:alert(1)'; },
    f => { f.sources[0].url = 'https://user:password@example.org'; }, f => { f.records[0].location.latitude = 91; },
    f => { f.records[0].location.longitude = -181; }, f => { f.records[0].sourceId = 'missing'; },
    f => { f.generatedAt = 'yesterday'; }, f => { f.generatedAt = iso(-120000); },
    f => { f.records[0].observedAt = iso(-120000); }, f => { f.records[0].priority = 'critical'; },
    f => { f.records.push(f.records[0]); }, f => { f.sources.push(f.sources[0]); },
    f => { f.records[0].location = undefined; }, f => { f.records[0].summary = 'x'.repeat(601); }
  ]) { const input = fixture(); mutate(input); assert.throws(() => validateFeed(input)); }
  assert.throws(() => validateFeed(fixture(201)));
  await writeFile(file, JSON.stringify(fixture()));
  const feedReader = createThreatFeed({ filePath: file, now: () => now, cacheMs: 0 });
  const first = await feedReader.read(); assert.equal(first.status, 'current');
  now += STALE_AFTER_MS + 1;
  const stale = await feedReader.read(); assert.equal(stale.status, 'stale');
  assert.equal(stale.feed.generatedAt, first.feed.generatedAt);
  assert.notEqual(stale.lastSuccessfulAt, first.lastSuccessfulAt);
  await writeFile(file, '{bad private json');
  const failed = await feedReader.read(); assert.equal(failed.status, 'offline');
  assert.deepEqual(failed.feed, first.feed); assert.equal(failed.lastSuccessfulAt, stale.lastSuccessfulAt);
  assert(!JSON.stringify(failed).includes(file));
  await writeFile(file, 'x'.repeat(512 * 1024 + 1));
  assert.equal((await feedReader.read()).status, 'offline');
  assert.equal((await createThreatFeed({ filePath: dir }).read()).status, 'offline');
  assert.equal((await createThreatFeed({ filePath: join(dir, 'missing') }).read()).feed, null);
  now = Date.now();
  await writeFile(file, JSON.stringify(fixture()));
  assert.equal((await feedReader.read()).status, 'current');
  const cached = createThreatFeed({ filePath: file, now: () => now });
  const concurrent = await Promise.all([cached.read(), cached.read()]); assert.deepEqual(concurrent[0], concurrent[1]);
  await writeFile(file, 'invalid'); assert.equal((await cached.read()).status, 'current');
  now += 30001; assert.equal((await cached.read()).status, 'offline');
  now = Date.now(); await writeFile(file, JSON.stringify(fixture()));

  const base = await server(4351);
  const configured = await server(4352, file);
  const noFeed = await fetch(`${base}/api/threat-map`);
  assert.equal(noFeed.headers.get('cache-control'), 'no-store');
  assert.equal((await noFeed.json()).status, 'unconfigured');
  const method = await fetch(`${base}/api/threat-map`, { method: 'POST' });
  assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), 'GET');
  const real = await fetch(`${configured}/api/threat-map`).then(r => r.json());
  assert.equal(real.status, 'current'); assert(!JSON.stringify(real).includes('do-not-publish'));
  for (const path of ['/lib/threat-feed.js', '/data/feed.json']) assert.equal((await fetch(`${base}${path}`)).status, 404);

  browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
  await page.goto(`${base}/threat-map.html`);
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'unconfigured');
  assert.equal(await page.locator('#tm-records li').count(), 0);
  await page.locator('#tm-demo').click();
  assert(await page.locator('#tm-demo-banner').isVisible());
  assert.equal(await page.locator('#tm-records li').count(), 6);
  assert.equal(await page.locator('.tm-marker').count(), 5);
  assert.match(await page.locator('#tm-checked').innerText(), /Not available/);
  assert.equal(await page.locator('#tm-sources a').count(), 0);
  await page.locator('#tm-window').selectOption('all'); assert.equal(await page.locator('#tm-records li').count(), 8);
  await page.locator('#tm-category').selectOption('phishing'); assert.equal(await page.locator('#tm-records li').count(), 2);
  await page.locator('#tm-priority').selectOption('high'); assert.equal(await page.locator('#tm-records li').count(), 1);
  await page.locator('#tm-source').selectOption('source:demo-sensor'); assert.equal(await page.locator('#tm-records li').count(), 0);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.waitForFunction(() => document.querySelectorAll('#tm-records li').length === 6);
  await page.locator('#tm-search').fill('without location');
  assert.equal(await page.locator('#tm-records li').count(), 1); assert.equal(await page.locator('.tm-marker').count(), 0);
  assert.match(await page.locator('#tm-map-empty').innerText(), /no coordinates/);
  await page.locator('#tm-records button').first().focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('#tm-detail').innerText(), /Location unavailable/);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.locator('#tm-records button').first().click();
  assert.equal(await page.locator('.tm-marker.is-selected').count(), 1);
  const output = join(tmpdir(), 'aicc-threat-map-preview'); await mkdir(output, { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    await page.screenshot({ path: join(output, `demo-${width}.png`), fullPage: true });
  }
  await page.locator('#tm-demo').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'unconfigured');
  assert.equal(await page.locator('#tm-records li').count(), 0);

  let payload = { ...real, feed: validateFeed(fixture(25)) };
  let fail = false;
  await page.route('**/api/threat-map', route => fail ? route.abort() : route.fulfill({ json: payload }));
  await page.locator('#tm-refresh').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'current');
  assert.equal(await page.locator('#tm-records li').count(), 20);
  await page.locator('#tm-more').click(); assert.equal(await page.locator('#tm-records li').count(), 25);
  assert.equal(await page.locator('#tm-records img, #tm-records script').count(), 0);
  assert.match(await page.locator('#tm-records').innerText(), /<img src=x onerror=alert\(1\)>/);
  await page.locator('#tm-records button').first().click();
  assert.equal(await page.locator('#tm-detail script').count(), 0);
  assert.equal(await page.locator('#tm-sources a').getAttribute('href'), 'https://example.org/');
  assert.match(await page.locator('#tm-detail').innerText(), /Fictional test attribution/);
  // Offline browser retains the same snapshot and original timestamps.
  const stamp = await page.locator('#tm-generated').innerText();
  await context.setOffline(true);
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'offline');
  assert.equal(await page.locator('#tm-records li').count(), 25);
  assert.equal(await page.locator('#tm-generated').innerText(), stamp);
  await context.setOffline(false);
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'current');
  fail = true;
  await page.locator('#tm-demo').click(); await page.locator('#tm-demo').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'offline');
  assert.equal(await page.locator('#tm-demo-banner').isVisible(), false);
  assert.equal(await page.locator('#tm-records li').count(), 20); // Pagination reset, original real data retained.
  assert.equal(await page.locator('#tm-generated').innerText(), stamp);
  fail = false;
  payload = { ...payload, status: 'current', feed: { ...fixture(0), generatedAt: iso(STALE_AFTER_MS + 1000) } };
  await page.locator('#tm-refresh').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'stale');
  assert.match(await page.locator('#tm-list-empty').innerText(), /empty snapshot/);
  payload = { ...payload, feed: fixture(), status: 'current' };
  payload.feed.sources[0].url = 'javascript:alert(1)';
  await page.locator('#tm-refresh').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'offline');
  assert.equal(await page.locator('#tm-sources a[href^="javascript:"]').count(), 0);
  // Freshness ages even when no response arrives; fake clock avoids a 15-minute test.
  payload = { ...real, feed: fixture() };
  await page.locator('#tm-refresh').click();
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'current');
  await page.clock.install();
  await page.clock.setSystemTime(Date.now() + STALE_AFTER_MS + 30000);
  await page.clock.runFor(15001);
  await page.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'stale');
  const racePage = await context.newPage();
  racePage.on('pageerror', error => errors.push(error.message));
  let release;
  let requested;
  const waiting = new Promise(resolve => { requested = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  await racePage.route('**/api/threat-map', async route => {
    requested(); await held;
    await route.fulfill({ json: real }).catch(() => {}); // A cancelled request may no longer accept a response.
  });
  await racePage.goto(`${base}/threat-map.html`); await waiting;
  await racePage.locator('#tm-demo').click();
  release();
  await racePage.waitForTimeout(100);
  assert.equal(await racePage.locator('#tm-state').getAttribute('data-state'), 'demo');
  assert(await racePage.locator('#tm-demo-banner').isVisible());
  assert.match(await racePage.locator('#tm-records').innerText(), /Example/);
  await racePage.unroute('**/api/threat-map');
  await racePage.route('**/api/threat-map', route => route.abort());
  await racePage.reload();
  await racePage.waitForFunction(() => document.querySelector('#tm-state').dataset.state === 'offline');
  assert.equal(await racePage.locator('#tm-records li').count(), 0);
  assert.match(await racePage.locator('#tm-map-empty').innerText(), /unavailable/);
  await racePage.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log(`Threat Map schema, reader, endpoint, demo, filters, attribution, safe rendering, pagination, stale/offline recovery and responsive tests passed. Screenshots: ${output}`);
} finally {
  await browser?.close();
  for (const child of servers) child.kill('SIGTERM');
  await rm(dir, { recursive: true, force: true });
}