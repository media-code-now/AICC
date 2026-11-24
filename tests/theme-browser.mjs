import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(tmpdir(), 'aicc-theme-preview');
const base = 'http://127.0.0.1:4341';
const server = spawn(process.execPath, ['server.js'], {
  cwd: root, env: { ...process.env, PORT: '4341' }, stdio: ['ignore', 'pipe', 'pipe']
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview timed out')), 10000);
    server.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Server exited ${code}`)));
  });
  browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const pages = (await readdir(root)).filter(name => name.endsWith('.html') && !name.startsWith('__'));
  await mkdir(output, { recursive: true });
  const failures = [];

  async function audit(name) {
    const result = await page.evaluate(() => {
      const css = el => getComputedStyle(el);
      const rgb = color => {
        const values = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
        return [...values.slice(0, 3), values[3] ?? 1];
      };
      const blend = (a, b) => a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3]));
      const luminance = values => values.slice(0, 3).map(v => {
        const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
      const background = el => {
        const layers = [];
        for (let node = el; node; node = node.parentElement) layers.push(rgb(css(node).backgroundColor));
        return layers.reverse().reduce((b, a) => blend(a, b), [6, 9, 18]);
      };
      const contrast = [];
      const seen = new Set();
      for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,a,label,legend,button,dt,dd,th,td,summary,.hint,.form-note,.quiz-text,.quiz-badge')) {
        if (!el.getClientRects().length || el.closest('[hidden],.visually-hidden,.hp-field') || el.matches(':disabled')) continue;
        if (!el.textContent.trim()) continue;
        const style = css(el);
        if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        const bg = background(el), fg = blend(rgb(style.color), bg);
        const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
        const ratio = (light + 0.05) / (dark + 0.05);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
        const key = `${el.tagName}.${el.className}:${style.color}`;
        if (ratio < (large ? 3 : 4.5) && !seen.has(key)) {
          seen.add(key); contrast.push(`${key} ${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 40)}"`);
        }
      }
      const primary = [...document.querySelectorAll('.cta-primary')].filter(el => el.getClientRects().length);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        background: css(document.body).backgroundColor,
        primaryConsistent: primary.every(el => ['rgb(193, 210, 255)', 'rgb(224, 233, 255)'].includes(css(el).backgroundColor) && css(el).color === 'rgb(16, 24, 42)'),
        contrast
      };
    });
    if (result.overflow || result.background !== 'rgb(6, 9, 18)' || !result.primaryConsistent || result.contrast.length) failures.push({ name, ...result });
  }

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of pages) {
      await page.goto(`${base}/${name}`);
      await audit(`${name}@${width}`);
      if ([360, 1440].includes(width) && ['services.html', 'contact.html', 'about.html', 'resources.html', 'security-assessment.html'].includes(name)) {
        await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true });
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 1000 });
  for (const name of ['contact.html', 'security-assessment.html']) {
    await page.goto(`${base}/${name}`);
    await page.locator('form button[type="submit"]').click();
    await page.locator('.error-summary').waitFor({ state: 'visible' });
    await audit(`${name}:validation-errors`);
    assert(await page.locator('.field.has-error input').first().evaluate(el => getComputedStyle(el).borderColor === 'rgb(255, 164, 179)'));
  }

  await page.goto(`${base}/employee-security-training.html`);
  await page.locator('.quiz-option input').first().check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await audit('quiz:incorrect-answer');
  assert.equal(await page.locator('.quiz-option.is-incorrect').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(43, 36, 26)');
  assert.equal(await page.locator('.quiz-option.is-correct').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(17, 43, 38)');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.locator('.quiz-option input').nth(2).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await audit('quiz:correct-answer');

  await page.goto(`${base}/services.html`);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await audit('mobile-menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
  await page.goto(`${base}/email-account-security.html`);
  await page.locator('summary').first().click();
  await audit('services:expanded-faq');

  assert.deepEqual(errors, [], 'No runtime errors or missing assets');
  assert.deepEqual(failures, [], 'Theme, overflow and contrast checks');
  console.log(`Theme checks passed for ${pages.length} pages at three widths, form errors, quiz states, mobile menu and FAQ. Screenshots: ${output}`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}