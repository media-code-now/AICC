// Generates services.html and the six individual service pages from structured content.
// Run: npm run build:services
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, BRAND_LINK, FOOTER } from './partials.mjs';
import { serviceDiagram } from './service-diagrams.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const navItems = [
  ['index.html', 'Home'],
  ['services.html', 'Services'],
  ['who-we-help.html', 'Who We Help'],
  ['how-it-works.html', 'How It Works'],
  ['resources.html', 'Resources'],
  ['about.html', 'About'],
  ['contact.html', 'Contact']
];

function layout({ title, description, active, body, scripts = [] }) {
  const nav = navItems
    .map(([href, label]) => `<li><a href="${href}"${href === active ? ' aria-current="page"' : ''}>${label}</a></li>`)
    .join('\n            ');
  const extraScripts = scripts.map((src) => `\n    <script src="${src}" defer></script>`).join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)} | ${BRAND}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg" />
    <link rel="stylesheet" href="assets/css/styles.css" />
    <script src="assets/js/main.js" defer></script>${extraScripts}
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="site-header">
      <div class="container header-inner">
        ${BRAND_LINK}
        <button class="nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav class="site-nav" id="site-nav" aria-label="Primary">
          <ul>
            ${nav}
            <li><a class="cta cta-primary cta-small" href="security-assessment.html">Request a Security Assessment</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <main id="main-content">
${body}
    </main>

    ${FOOTER}
  </body>
