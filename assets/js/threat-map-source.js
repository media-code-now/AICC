import schema from '../../lib/threat-feed-schema.js';
const { validateFeed, STALE_AFTER_MS } = schema;
const $ = id => document.getElementById(`tm-${id}`);
const categories = { malware: 'Malware', phishing: 'Phishing', bot: 'Bot activity', 'malicious-infrastructure': 'Malicious infrastructure' };
const state = { mode: 'feed', status: 'loading', feed: null, checkedAt: null, lastSuccessfulAt: null, selected: null, limit: 20, busy: false };
let controller;
let epoch = 0;
let savedFeedState;
let visibleKey = '';

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function timeNode(value) {
  if (!value) return el('span', 'Not available');
  const node = el('time', new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'));
  node.dateTime = value;
  return node;
}
function externalLink(source) {
  if (state.mode === 'demo') return el('span', source.name);
  const node = el('a', source.name);
  node.href = source.url; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}
function freshness() {
  if (state.mode === 'demo') return 'demo';
  if (!navigator.onLine || state.status === 'offline') return 'offline';
  if (state.feed && Date.now() - Date.parse(state.feed.generatedAt) > STALE_AFTER_MS) return 'stale';
  return state.status;
}
function statusView() {
  const status = freshness();
  const labels = { loading: 'Checking feed', unconfigured: 'Not connected', current: 'Current snapshot', stale: 'Stale snapshot', offline: 'Offline / unavailable', demo: 'Demo — fictional data' };
  const messages = {
    loading: 'Checking the server for an approved source. No new data has been confirmed.',
    unconfigured: 'No threat feed is connected. Try the clearly labelled demo to explore the map and filters.',
    current: 'An approved snapshot is available. Observations are source-reported indicators, not live attack traffic.',
    stale: 'This snapshot is older than 15 minutes. Check the source timestamps before relying on these observations.',
    offline: state.feed ? 'The feed cannot be reached or validated. Showing the last available snapshot, not current data.' : 'The feed cannot be reached or validated. No observations are available. Retry when the connection returns.',
    demo: 'You are exploring fictional sample observations. Demo mode never represents a connected feed.'
  };
  $('state').dataset.state = status;
  $('state').textContent = labels[status];
  if ($('status').textContent !== messages[status]) $('status').textContent = messages[status];
  $('demo-banner').hidden = state.mode !== 'demo';
  $('refresh').disabled = state.busy || state.mode === 'demo' || !navigator.onLine;
  $('refresh').textContent = state.busy ? 'Checking…' : 'Refresh feed';
  $('demo').disabled = false;
  $('demo').textContent = state.mode === 'demo' ? 'Exit demo' : 'Try demo data';
  $('generated').replaceChildren(timeNode(state.feed?.generatedAt));
  $('checked').replaceChildren(timeNode(state.mode === 'demo' ? null : state.checkedAt));
  $('success').replaceChildren(timeNode(state.mode === 'demo' ? null : state.lastSuccessfulAt));
}
function filtered() {
  const hours = $('window').value;
  const query = $('search').value.trim().toLowerCase();
  return (state.feed?.records || []).filter(record =>
    (hours === 'all' || Date.now() - Date.parse(record.observedAt) <= Number(hours) * 3600000) &&
    ($('category').value === 'all' || record.category === $('category').value) &&
    ($('priority').value === 'all' || record.priority === $('priority').value) &&
    ($('source').value === 'all' || `source:${record.sourceId}` === $('source').value) &&
    (!query || `${record.title} ${record.location?.label || ''}`.toLowerCase().includes(query))
  ).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id));
}
function renderDetail() {
  const record = state.feed?.records.find(item => item.id === state.selected);
  const detail = $('detail');
  detail.replaceChildren();
  if (!record) { detail.append(el('p', 'Select an observation to see its source, time and reported context.')); return; }
  const source = state.feed.sources.find(item => item.id === record.sourceId);
  detail.append(el('h3', record.title), el('p', record.summary));
  if (state.mode === 'demo') detail.append(el('p', 'Fictional demo observation.'));
  const list = el('dl');
  for (const [name, value] of [
    ['Reported at (UTC)', timeNode(record.observedAt)], ['Category', el('span', categories[record.category])],
    ['Source priority', el('span', record.priority)], ['Approximate location', el('span', record.location?.label || 'Location unavailable')],
    ['Source', externalLink(source)], ['Attribution', el('span', source.attribution)]
  ]) {
    const row = el('div'), dd = el('dd'); dd.append(value); row.append(el('dt', name), dd); list.append(row);
  }
  detail.append(list);
}
function selectRecord(id) {
  state.selected = id;
  for (const button of $('records').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === id));
  for (const point of $('markers').children) point.classList.toggle('is-selected', point.dataset.id === id);
  renderDetail();
}
function renderResults() {
  const records = filtered();
  visibleKey = JSON.stringify(records.map(record => record.id));
  if (!records.some(record => record.id === state.selected)) state.selected = null;
  const mapped = records.filter(record => record.location);
  const count = `${records.length} of ${state.feed?.records.length || 0} observations · ${mapped.length} mapped · ${records.length - mapped.length} without coordinates`;
  if ($('count').textContent !== count) $('count').textContent = count;
  $('markers').replaceChildren();
  for (const record of mapped) {
    const marker = el('span', undefined, 'tm-marker');
    marker.dataset.id = record.id; marker.dataset.priority = record.priority;
    marker.classList.toggle('is-selected', record.id === state.selected);
    marker.style.left = `${(record.location.longitude + 180) / 360 * 100}%`;
    marker.style.top = `${(90 - record.location.latitude) / 180 * 100}%`;
    $('markers').append(marker);
  }
  let empty = 'No observations match these filters.';
  if (!state.feed) empty = freshness() === 'offline' ? 'Feed unavailable. No observations to display.' : 'No feed connected. Connect an approved source or try demo data.';
  else if (!state.feed.records.length) empty = 'The source returned an empty snapshot. This does not mean there are no threats.';
  $('map-empty').hidden = mapped.length > 0;
  $('map-empty').textContent = records.length && !mapped.length ? 'These observations have no coordinates. Read their details below.' : empty;
  $('list-empty').hidden = records.length > 0;
  $('list-empty').textContent = empty;
  $('records').replaceChildren();
  for (const record of records.slice(0, state.limit)) {
    const item = el('li'), button = el('button', undefined, 'tm-record');
    button.type = 'button'; button.dataset.id = record.id;
    button.setAttribute('aria-pressed', String(record.id === state.selected));
    button.setAttribute('aria-controls', 'tm-detail');
    const source = state.feed.sources.find(item => item.id === record.sourceId);
    button.append(el('span', `${categories[record.category]} · ${record.priority}`, 'tm-record-priority'), el('strong', record.title));
    button.append(el('span', `${record.location?.label || 'Location unavailable'} · ${source.name}`, 'tm-record-meta'));
    const time = timeNode(record.observedAt); time.className = 'tm-record-meta'; button.append(time);
    button.addEventListener('click', () => selectRecord(record.id));
    item.append(button); $('records').append(item);
  }
  $('more').hidden = records.length <= state.limit;
  renderDetail(); statusView();
}
function renderSources() {
  const selected = $('source').value;
  $('source').replaceChildren(new Option('All sources', 'all'));
  $('sources').replaceChildren();
  for (const source of state.feed?.sources || []) {
    $('source').add(new Option(source.name, `source:${source.id}`));
    const block = el('article', undefined, 'tm-source');
    const heading = el('h3'); heading.append(externalLink(source));
    block.append(heading, el('p', source.attribution), el('p', `Display terms: ${source.license}`));
    $('sources').append(block);
  }
  if (![...$('source').options].some(option => option.value === selected)) $('source').value = 'all';
  else $('source').value = selected;
  if (!state.feed) $('sources').append(el('p', 'No threat source connected.'));
}
function validEnvelope(payload) {
  if (!payload || !['unconfigured', 'offline', 'stale', 'current'].includes(payload.status)) throw new Error('Invalid feed status');
  for (const key of ['checkedAt', 'lastSuccessfulAt']) {
    if (payload[key] !== null && (typeof payload[key] !== 'string' || !Number.isFinite(Date.parse(payload[key])))) throw new Error('Invalid check timestamp');
  }
  const feed = payload.feed === null ? null : validateFeed(payload.feed);
  if (['stale', 'current'].includes(payload.status) && !feed) throw new Error('Missing snapshot');
  if (payload.status === 'unconfigured' && feed) throw new Error('Unexpected snapshot');
  return { ...payload, feed };
}
async function refresh() {
  if (state.mode === 'demo' || state.busy) return;
  if (!navigator.onLine) { state.status = 'offline'; statusView(); return; }
  const token = ++epoch;
  controller = new AbortController();
  const request = controller;
  const timeout = setTimeout(() => request.abort(), 8000);
  state.busy = true; statusView();
  try {
    const response = await fetch('/api/threat-map', { signal: request.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Feed unavailable');
    const data = validEnvelope(await response.json());
    if (token !== epoch || state.mode !== 'feed') return;
    state.status = data.status; state.checkedAt = data.checkedAt;
    state.lastSuccessfulAt = data.lastSuccessfulAt || state.lastSuccessfulAt;
    if (data.status === 'unconfigured') { state.feed = null; state.lastSuccessfulAt = null; }
    else if (data.feed) state.feed = data.feed;
    renderSources(); renderResults();
  } catch {
    if (token === epoch && state.mode === 'feed') { state.status = 'offline'; renderResults(); }
  } finally {
    clearTimeout(timeout);
    if (token === epoch) { state.busy = false; statusView(); }
  }
}
function demoFeed() {
  const now = Date.now();
  return validateFeed({ version: 1, publicDisplayApproved: true, generatedAt: new Date(now).toISOString(),
    sources: [
      { id: 'demo-lab', name: 'Demo research lab (fictional)', url: 'https://example.org/', attribution: 'Synthetic records created for this interface. Not a real intelligence provider.', license: 'Illustration only; no operational use.' },
      { id: 'demo-sensor', name: 'Demo sensor (fictional)', url: 'https://example.org/', attribution: 'Fictional sensor observations. No traffic was collected.', license: 'Illustration only; no operational use.' }
    ], records: [
      ['Example phishing infrastructure', 'phishing', 'medium', 0.25, [51.51, -0.13, 'London, United Kingdom']],
      ['Example bot indicator', 'bot', 'low', 0.6, [40.71, -74.01, 'New York, United States']],
      ['Example malware infrastructure', 'malware', 'high', 2, [1.35, 103.82, 'Singapore']],
      ['Example reported hosting indicator', 'malicious-infrastructure', 'unknown', 6, [-23.55, -46.63, 'São Paulo, Brazil']],
      ['Example phishing indicator', 'phishing', 'high', 12, [-33.92, 18.42, 'Cape Town, South Africa']],
      ['Example bot observation', 'bot', 'medium', 30, [35.68, 139.69, 'Tokyo, Japan']],
      ['Example archived malware indicator', 'malware', 'low', 96, [-33.87, 151.21, 'Sydney, Australia']],
      ['Example indicator without location', 'malicious-infrastructure', 'unknown', 4, null]
    ].map(([title, category, priority, hours, point], i) => ({ id: `demo-${i}`, sourceId: i % 2 ? 'demo-sensor' : 'demo-lab', title, category, priority,
      observedAt: new Date(now - hours * 3600000).toISOString(), location: point ? { latitude: point[0], longitude: point[1], label: point[2] } : null,
      summary: 'Fictional observation for testing this interface. The location is not evidence of an attacker or a real incident.' })) });
}
$('demo').addEventListener('click', () => {
  epoch++; controller?.abort();
  state.busy = false; state.selected = null; state.limit = 20;
  if (state.mode === 'feed') {
    savedFeedState = { feed: state.feed, status: state.status, checkedAt: state.checkedAt, lastSuccessfulAt: state.lastSuccessfulAt };
    state.mode = 'demo'; state.feed = demoFeed(); state.status = 'demo';
  } else {
    Object.assign(state, savedFeedState);
    state.mode = 'feed';
  }
  $('filters').reset(); renderSources(); renderResults();
  if (state.mode === 'feed') refresh();
});
$('refresh').addEventListener('click', refresh);
$('filters').addEventListener('submit', event => event.preventDefault());
$('filters').addEventListener('input', () => { state.limit = 20; renderResults(); });
$('filters').addEventListener('reset', () => { state.limit = 20; setTimeout(renderResults, 0); });
$('more').addEventListener('click', () => { state.limit += 20; renderResults(); });
window.addEventListener('offline', () => { if (state.mode === 'feed') { epoch++; controller?.abort(); state.busy = false; state.status = 'offline'; renderResults(); } });
window.addEventListener('online', () => { if (state.mode === 'feed') refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.mode === 'feed') refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 60000);
setInterval(() => {
  if (!document.hidden) {
    statusView();
    if (visibleKey !== JSON.stringify(filtered().map(record => record.id))) renderResults();
  }
}, 15000);
window.addEventListener('pagehide', () => { epoch++; controller?.abort(); state.busy = false; });
window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
statusView(); refresh();