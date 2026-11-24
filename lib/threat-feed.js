const fs = require('node:fs/promises');
const { validateFeed, STALE_AFTER_MS } = require('./threat-feed-schema');

// The path is operator-controlled only. Never accept a filename or URL from requests.
function createThreatFeed({ filePath = process.env.THREAT_FEED_FILE, now = Date.now, cacheMs = 30000 } = {}) {
  let lastGood = null;
  let lastSuccessfulAt = null;
  let checkedAt = null;
  let checkedMs = -Infinity;
  let unavailable = false;
  let pending;
  async function load() {
    let file;
    try {
      file = await fs.open(filePath, 'r');
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 512 * 1024) throw new Error('Invalid feed file');
      const buffer = Buffer.alloc(512 * 1024 + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > 512 * 1024) throw new Error('Feed too large');
      lastGood = validateFeed(JSON.parse(buffer.subarray(0, length).toString('utf8')), now());
      lastSuccessfulAt = new Date(now()).toISOString();
      unavailable = false;
    } catch {
      unavailable = true; // Do not expose paths, parser errors, credentials or private fields.
    } finally {
      try { await file?.close(); } catch { unavailable = true; }
      checkedMs = now();
      checkedAt = new Date(checkedMs).toISOString();
    }
  }
  return {
    async read() {
      if (!filePath) return { status: 'unconfigured', checkedAt: new Date(now()).toISOString(), lastSuccessfulAt: null, staleAfterSeconds: STALE_AFTER_MS / 1000, feed: null };
      if (now() < checkedMs || now() - checkedMs >= cacheMs) {
        pending ||= load().finally(() => { pending = null; });
        await pending;
      }
      return { status: unavailable ? 'offline' : now() - Date.parse(lastGood.generatedAt) > STALE_AFTER_MS ? 'stale' : 'current',
        checkedAt, lastSuccessfulAt, staleAfterSeconds: STALE_AFTER_MS / 1000, feed: lastGood };
    }
  };
}
module.exports = { createThreatFeed };