</html>
`;
}

const list = (items) => `<ul class="list-check">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const services = [
  {
    slug: 'email-account-security.html',
    name: 'Email & Account Security',
    protects: 'Business email, cloud accounts, and the people who sign in to them',
    headline: 'Control who can access your business email and accounts.',
    intro:
      'Email and cloud accounts hold your conversations, files, invoices, and customer details. This service strengthens how employees and administrators sign in, reviews who has access to what, and puts clear procedures in place for people joining and leaving your business.',
    problems: [
      'Accounts protected only by a password, with multi-factor authentication missing or inconsistent',
      'Administrator rights given to more people than need them, or left with former staff',
      'Uncertainty about whether your email domain is set up to make impersonation harder',
      'Mailbox forwarding rules or connected apps that nobody remembers approving',
      'No consistent checklist for granting and removing access when people join or leave'
    ],
    includes: [
      ['MFA configuration', 'Setting up and enforcing multi-factor authentication for administrators and employees, using methods suited to your platform and team.'],
      ['Administrator and employee access review', 'Reviewing who holds administrative and standard access, and recommending changes so access matches current roles.'],
      ['Email authentication review', 'Reviewing your domain’s email authentication records (such as SPF, DKIM, and DMARC) and recommending configuration changes.'],
      ['Suspicious forwarding and connected-app review', 'Checking for unexpected mailbox forwarding rules and third-party apps with access to your accounts, and flagging items for your decision.'],
      ['Onboarding and offboarding procedures', 'Documenting step-by-step procedures for granting access to new employees and removing it when people leave.']
    ],
    setup: [
      'Initial review of accounts, administrator roles, and sign-in settings',
      'MFA rollout planning and configuration',
      'Email authentication record review and recommended changes',
      'Forwarding-rule and connected-app review',
      'Onboarding and offboarding procedures drafted with your team'
    ],
    ongoing: [
      'Periodic access reviews at an agreed frequency',
      'Re-checks for new forwarding rules and connected apps',
      'Support applying the joiner and leaver procedures',
      'Updates to configuration as your team and tools change'
    ],
    receives: [
      'A summary of findings from the initial account and access review',
      'Documented MFA configuration for covered accounts',
      'Email authentication recommendations',
      'Written onboarding and offboarding procedures',
      'Periodic access review summaries if ongoing management is included'
    ],
    we: [
      'Review and configure covered accounts within the agreed scope',
      'Document findings and recommendations clearly',
      'Confirm changes with you before applying anything that affects users'
    ],
    you: [
      'Provide appropriate administrative access to covered platforms',
      'Decide which accounts, users, and apps are approved',
      'Tell us promptly when employees join, change roles, or leave',
      'Communicate sign-in changes to your employees'
    ],
    scopeNote: 'Changes to your domain’s DNS records may need to be made by whoever manages your domain registrar or DNS provider.',
    faqs: [
      ['Will MFA disrupt our employees?', 'MFA adds a sign-in step. We plan the rollout with you so employees know what to expect and when it takes effect.'],
      ['Which email platforms do you cover?', 'Coverage depends on the platforms you use. We confirm what can be reviewed and configured during the assessment.'],
      ['Does this make our account compromise impossible?', 'No. These measures reduce common risks, but no set of controls removes all risk. We focus on sensible, maintainable protections.']
    ]
  },
  {
    slug: 'endpoint-device-security.html',
    name: 'Endpoint & Device Security',
    protects: 'Laptops, desktops, and other devices employees use for work',
    headline: 'Keep the computers your team relies on protected and up to date.',
    intro:
      'Every laptop and desktop is a way into your business. This service establishes what devices you have, deploys endpoint protection, applies secure settings and encryption, and keeps operating systems and applications updated, with ongoing checks that protection stays healthy.',
    problems: [
      'No reliable list of which devices are used for work or who uses them',
      'Inconsistent or missing endpoint protection across devices',
      'Laptops without disk encryption, creating risk if a device is lost or stolen',
      'Operating system and application updates applied irregularly',
      'No visibility into whether protection is actually running on each device'
    ],
    includes: [
      ['Device inventory', 'Building and maintaining a record of covered devices, their users, and key details.'],
      ['Endpoint protection deployment', 'Deploying and configuring endpoint protection software on covered devices.'],
      ['Encryption and secure configuration', 'Enabling disk encryption where supported and applying recommended security settings.'],
      ['Operating system and application updates', 'Establishing an update process for operating systems and supported applications.'],
      ['Protection health monitoring', 'Checking that endpoint protection is installed, active, and reporting on covered devices.']
    ],
    setup: [
      'Device inventory for covered devices',
      'Endpoint protection deployment and configuration',
      'Encryption and secure configuration baseline',
      'Update process set up for operating systems and supported applications'
    ],
    ongoing: [
      'Inventory updates as devices are added or retired',
      'Protection health monitoring for covered devices',
      'Update management according to the agreed process',
      'Follow-up on devices that fall out of compliance with the baseline'
    ],
    receives: [
      'A device inventory for covered devices',
      'Documentation of the security configuration baseline',
      'Status reporting on protection health and update compliance if ongoing management is included'
    ],
    we: [
      'Deploy and configure agreed tools on covered devices',
      'Monitor protection health within the agreed scope',
      'Report devices that need attention'
    ],
    you: [
      'Identify which devices are in scope and who uses them',
      'Make devices available for setup and restarts when needed',
      'Approve software licensing where required',
      'Tell us when devices are added, reassigned, or retired'
    ],
    scopeNote: 'Personally owned devices, specialized equipment, and unsupported operating systems may need a separate approach. We confirm coverage during the assessment.',
    faqs: [
      ['Do you supply the endpoint protection software?', 'Tool selection and licensing are agreed in your service plan. We will explain options before anything is deployed.'],
      ['Will updates interrupt work?', 'We agree an update approach with you, including timing, to limit disruption.'],
      ['Are mobile phones included?', 'Mobile device coverage depends on your needs and platforms, and is confirmed in your service plan.']
    ]
  },
  {
    slug: 'website-ecommerce-security.html',
    name: 'Website & eCommerce Security',
    protects: 'Your website, online store, and the accounts and add-ons that run them',
    headline: 'Reduce risk across your website and online store.',
    intro:
      'Your website is often the first place customers meet your business, and for online stores it is where revenue happens. This service reviews how your site is accessed, configured, and maintained, and helps put monitoring, updates, and recovery plans in place.',
    problems: [
      'Shared or outdated administrator logins on your website or store',
      'Plugins, themes, apps, or integrations that are unused, outdated, or unreviewed',
      'No clear plan for what to do if the site is defaced, broken, or taken offline',
      'Updates applied inconsistently or without a way to roll back',
      'Uncertainty about who is responsible for which parts of the website'
    ],
    includes: [
      ['Platform reviews', 'Security reviews of WordPress, WooCommerce, Shopify, and custom websites, covering configuration and access.'],
      ['Administrator access controls', 'Reviewing administrator accounts, removing unnecessary access, and strengthening sign-in protection.'],
      ['Plugin, theme, app, and integration reviews', 'Identifying outdated, unused, or higher-risk add-ons and recommending actions.'],
      ['Website firewall configuration where appropriate', 'Configuring a website firewall where the platform and hosting setup make it appropriate.'],
      ['Monitoring, updates, and recovery planning', 'Setting up monitoring, an update process, and a documented plan for restoring the site.']
    ],
    setup: [
      'Initial platform and configuration review',
      'Administrator access cleanup and sign-in hardening',
      'Plugin, theme, app, and integration review',
      'Website firewall configuration where appropriate',
      'Recovery plan documented with your team'
    ],
    ongoing: [
      'Monitoring for covered websites',
      'Update management according to the agreed process',
      'Periodic re-review of administrator access and add-ons',
      'Recovery plan updates as the site changes'
    ],
    receives: [
      'A website security review summary with prioritized recommendations',
      'A documented administrator access list',
      'A recovery plan for the covered website',
      'Update and monitoring summaries if ongoing management is included'
    ],
    we: [
      'Review and configure covered websites within the agreed scope',
      'Coordinate updates and changes according to the agreed process',
      'Document recommendations that fall outside our access or scope'
    ],
    you: [
      'Provide appropriate access to the website, hosting, and related accounts',
      'Approve changes that affect site appearance, functionality, or checkout',
      'Coordinate with developers or agencies who also work on the site',
      'Maintain contracts with your hosting and platform providers'
    ],
    scopeNote:
      'Responsibilities vary by platform. Hosted platforms such as Shopify manage much of the underlying infrastructure, so our work focuses on store settings, staff access, and installed apps. Self-hosted platforms such as WordPress and WooCommerce, and custom websites, involve more shared responsibility with your hosting provider and developers. We define this split in your service plan.',
    faqs: [
      ['Do you build or redesign websites?', 'This service focuses on security. Design and development work are outside its scope.'],
      ['Can you review a custom-built website?', 'Yes, within the access and documentation available. The depth of review is agreed during scoping.'],
      ['Will a firewall be added to every site?', 'Only where it is appropriate for the platform and hosting setup. Some platforms already provide comparable protections.']
    ]
  },
  {
    slug: 'backup-recovery.html',
    name: 'Backup & Recovery',
    protects: 'The business data you would need to keep operating after a disruption',
    headline: 'Know what is backed up, and how you would get it back.',
    intro:
      'Backups are only useful if they cover the right data, are protected from tampering, and can actually be restored. This service identifies your critical data, plans backup coverage and retention, monitors for failures, and tests recovery against priorities agreed with you.',
    problems: [
      'Uncertainty about which business data is backed up and which is not',
      'Backups that fail silently without anyone noticing',
      'Backups that could be deleted or changed by the same accounts that use daily systems',
      'Restores that have never been tested',
      'No agreed order for what to recover first after a disruption'
    ],
    includes: [
      ['Identification of critical business data', 'Working with you to identify the systems and data your business depends on.'],
      ['Backup coverage and retention planning', 'Planning what is backed up, how often, and how long copies are kept.'],
      ['Backup failure monitoring', 'Monitoring covered backup jobs and following up on failures.'],
      ['Protected backup access', 'Restricting and strengthening access to backups to reduce the risk of tampering or deletion.'],
      ['Recovery testing', 'Performing test restores to check that covered data can be recovered.'],
      ['Agreed recovery priorities', 'Documenting which systems and data should be restored first.']
    ],
    setup: [
      'Critical data identification',
      'Backup coverage and retention plan',
      'Backup access protection',
      'Initial recovery test',
      'Recovery priorities documented'
    ],
    ongoing: [
      'Backup failure monitoring for covered backups',
      'Periodic recovery tests at an agreed frequency',
      'Coverage reviews as systems and data change',
      'Updates to recovery priorities when the business changes'
    ],
    receives: [
      'A summary of critical data and backup coverage',
      'A documented retention plan',
      'Recovery test results',
      'A recovery priorities document',
      'Backup status summaries if ongoing management is included'
    ],
    we: [
      'Plan, configure, and monitor covered backups within the agreed scope',
      'Run recovery tests and report results',
      'Support restoration according to agreed priorities'
    ],
    you: [
      'Help identify which data and systems are critical',
      'Approve retention periods and storage costs',
      'Tell us about new systems or data that should be covered',
      'Make staff available to confirm restored data is correct'
    ],
    scopeNote: 'Recovery depends on the backups available, their condition, and the nature of the incident. Recovery tests show what can be restored under test conditions; they cannot guarantee every future recovery.',
    faqs: [
      ['Is cloud data already backed up by the provider?', 'Not always in the way businesses expect. We review what your providers retain and whether additional backups are needed.'],
      ['How often do you test recovery?', 'Test frequency is agreed in your service plan based on how critical the data is.'],
      ['Can you guarantee we get everything back?', 'No. We work to make recovery more reliable and to test it regularly, but outcomes depend on many factors.']
    ]
  },
  {
    slug: 'employee-security-training.html',
    name: 'Employee Security Training',
    protects: 'Your people, and the everyday decisions they make with email, links, and data',
    headline: 'Help your team recognize risks and respond confidently.',
    intro:
      'Employees handle email, payments, accounts, and devices every day. This service gives them short, practical training based on real situations, starting in their first week and refreshed throughout the year, with clear reporting instructions and completion reporting for managers.',
    scripts: ['assets/js/quiz.js'],
    afterIntro: `
      <section class="section" aria-labelledby="approach">
        <div class="container">
          <h2 class="section-title" id="approach">How the training works</h2>
          <p class="section-intro">Training is designed to fit into a normal workday and to build confidence, not fear.</p>
          <div class="grid grid-3">
            <article class="card reveal"><h3>Short, practical lessons</h3><p>Brief lessons focused on one topic at a time, written in plain language and tied to tasks employees already do.</p></article>
            <article class="card reveal"><h3>Real-world scenarios</h3><p>Situations employees are likely to meet, such as unexpected sign-in prompts, payment change requests, and unfamiliar attachments.</p></article>
            <article class="card reveal"><h3>New employee training</h3><p>Security essentials covered during onboarding, so new team members know expectations from their first days.</p></article>
            <article class="card reveal"><h3>Refresher quizzes</h3><p>Short scenario-based quizzes that reinforce earlier lessons and highlight topics worth revisiting.</p></article>
            <article class="card reveal"><h3>Clear incident reporting instructions</h3><p>Simple, written steps telling employees who to contact and what to do when something looks wrong, and reassurance that reporting is always the right call.</p></article>
            <article class="card reveal"><h3>Completion reporting for managers</h3><p>Managers can see who has completed assigned training through a separately secured client training platform, not through this public website.</p></article>
          </div>
        </div>
      </section>
`,
    beforeFaq: `
      <section class="section" id="demo" aria-labelledby="demo-title">
        <div class="container narrow">
          <p class="kicker kicker-dark">Try it</p>
          <h2 class="section-title" id="demo-title">Security Awareness Demo</h2>
          <p class="section-intro">Five short scenarios that show the style of our training. Choose an answer, check it, and read the explanation before moving on.</p>
          <div class="banner" role="note">
            <p>This is an educational exercise only. It is not a security assessment or a certification, and results do not reflect your organization’s security. No email address is required, and your answers are not saved or sent anywhere.</p>
          </div>
          <div class="quiz card" id="demo-quiz" aria-live="off">
            <noscript><p>The interactive demo requires JavaScript. You can still <a href="security-assessment.html">request a security assessment</a> or <a href="contact.html">book a consultation</a> to discuss training.</p></noscript>
          </div>
        </div>
      </section>
`,
    problems: [
      'New employees start without any security guidance',
      'One-time annual training that is quickly forgotten',
      'Employees unsure what to do when something looks suspicious',
      'No record of who has completed training'
    ],
    includes: [
      ['New employee onboarding', 'Security essentials for new employees as part of their first days.'],
      ['Short recurring lessons', 'Brief lessons delivered on a regular schedule.'],
      ['Scenario-based quizzes', 'Quizzes based on realistic workplace situations to reinforce lessons.'],
      ['Approved phishing simulations', 'Phishing simulations run only with your written approval and agreed parameters.'],
      ['Reporting instructions', 'Clear instructions telling employees how and where to report suspicious activity.'],
      ['Completion tracking', 'Tracking which employees have completed assigned training, available to managers through a separately secured client training platform.']
    ],
    setup: [
      'Training plan and schedule agreed with you',
      'Onboarding content prepared',
      'Reporting instructions written for your business',
      'Phishing simulation rules approved in writing, if included'
    ],
    ongoing: [
      'Recurring lessons and quizzes',
      'Approved phishing simulations at an agreed frequency',
      'Onboarding training for new employees',
      'Completion tracking and follow-up'
    ],
    receives: [
      'An agreed training plan',
      'Written reporting instructions for employees',
      'Completion reports',
      'Phishing simulation summaries, if included'
    ],
    we: [
      'Deliver training content according to the agreed plan',
      'Run phishing simulations only as approved',
      'Provide completion and simulation reporting'
    ],
    you: [
      'Share employee lists and keep them current',
      'Encourage participation and set expectations with staff',
      'Approve simulation timing and content',
      'Decide how training results are used internally'
    ],
    scopeNote: 'Training supports better decisions, but it does not guarantee employees will never make a mistake. It works best alongside technical controls.',
    faqs: [
      ['Will phishing simulations embarrass employees?', 'Simulations are intended for learning. We agree the approach with you and recommend a supportive, non-punitive follow-up.'],
      ['How long are the lessons?', 'Lessons are designed to be short so they fit into a normal workday. Exact format is agreed in your plan.'],
      ['Does this training satisfy compliance requirements?', 'Training records may support your compliance efforts, but completing training does not by itself make your business compliant.'],
      ['Where are employee training records kept?', 'Employee records and manager reports are kept in a separately secured client training platform with access limited to authorized users. They are never part of this public website or the public demo.'],
      ['Is the demo on this page the actual training?', 'No. The Security Awareness Demo is a short public example of the training style. Client training content and scheduling are agreed in your service plan.']
    ]
  },
  {
    slug: 'managed-security-monitoring.html',
    name: 'Managed Security Monitoring',
    protects: 'Covered systems where early warning of suspicious activity matters',
    headline: 'Get suspicious activity reviewed and escalated with clear next steps.',
    intro:
      'Security tools generate alerts, but someone needs to review them and decide what happens next. This service monitors covered systems, reviews and escalates alerts, defines who does what during containment, and coordinates incident activity, with reporting for management.',
    problems: [
      'Alerts from security tools that nobody reviews consistently',
      'Uncertainty about who should act when something suspicious happens',
      'No agreed process for containing an issue or coordinating a response',
      'Leadership without a clear view of security activity'
    ],
    includes: [
      ['Monitoring for covered systems', 'Monitoring the systems and alert sources defined in your service plan.'],
      ['Alert review and escalation', 'Reviewing alerts and escalating those that need action to your nominated contacts.'],
      ['Defined containment responsibilities', 'Agreeing in advance which containment actions we may take and which require your approval.'],
      ['Incident coordination', 'Coordinating response activity between your team, your providers, and us during an incident.'],
      ['Management reporting', 'Regular reports summarizing monitoring activity and notable events.']
    ],
    setup: [
      'Covered systems and alert sources defined',
      'Escalation contacts and channels agreed',
      'Containment responsibilities documented and approved',
      'Reporting format and frequency agreed'
    ],
    ongoing: [
      'Monitoring and alert review for covered systems',
      'Escalation according to the agreed process',
      'Incident coordination when needed',
      'Management reporting'
    ],
    receives: [
      'A documented monitoring scope',
      'An escalation and containment responsibilities document',
      'Regular management reports',
      'Incident summaries when incidents occur'
    ],
    we: [
      'Monitor covered systems and review alerts',
      'Escalate to your contacts according to the agreed process',
      'Take only the containment actions you have approved in advance'
    ],
    you: [
      'Keep escalation contacts current and reachable',
      'Make decisions on actions that require your approval',
      'Maintain the tools and licenses that generate alerts, unless included in the plan',
      'Notify us of changes to covered systems'
    ],
    scopeNote: 'Monitoring coverage is defined in your service plan. Systems and alert sources outside that scope are not monitored.',
    faqs: [
      ['What hours is monitoring provided?', 'Monitoring coverage is defined in your service plan.'],
      ['Will you shut down systems without asking?', 'No. Containment responsibilities are agreed in advance, and actions outside that agreement require your approval.'],
      ['Does monitoring detect every threat?', 'No. Monitoring improves visibility into covered systems, but it cannot detect every threat or prevent every incident.']
    ]
  }
];

