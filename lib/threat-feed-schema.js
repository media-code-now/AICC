// Shared by server, browser bundle and tests. Only explicitly public fields survive.
const STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_RECORDS = 200;
const CATEGORIES = ['malware', 'phishing', 'bot', 'malicious-infrastructure'];
const PRIORITIES = ['unknown', 'low', 'medium', 'high'];

function text(value, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) throw new Error('Invalid text field');
  return value.trim();
}
function timestamp(value, now) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) > now + 60000) throw new Error('Invalid UTC timestamp');
  return new Date(value).toISOString();
}
function safeURL(value) {
  const url = new URL(text(value, 500));
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid source URL');
  return url.href;
}
function validateFeed(input, now = Date.now()) {
  if (!input || input.version !== 1 || input.publicDisplayApproved !== true) throw new Error('Public display approval required');
  const generatedAt = timestamp(input.generatedAt, now);
  if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 20) throw new Error('Invalid sources');
  const sourceIds = new Set();
  const sources = input.sources.map(source => {
    const id = text(source.id, 60);
    if (sourceIds.has(id)) throw new Error('Duplicate source');
    sourceIds.add(id);
    return { id, name: text(source.name), url: safeURL(source.url), attribution: text(source.attribution, 500), license: text(source.license, 300) };
  });
  if (!Array.isArray(input.records) || input.records.length > MAX_RECORDS) throw new Error('Too many records');
  const recordIds = new Set();
  const records = input.records.map(record => {
    const id = text(record.id, 80);
    if (recordIds.has(id)) throw new Error('Duplicate record');
    recordIds.add(id);
    if (!sourceIds.has(record.sourceId) || !CATEGORIES.includes(record.category) || !PRIORITIES.includes(record.priority)) throw new Error('Invalid classification');
    let location = null;
    if (record.location !== null) {
      const point = record.location;
      if (!point || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) throw new Error('Invalid location');
      location = { latitude: point.latitude, longitude: point.longitude, label: text(point.label) };
    }
    const observedAt = timestamp(record.observedAt, now);
    if (Date.parse(observedAt) > Date.parse(generatedAt) + 60000) throw new Error('Observation newer than snapshot');
    return { id, sourceId: record.sourceId, title: text(record.title), category: record.category, priority: record.priority,
      observedAt, location, summary: text(record.summary, 600) };
  });
  return { version: 1, publicDisplayApproved: true, generatedAt, sources, records };
}
module.exports = { validateFeed, STALE_AFTER_MS, MAX_RECORDS, CATEGORIES, PRIORITIES };