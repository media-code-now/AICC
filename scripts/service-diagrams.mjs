// Original service illustrations; educational flows, not live monitoring data.
const diagrams = {
  'email-account-security.html': {
    title: 'Email attack path & review points',
    steps: [['Suspicious message', 'Review sender and link signals'], ['Sign-in attempt', 'Apply MFA and access policies'], ['Mailbox access', 'Review forwarding and permissions']],
    note: 'Example attack path. Layered controls reduce exposure; they do not block every attack.'
  },
  'endpoint-device-security.html': {
    title: 'From device inventory to response',
    steps: [['Know each device', 'Inventory owners and software'], ['Set a baseline', 'Review updates and protection'], ['Handle alerts', 'Follow an agreed response plan']],
    note: 'Example workflow for covered devices. Response actions depend on agreed responsibilities.'
  },
  'website-ecommerce-security.html': {
    title: 'Website security review layers',
    steps: [['Access', 'Review administrator permissions'], ['Platform', 'Check extensions and updates'], ['Data & checkout', 'Review integrations and exposure']],
    note: 'Example review layers, not a penetration test or compliance certification.'
  },
  'backup-recovery.html': {
    title: 'A backup is only part of recovery',
    steps: [['Identify data', 'Prioritize essential information'], ['Review copies', 'Check coverage and retention'], ['Test restoration', 'Record results and next steps']],
    note: 'Example recovery workflow. Recovery time and success depend on the systems and test results.'
  },
  'employee-security-training.html': {
    title: 'Pause. Verify. Report.',
    steps: [['Pause', 'Notice unexpected requests'], ['Verify', 'Use a known contact channel'], ['Report', 'Follow your reporting procedure']],
    note: 'Example learning flow. Report suspicious messages without opening their links or attachments.'
  },
  'managed-security-monitoring.html': {
    title: 'From an alert to an agreed action',
    steps: [['Covered signals', 'Collect agreed alert sources'], ['Review context', 'Triage and prioritize findings'], ['Coordinate action', 'Escalate to the agreed owner']],
    note: 'Illustrative workflow, not live telemetry. Monitoring coverage is defined in your service plan.'
  }
};

const icons = [
  '<rect x="5" y="5" width="22" height="22" rx="5"/><path d="M11 12h10M11 17h10M11 22h6"/>',
  '<path d="M16 3 27 8v8c0 6-6 11-11 13C11 27 5 22 5 16V8Z"/><path d="m11 16 3 3 7-7"/>',
  '<circle cx="16" cy="16" r="12"/><path d="M10 16h12m-5-5 5 5-5 5"/>'
];

export function serviceDiagram(slug, compact = false) {
  const { title, steps, note } = diagrams[slug];
  return `<figure class="service-diagram${compact ? ' service-diagram-compact' : ''}">
    <figcaption><span class="diagram-label">Service illustration</span><strong>${title}</strong></figcaption>
    <ol class="diagram-flow" aria-label="${title}">
      ${steps.map(([label, detail], i) => `<li><span class="diagram-icon" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false">${icons[i]}</svg></span><strong>${label}</strong><span>${detail}</span></li>`).join('\n      ')}
    </ol>
    <p class="diagram-note">${note}</p>
  </figure>`;
}