function servicePage(s) {
  const body = `      <section class="page-header">
        <div class="container">
          <p class="kicker"><a class="breadcrumb" href="services.html">Services</a> / ${esc(s.name)}</p>
          <h1>${esc(s.headline)}</h1>
          <p class="lead">${esc(s.intro)}</p>
          <div class="hero-actions">
            <a class="cta cta-primary" href="security-assessment.html">Request a Security Assessment</a>
            <a class="cta cta-secondary" href="contact.html">Book a Consultation</a>
          </div>
        </div>
      </section>
${s.afterIntro || ''}
  <div class="container service-diagram-wrap">
    ${serviceDiagram(s.slug)}
  </div>
      <section class="section" aria-labelledby="problems">
        <div class="container narrow">
          <h2 class="section-title" id="problems">Business problems this service addresses</h2>
          ${list(s.problems.map(esc))}
        </div>
      </section>

      <section class="section section-muted" aria-labelledby="includes">
        <div class="container">
          <h2 class="section-title" id="includes">What the service includes</h2>
          <div class="grid grid-3">
            ${s.includes.map(([t, d]) => `<article class="card reveal"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="phases">
        <div class="container">
          <h2 class="section-title" id="phases">Initial setup versus ongoing management</h2>
          <div class="grid grid-2">
            <article class="card reveal"><p class="phase-label">Phase 1</p><h3>Initial setup</h3>${list(s.setup.map(esc))}</article>
            <article class="card reveal"><p class="phase-label">Phase 2</p><h3>Ongoing management</h3>${list(s.ongoing.map(esc))}</article>
          </div>
          <p class="form-note">The exact setup activities, ongoing frequency, and covered systems are confirmed in your service plan.</p>
        </div>
      </section>

      <section class="section section-muted" aria-labelledby="receives">
        <div class="container narrow">
          <h2 class="section-title" id="receives">What you receive</h2>
          ${list(s.receives.map(esc))}
        </div>
      </section>

      <section class="section" aria-labelledby="scope">
        <div class="container">
          <h2 class="section-title" id="scope">Scope and responsibilities</h2>
          <div class="grid grid-2">
            <article class="card"><h3>What we handle</h3>${list(s.we.map(esc))}</article>
            <article class="card"><h3>What you handle</h3>${list(s.you.map(esc))}</article>
          </div>
          <div class="banner scope-note" role="note"><p>${esc(s.scopeNote)}</p></div>
        </div>
      </section>
${s.beforeFaq || ''}
      <section class="section section-muted" aria-labelledby="faq">
        <div class="container narrow">
          <h2 class="section-title" id="faq">Frequently asked questions</h2>
          <div class="faq">
            ${s.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container cta-panel reveal">
          <h2>Find out where ${esc(s.name.toLowerCase().replace('ecommerce', 'eCommerce'))} fits in your priorities</h2>
          <p>A security assessment reviews your current setup and helps decide which services to start with.</p>
          <div class="hero-actions">
            <a class="cta cta-primary" href="security-assessment.html">Request a Security Assessment</a>
            <a class="cta cta-secondary" href="contact.html">Book a Consultation</a>
          </div>
        </div>
      </section>`;
  return layout({ title: s.name, description: s.intro.split('. ')[0] + '.', active: 'services.html', body, scripts: s.scripts || [] });
}

function overviewPage() {
  const cards = services
    .map(
      (s) => `<article class="card service-card reveal">
              ${serviceDiagram(s.slug, true)}
              <h3><a href="${s.slug}">${esc(s.name)}</a></h3>
              <p class="protects"><span>Protects:</span> ${esc(s.protects)}</p>
              <p>${esc(s.intro.split('. ').slice(-1)[0].replace(/^This service /, 'This service '))}</p>
              <a class="text-link" href="${s.slug}" aria-label="Learn more about ${esc(s.name)}">Learn more <span aria-hidden="true">→</span></a>
            </article>`
    )
    .join('\n            ');

  const rows = [
    ['Email, Microsoft or Google accounts, and who can sign in', 'email-account-security.html'],
    ['Laptops and desktops used by employees', 'endpoint-device-security.html'],
    ['Your website or online store', 'website-ecommerce-security.html'],
    ['Files, records, and data you could not operate without', 'backup-recovery.html'],
    ['How employees spot and report suspicious messages', 'employee-security-training.html'],
    ['Ongoing review of alerts and coordinated response', 'managed-security-monitoring.html']
  ]
    .map(([need, slug]) => {
      const s = services.find((x) => x.slug === slug);
      return `<tr><td>${esc(need)}</td><td><a href="${slug}">${esc(s.name)}</a></td></tr>`;
    })
    .join('\n                ');

  const body = `      <section class="page-header">
        <div class="container">
          <p class="kicker">Services</p>
          <h1>Security services built around your business.</h1>
          <p class="lead">Each service focuses on one area your business depends on: accounts, devices, websites, data, people, and monitoring. Start with one area or combine several, based on what you need to protect.</p>
          <div class="hero-actions">
            <a class="cta cta-primary" href="security-assessment.html">Request a Security Assessment</a>
            <a class="cta cta-secondary" href="contact.html">Book a Consultation</a>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="categories">
        <div class="container">
          <h2 class="section-title" id="categories">Service categories</h2>
          <p class="section-intro">Every service follows the same structure: an initial setup to establish a sound baseline, with optional ongoing management to keep it that way.</p>
          <div class="grid grid-3">
            ${cards}
          </div>
        </div>
      </section>

      <section class="section section-muted" aria-labelledby="choose">
        <div class="container narrow">
          <h2 class="section-title" id="choose">Choose by what you need to protect</h2>
          <p class="section-intro">Not sure where to start? Find the system you are most concerned about.</p>
          <div class="table-wrap">
            <table class="choose-table">
              <caption class="visually-hidden">Match the system you want to protect to a service</caption>
              <thead><tr><th scope="col">If you want to protect…</th><th scope="col">Start with</th></tr></thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="expect">
        <div class="container grid grid-3">
          <article class="card"><h3 id="expect">Clear scope</h3><p>Covered systems, responsibilities, and frequencies are written into your service plan before work begins.</p></article>
          <article class="card"><h3>Setup, then management</h3><p>Initial setup establishes the baseline. Ongoing management keeps it current as your business changes.</p></article>
          <article class="card"><h3>Realistic expectations</h3><p>Our services reduce risk and improve readiness. No provider can promise complete protection, and we will not.</p></article>
        </div>
      </section>

      <section class="section section-muted">
        <div class="container cta-panel reveal">
          <h2>Not sure which services you need?</h2>
          <p>A security assessment reviews your current setup across these areas and recommends where to start.</p>
          <div class="hero-actions">
            <a class="cta cta-primary" href="security-assessment.html">Request a Security Assessment</a>
            <a class="cta cta-secondary" href="contact.html">Book a Consultation</a>
          </div>
        </div>
      </section>`;
  return layout({
    title: 'Services',
    description: 'Security services for small and medium-sized businesses: accounts, devices, websites, backups, training, and monitoring.',
    active: 'services.html',
    body
  });
}

writeFileSync(join(root, 'services.html'), overviewPage());
for (const s of services) writeFileSync(join(root, s.slug), servicePage(s));
console.log(`Generated services.html and ${services.length} service pages.`);
