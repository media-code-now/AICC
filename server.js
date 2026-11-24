const http = require('http');
const fs = require('fs');
const path = require('path');

const { validateAssessment } = require('./lib/assessment-validation');
const { validateContact } = require('./lib/contact-validation');
const { createThreatFeed } = require('./lib/threat-feed');
const threatFeed = createThreatFeed();

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const MAX_BODY = 16 * 1024;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map();

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

function handleForm(req, res, validate, fileName) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }
  if (!(req.headers['content-type'] || '').includes('application/json')) {
    return sendJson(res, 415, { ok: false, message: 'Unsupported content type.' });
  }
  const ip = req.socket.remoteAddress || 'unknown';
  if (rateLimited(`${fileName}:${ip}`)) {
    return sendJson(res, 429, { ok: false, message: 'Too many requests. Please wait a few minutes and try again.' });
  }

  let size = 0;
  const chunks = [];
  let aborted = false;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, { ok: false, message: 'Request is too large.' });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (aborted) return;
    let input;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return sendJson(res, 400, { ok: false, message: 'Invalid request.' });
    }
    if (!input || typeof input !== 'object') {
      return sendJson(res, 400, { ok: false, message: 'Invalid request.' });
    }

    const result = validate(input);
    if (result.spam) {
      return sendJson(res, 400, {
        ok: false,
        message: 'Your request could not be processed. Please reload the page and try again.'
      });
    }
    if (!result.valid) {
      return sendJson(res, 422, { ok: false, errors: result.errors });
    }

    const record = { receivedAt: new Date().toISOString(), ...result.data };
    fs.mkdir(dataDir, { recursive: true }, (mkErr) => {
      if (mkErr) return sendJson(res, 500, { ok: false, message: 'Sorry, your request could not be saved. Please try again later.' });
      fs.appendFile(path.join(dataDir, fileName), JSON.stringify(record) + '\n', { mode: 0o600 }, (err) => {
        if (err) {
          console.error(`Failed to store ${fileName}:`, err.message);
          return sendJson(res, 500, { ok: false, message: 'Sorry, your request could not be saved. Please try again later.' });
        }
        sendJson(res, 200, { ok: true });
      });
    });
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const fullPath = path.normalize(path.join(root, requested));
  if (!fullPath.startsWith(root + path.sep)) {
    return null;
  }
  const rel = path.relative(root, fullPath);
  const isPublicPage = !rel.includes(path.sep) && rel.endsWith('.html');
  const isAsset = rel.startsWith('assets' + path.sep);
  if (!isPublicPage && !isAsset) {
    return undefined;
  }
  return fullPath;
}

const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const pathname = (req.url || '').split('?')[0];
  if (pathname === '/api/threat-map') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { message: 'Method not allowed.' });
    }
    return threatFeed.read().then(data => sendJson(res, 200, data)).catch(() => sendJson(res, 503, { message: 'Threat feed unavailable.' }));
  }
  if (pathname === '/api/assessment') {
    return handleForm(req, res, validateAssessment, 'assessment-requests.jsonl');
  }
  if (pathname === '/api/contact') {
    return handleForm(req, res, validateContact, 'contact-inquiries.jsonl');
  }

  let filePath;
  try {
    filePath = resolvePath(req.url || '/');
  } catch {
    filePath = null;
  }

  if (filePath === null) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }
  if (filePath === undefined) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.end('<h1>404</h1><p>Page not found.</p>');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.end('<h1>404</h1><p>Page not found.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal server error');
    });
    readStream.pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
