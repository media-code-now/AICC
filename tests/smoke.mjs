import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

const baseUrl = 'http://127.0.0.1:4173';
const pages = [
  '/',
  '/services.html',
  '/email-account-security.html',
  '/endpoint-device-security.html',
  '/website-ecommerce-security.html',
  '/backup-recovery.html',
  '/employee-security-training.html',
  '/managed-security-monitoring.html',
  '/security-assessment.html',
  '/who-we-help.html',
  '/how-it-works.html',
  '/resources.html',
  '/about.html',
  '/contact.html',
  '/privacy-policy.html',
  '/terms-of-use.html'
];

const server = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '4173', DATA_DIR: join(tmpdir(), `aass-test-${process.pid}`) },
  stdio: ['ignore', 'pipe', 'pipe']
});

function stopServer() {
  if (!server.killed) {
    server.kill('SIGTERM');
  }
}

try {
  await new Promise((resolve, reject) => {
    let settled = false;

    server.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (!settled && text.includes('Server running')) {
        settled = true;
        resolve();
      }
    });

    server.stderr.on('data', (chunk) => {
      if (!settled) {
        settled = true;
        reject(new Error(chunk.toString()));
      }
    });

    server.on('exit', (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Server exited early with code ${code}`));
      }
    });
  });

  await delay(150);

  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page}`);
    if (!response.ok) {
      throw new Error(`Expected 200 for ${page}, got ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes('AI Agents See Security')) {
      throw new Error(`Missing primary brand on ${page}`);
    }
    if (!html.includes('Request a Security Assessment')) {
      throw new Error(`Missing primary conversion CTA on ${page}`);
    }
  }

  const overview = await fetch(`${baseUrl}/services.html`).then((r) => r.text());
  if (!overview.includes('Security services built around your business.')) {
    throw new Error('Services overview missing required headline');
  }

  const sections = [
    'Business problems this service addresses',
    'What the service includes',
    'Initial setup versus ongoing management',
    'What you receive',
    'Scope and responsibilities',
    'Frequently asked questions'
  ];
  const banned = [/24\/7/i, /guarantee(d)? (recovery|protection)/i, /official partner/i, /certified partner/i];
  for (const page of pages.slice(2, 8)) {
    const html = await fetch(`${baseUrl}${page}`).then((r) => r.text());
    for (const s of sections) {
      if (!html.includes(s)) throw new Error(`${page} missing section: ${s}`);
    }
    for (const re of banned) {
      if (re.test(html)) throw new Error(`${page} contains disallowed claim: ${re}`);
    }
  }
  const monitoring = await fetch(`${baseUrl}/managed-security-monitoring.html`).then((r) => r.text());
  if (!monitoring.includes('Monitoring coverage is defined in your service plan.')) {
    throw new Error('Monitoring page missing coverage statement');
  }

  const assessment = await fetch(`${baseUrl}/security-assessment.html`).then((r) => r.text());
  for (const text of [
    'Understand where your business is exposed.',
    'Please do not submit passwords, access codes, payment information, or sensitive customer data.',
    'Request an Assessment',
    'Thank you. Your request has been received. Our team will contact you to discuss your needs and assessment scope.'
  ]) {
    if (!assessment.includes(text)) throw new Error(`Assessment page missing: ${text}`);
  }
  if (/\bfree\b/i.test(assessment)) throw new Error('Assessment page must not describe the assessment as free');

  const post = (body) =>
    fetch(`${baseUrl}/api/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  const valid = {
    fullName: 'Test Person',
    businessName: 'Test Co',
    workEmail: 'test@example.com',
    employeeCount: '11-25',
    concerns: ['backups', 'devices'],
    formStartedAt: Date.now() - 10000,
    companyFax: ''
  };
  let r = await post({ ...valid, workEmail: 'bad', concerns: [] });
  let j = await r.json();
  if (r.status !== 422 || !j.errors.workEmail || !j.errors.concerns) throw new Error('API should reject invalid input with 422');
  r = await post({ ...valid, companyFax: 'spam' });
  if (r.status !== 400) throw new Error('API should reject honeypot submissions');
  r = await post({ ...valid, formStartedAt: Date.now() });
  if (r.status !== 400) throw new Error('API should reject too-fast submissions');
  r = await post(valid);
  j = await r.json();
  if (r.status !== 200 || j.ok !== true) throw new Error(`API should accept valid input, got ${r.status}`);
  // 4 requests so far; the 5th is still allowed, the 6th must be limited.
  r = await post(valid);
  if (r.status !== 200) throw new Error(`5th request should be allowed, got ${r.status}`);
  r = await post(valid);
  if (r.status !== 429) throw new Error('API should rate limit after 5 requests');

  for (const p of ['/data/assessment-requests.jsonl', '/server.js', '/package.json', '/lib/assessment-validation.js']) {
    const res = await fetch(`${baseUrl}${p}`);
    if (res.status !== 404) throw new Error(`${p} should not be publicly served (got ${res.status})`);
  }

  const who = await fetch(`${baseUrl}/who-we-help.html`).then((r) => r.text());
  for (const t of [
    'Protection for the way your business works.',
    'Professional service businesses',
    'Construction and home service companies',
    'eCommerce and retail businesses',
    'Agencies and distributed teams',
    'Growing businesses without an internal security team'
  ]) {
    if (!who.includes(t)) throw new Error(`Who We Help missing: ${t}`);
  }
  for (const h of ['Systems you depend on', 'Common security concerns', 'Relevant services']) {
    const count = who.split(`<h3>${h}</h3>`).length - 1;
    if (count !== 5) throw new Error(`Who We Help: expected 5 "${h}" sections, found ${count}`);
  }
  if (/(HIPAA|PCI|SOC ?2|GDPR|ISO ?27001)[^.]*(compliant|compliance)/i.test(who)) {
    throw new Error('Who We Help must not claim regulatory compliance');
  }

  const how = await fetch(`${baseUrl}/how-it-works.html`).then((r) => r.text());
  for (const t of ['Assess', 'Prioritize', 'Protect', 'Maintain', 'Working with your existing IT provider', 'Escalation contacts agreed before service begins', 'Responsibilities agreed before service begins', 'Request a Security Assessment']) {
    if (!how.includes(t)) throw new Error(`How It Works missing: ${t}`);
  }

  const resources = await fetch(`${baseUrl}/resources.html`).then((r) => r.text());
  for (const t of ['Email and phishing', 'Passwords and account access', 'Website security', 'Backups and recovery', 'Employee security habits', 'Business owner checklists']) {
    if (!resources.includes(t)) throw new Error(`Resources missing category: ${t}`);
  }
  if (/\.pdf|\.docx?|\sdownload[=\s>]/i.test(resources)) throw new Error('Resources must not link to nonexistent files');
  const resourceLinks = [...resources.matchAll(/href="([^"#]+)(#[^"]*)?"/g)].map((m) => m[1]).filter((h) => !h.startsWith('http') && !h.startsWith('mailto') && h.endsWith('.html'));
  for (const link of new Set(resourceLinks)) {
    const res = await fetch(`${baseUrl}/${link}`);
    if (!res.ok) throw new Error(`Resources links to missing page: ${link}`);
  }

  const training = await fetch(`${baseUrl}/employee-security-training.html`).then((r) => r.text());
  for (const t of [
    'Help your team recognize risks and respond confidently.',
    'Security Awareness Demo',
    'not a security assessment or a certification',
    'assets/js/quiz.js',
    'Short, practical lessons',
    'Real-world scenarios',
    'New employee training',
    'Refresher quizzes',
    'Clear incident reporting instructions',
    'Completion reporting for managers'
  ]) {
    if (!training.includes(t)) throw new Error(`Training page missing: ${t}`);
  }
  if (/type="email"/.test(training)) throw new Error('Training demo must not require an email address');

  const quizSrc = await fetch(`${baseUrl}/assets/js/quiz.js`).then((r) => r.text());
  if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|document\.cookie/.test(quizSrc)) {
    throw new Error('Public demo quiz must not store or transmit answers');
  }
  const ctx = { window: {} };
  vm.runInNewContext(quizSrc, ctx);
  const qs = ctx.window.SecurityAwarenessDemo.QUESTIONS;
  if (qs.length !== 5) throw new Error(`Quiz should have 5 questions, has ${qs.length}`);
  for (const q of qs) {
    if (q.choices.length !== 3) throw new Error(`Quiz question ${q.id} should have 3 choices`);
    if (!(q.correct >= 0 && q.correct < 3)) throw new Error(`Quiz question ${q.id} has invalid answer`);
    if (!q.explanation || !q.tip) throw new Error(`Quiz question ${q.id} missing explanation or tip`);
  }

  const footerLinks = [
    'services.html', 'email-account-security.html', 'endpoint-device-security.html', 'website-ecommerce-security.html',
    'backup-recovery.html', 'employee-security-training.html', 'managed-security-monitoring.html',
    'resources.html', 'contact.html', 'privacy-policy.html', 'terms-of-use.html'
  ];
  for (const page of pages) {
    const html = await fetch(`${baseUrl}${page}`).then((r) => r.text());
    const footer = (html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/) || [''])[0];
    if (!footer.includes('An AI Agents See company')) throw new Error(`${page} footer missing parent line`);
    if (!footer.includes('AI Agents See Security')) throw new Error(`${page} footer missing brand`);
    if (!/©\s*<span data-year><\/span>/.test(footer)) throw new Error(`${page} footer missing copyright`);
    for (const l of footerLinks) {
      if (!footer.includes(`href="${l}"`)) throw new Error(`${page} footer missing link to ${l}`);
    }
  }

  const aboutPage = await fetch(`${baseUrl}/about.html`).then((r) => r.text());
  for (const t of [
    'Business technology experience. A dedicated security focus.',
    'To help businesses protect the accounts, systems, websites, and information they depend on through practical security measures and clear ongoing guidance.',
    'Clear scope and accountability',
    'Practical improvements',
    'Client ownership of business assets',
    'Transparent reporting',
    'href="https://aiagentssee.com/"',
    'subsidiary of AI Agents See',
    '[Biography to be confirmed]'
  ]) {
    if (!aboutPage.includes(t)) throw new Error(`About page missing: ${t}`);
  }
  if (/certified|certification|years of experience|headquartered|offices in|clients served/i.test(aboutPage)) {
    throw new Error('About page contains an unconfirmed claim');
  }

  const contactPage = await fetch(`${baseUrl}/contact.html`).then((r) => r.text());
  for (const t of [
    'Existing clients should use the support and incident-reporting channels provided in their service agreement.',
    'not a monitored emergency',
    '[Business email to be confirmed]',
    '[Business phone to be confirmed]',
    'href="security-assessment.html"',
    'action="/api/contact"'
  ]) {
    if (!contactPage.includes(t)) throw new Error(`Contact page missing: ${t}`);
  }
  if (/Monday|Friday|\d{1,2}:\d{2}\s*(am|pm)?\s*[–-]/i.test(contactPage)) throw new Error('Contact page must not list unconfirmed hours');

  const postContact = (body) =>
    fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const validContact = { fullName: 'Test', email: 'a@example.com', topic: 'services', message: 'Hello', formStartedAt: Date.now() - 10000, companyFax: '' };
  r = await postContact({ ...validContact, topic: 'bogus', message: '' });
  j = await r.json();
  if (r.status !== 422 || !j.errors.topic || !j.errors.message) throw new Error('Contact API should reject invalid input');
  r = await postContact({ ...validContact, companyFax: 'x' });
  if (r.status !== 400) throw new Error('Contact API should reject honeypot');
  r = await postContact(validContact);
  j = await r.json();
  if (r.status !== 200 || j.ok !== true) throw new Error(`Contact API should accept valid input, got ${r.status}`);

  const about = await fetch(`${baseUrl}/about.html`).then((r) => r.text());
  if (!about.includes('An AI Agents See company')) {
    throw new Error('About page missing required parent-company relationship text');
  }

  console.log(`Smoke test passed for ${pages.length} pages.`);
} finally {
  stopServer();
}
