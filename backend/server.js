import http from 'node:http';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, initDatabase } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DOMAIN = (process.env.PUBLIC_DOMAIN || 'localhost').toLowerCase();
const ADMIN_DOMAIN = (process.env.ADMIN_DOMAIN || 'admin.localhost').toLowerCase();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tx_admin_pass';
const SESSION_SECRET = process.env.SESSION_SECRET || 'tx-dev-session-secret-change-me';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function parseHostHeader(hostHeader = '') {
  return hostHeader.split(':')[0].trim().toLowerCase();
}

function classifyHost(hostname) {
  if (hostname === ADMIN_DOMAIN || hostname.startsWith('admin.')) {
    return 'admin';
  }
  if (hostname === PUBLIC_DOMAIN || hostname === '127.0.0.1') {
    return 'public';
  }
  return 'unknown';
}

function isOriginAllowed(origin, expectedHostname) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.hostname.toLowerCase() === expectedHostname;
  } catch {
    return false;
  }
}

function checkCsrfOrigin(req, expectedHostname) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin) {
    return isOriginAllowed(origin, expectedHostname);
  }
  if (referer) {
    return isOriginAllowed(referer, expectedHostname);
  }
  return true;
}

function parseCookies(cookieHeader = '') {
  const out = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function signSessionToken(username) {
  const payload = Buffer.from(
    JSON.stringify({ user: username, exp: Date.now() + 1000 * 60 * 60 * 8 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function buildSecurityHeaders(hostType, req) {
  const headers = {};
  const origin = req.headers.origin;

  if (hostType === 'admin') {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
    if (origin && isOriginAllowed(origin, ADMIN_DOMAIN)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }
  } else if (hostType === 'public') {
    if (origin && (isOriginAllowed(origin, PUBLIC_DOMAIN) || isOriginAllowed(origin, '127.0.0.1'))) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Vary'] = 'Origin';
    }
  }

  headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type';
  return headers;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

async function sendStaticFile(res, relativePath, statusCode = 200, extraHeaders = {}) {
  const fullPath = join(ROOT_DIR, relativePath);
  const ext = '.' + relativePath.split('.').pop();
  const content = await readFile(fullPath);
  res.writeHead(statusCode, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    ...extraHeaders,
  });
  res.end(content);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const hostname = parseHostHeader(req.headers.host || '');
  const hostType = classifyHost(hostname);
  const url = new URL(req.url || '/', `http://${req.headers.host || PUBLIC_DOMAIN}`);
  const secHeaders = buildSecurityHeaders(hostType, req);

  if (hostType === 'unknown') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method === 'OPTIONS') {
    if (req.headers.origin) {
      const allowed =
        hostType === 'admin'
          ? isOriginAllowed(req.headers.origin, ADMIN_DOMAIN)
          : isOriginAllowed(req.headers.origin, PUBLIC_DOMAIN) || isOriginAllowed(req.headers.origin, '127.0.0.1');
      if (!allowed) {
        sendJson(res, 403, { error: 'Origin not allowed' }, secHeaders);
        return;
      }
    }
    res.writeHead(204, secHeaders);
    res.end();
    return;
  }

  try {
    /* ======================================================================
       ADMIN SUBDOMAIN ROUTING (admin.localhost / ADMIN_DOMAIN)
       ====================================================================== */
    if (hostType === 'admin') {
      // Block public landing pages on admin subdomain
      if (url.pathname === '/index.html' || url.pathname === '/main.js') {
        sendJson(res, 404, { error: 'Not found' }, secHeaders);
        return;
      }

      // Admin static pages/assets
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin' || url.pathname === '/admin.html')) {
        await sendStaticFile(res, 'admin.html', 200, secHeaders);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/index.css') {
        await sendStaticFile(res, 'index.css', 200, secHeaders);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/admin.js') {
        await sendStaticFile(res, 'admin.js', 200, secHeaders);
        return;
      }

      // CSRF origin check for state-changing admin API requests
      if (['POST', 'DELETE', 'PUT', 'PATCH'].includes(req.method) && !checkCsrfOrigin(req, ADMIN_DOMAIN)) {
        sendJson(res, 403, { error: 'CSRF origin check failed' }, secHeaders);
        return;
      }

      // Admin Auth Endpoints
      if (req.method === 'POST' && url.pathname === '/api/admin/login') {
        const body = await readJsonBody(req);
        const username = String(body.username || '').trim();
        const password = String(body.password || '');

        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
          sendJson(res, 401, { error: 'Invalid admin credentials' }, secHeaders);
          return;
        }

        const token = signSessionToken(username);
        // Host-only cookie: NO Domain= attribute, HttpOnly, SameSite=Strict
        const cookie = `tx_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/`;
        sendJson(res, 200, { authenticated: true, user: username }, { ...secHeaders, 'Set-Cookie': cookie });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
        const cookie = 'tx_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';
        sendJson(res, 200, { authenticated: false }, { ...secHeaders, 'Set-Cookie': cookie });
        return;
      }

      const cookies = parseCookies(req.headers.cookie || '');
      const session = verifySessionToken(cookies.tx_admin_session);

      if (req.method === 'GET' && url.pathname === '/api/admin/session') {
        if (!session) {
          sendJson(res, 401, { authenticated: false }, secHeaders);
          return;
        }
        sendJson(res, 200, { authenticated: true, user: session.user }, secHeaders);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/config') {
        const portSuffix = PORT === 80 || PORT === 443 ? '' : `:${PORT}`;
        sendJson(res, 200, { publicUrl: `http://${PUBLIC_DOMAIN}${portSuffix}` }, secHeaders);
        return;
      }

      // Require authenticated admin session for all protected admin APIs
      if (url.pathname.startsWith('/api/admin/')) {
        if (!session) {
          sendJson(res, 401, { error: 'Admin authentication required' }, secHeaders);
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/health') {
          const { rows } = await pool.query('SELECT current_database() AS db, version() AS pg_version');
          sendJson(
            res,
            200,
            {
              status: 'ok',
              service: 'tx-limited-admin',
              engine: 'postgresql',
              database: rows[0].db,
              pgVersion: rows[0].pg_version.split(',')[0],
              timestamp: new Date().toISOString(),
            },
            secHeaders
          );
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/divisions') {
          const { rows } = await pool.query('SELECT slug, sys_name, sys_status FROM divisions');
          sendJson(res, 200, { divisions: rows }, secHeaders);
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/inquiries') {
          const { rows } = await pool.query('SELECT * FROM inquiries ORDER BY id DESC LIMIT 50');
          sendJson(res, 200, { inquiries: rows }, secHeaders);
          return;
        }

        if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/inquiries/')) {
          const id = Number(url.pathname.split('/').pop());
          if (!Number.isInteger(id) || id <= 0) {
            sendJson(res, 400, { error: 'Invalid inquiry ID.' }, secHeaders);
            return;
          }
          const { rowCount } = await pool.query('DELETE FROM inquiries WHERE id = $1', [id]);
          if (rowCount === 0) {
            sendJson(res, 404, { error: 'Inquiry not found.' }, secHeaders);
            return;
          }
          sendJson(res, 200, { deleted: id }, secHeaders);
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/farms') {
          const { rows } = await pool.query('SELECT * FROM farms ORDER BY id DESC LIMIT 50');
          sendJson(res, 200, { farms: rows }, secHeaders);
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/telemetry') {
          const { rows } = await pool.query('SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 20');
          sendJson(res, 200, { logs: rows }, secHeaders);
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/telemetry') {
          const body = await readJsonBody(req);
          const nodeId = String(body.node_id || '').trim();
          const division = String(body.division || '').trim();
          const metricName = String(body.metric_name || '').trim();
          const metricValue = String(body.metric_value || '').trim();

          if (!nodeId || !division || !metricName || !metricValue) {
            sendJson(res, 400, { error: 'All telemetry fields are required.' }, secHeaders);
            return;
          }
          const { rows } = await pool.query(
            `INSERT INTO telemetry_logs (node_id, division, metric_name, metric_value)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nodeId, division, metricName, metricValue]
          );
          sendJson(res, 201, rows[0], secHeaders);
          return;
        }
      }

      sendJson(res, 404, { error: 'Not found' }, secHeaders);
      return;
    }

    /* ======================================================================
       PUBLIC ROOT DOMAIN ROUTING (localhost / PUBLIC_DOMAIN)
       ====================================================================== */
    // Strict 404 for any /admin* or /api/admin* path on public domain
    if (
      url.pathname === '/admin' ||
      url.pathname.startsWith('/admin/') ||
      url.pathname === '/admin.html' ||
      url.pathname === '/admin.js' ||
      url.pathname.startsWith('/api/admin')
    ) {
      sendJson(res, 404, { error: 'Not found' }, secHeaders);
      return;
    }

    // Public static files
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      await sendStaticFile(res, 'index.html', 200, secHeaders);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/index.css') {
      await sendStaticFile(res, 'index.css', 200, secHeaders);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/main.js') {
      await sendStaticFile(res, 'main.js', 200, secHeaders);
      return;
    }

    // Public APIs
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const { rows } = await pool.query('SELECT current_database() AS db');
      sendJson(res, 200, { status: 'ok', service: 'tx-public', database: rows[0].db }, secHeaders);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/divisions') {
      const { rows } = await pool.query('SELECT * FROM divisions');
      const result = {};
      for (const r of rows) {
        result[r.slug] = {
          eyebrow: r.eyebrow,
          title: r.title,
          desc: r.description,
          bullets: r.bullets,
          sysName: r.sys_name,
          sysStatus: r.sys_status,
          kpis: r.kpis,
          stack: r.stack,
          leadRole: r.lead_role,
        };
      }
      sendJson(res, 200, result, secHeaders);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/deployments') {
      const { rows } = await pool.query('SELECT * FROM deployments ORDER BY id ASC');
      sendJson(res, 200, { deployments: rows }, secHeaders);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/farms') {
      // Public farm list excludes private farmer contact PII
      const { rows } = await pool.query(
        'SELECT id, farm_name, crop_type, plan_tier, area_hectares FROM farms ORDER BY id DESC LIMIT 50'
      );
      sendJson(res, 200, { farms: rows }, secHeaders);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/farms') {
      const body = await readJsonBody(req);
      const farmerName = String(body.farmer_name || '').trim();
      const contact = String(body.contact || '').trim();
      const farmName = String(body.farm_name || '').trim();
      const cropType = String(body.crop_type || '').trim();
      const planTier = ['free', 'pro', 'enterprise'].includes(body.plan_tier) ? body.plan_tier : 'free';
      const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];
      const areaHectares = Number(body.area_hectares || 0);

      if (!farmerName || !contact || !farmName || !cropType || coordinates.length < 3 || areaHectares <= 0) {
        sendJson(res, 400, { error: 'Farmer details and at least 3 walk-around GPS coordinates are required.' }, secHeaders);
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO farms (farmer_name, contact, farm_name, crop_type, plan_tier, coordinates, area_hectares)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         RETURNING id, farm_name, crop_type, plan_tier, area_hectares`,
        [farmerName, contact, farmName, cropType, planTier, JSON.stringify(coordinates), areaHectares]
      );
      sendJson(res, 201, { farm: rows[0], status: 'registered' }, secHeaders);
      return;
    }

    if (req.method === 'GET' && /^\/api\/farms\/\d+\/insights$/.test(url.pathname)) {
      const farmId = Number(url.pathname.split('/')[3]);
      const { rows } = await pool.query('SELECT * FROM farms WHERE id = $1', [farmId]);
      if (!rows.length) {
        sendJson(res, 404, { error: 'Farm not found.' }, secHeaders);
        return;
      }

      const farm = rows[0];
      const centroid = farm.coordinates.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat / farm.coordinates.length, lng: acc.lng + p.lng / farm.coordinates.length }),
        { lat: 0, lng: 0 }
      );
      const seed = Math.abs(Math.sin(centroid.lat * 12.9898 + centroid.lng * 78.233));
      const ndvi = (0.68 + seed * 0.22).toFixed(2);
      const moisture = Math.round(32 + seed * 24);
      const tempC = Math.round(24 + seed * 9);
      const rainProb = Math.round(15 + (1 - seed) * 65);
      const isPaid = farm.plan_tier !== 'free';

      sendJson(
        res,
        200,
        {
          farm_id: farm.id,
          farm_name: farm.farm_name,
          crop_type: farm.crop_type,
          plan_tier: farm.plan_tier,
          area_hectares: Number(farm.area_hectares),
          centroid: { lat: Number(centroid.lat.toFixed(4)), lng: Number(centroid.lng.toFixed(4)) },
          weather: {
            temperature_c: tempC,
            humidity_pct: Math.round(48 + (1 - seed) * 30),
            rain_probability_pct: rainProb,
            wind_kmh: Math.round(8 + seed * 14),
            forecast: rainProb > 50 ? 'Scattered afternoon showers expected' : 'Clear daylight · optimal spray window',
          },
          crop_health: {
            ndvi: Number(ndvi),
            status: Number(ndvi) >= 0.75 ? 'Healthy Canopy' : 'Moderate Moisture Stress',
            soil_moisture_pct: moisture,
            pest_risk: isPaid ? (seed > 0.6 ? 'Low (Monitored)' : 'Watch: Early Stem Borer Window') : 'Upgrade to Pro for Pest Alerts',
            irrigation_advisory: isPaid
              ? `Apply ${Math.max(8, Math.round(28 - moisture * 0.4))} mm drip cycle in 48h`
              : 'Basic weekly advisory (Free Tier)',
            agronomist_note: isPaid
              ? `Assigned agronomist verified ${farm.crop_type} canopy vigor at ${farm.area_hectares} ha.`
              : 'Upgrade to Pro Subscription for dedicated agronomist review & variable-rate maps.',
          },
        },
        secHeaders
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/inquiries') {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const organization = String(body.organization || '').trim();
      const division = String(body.division || '').trim();
      const message = String(body.message || '').trim();

      if (!name || !email || !organization || !division || !message) {
        sendJson(res, 400, { error: 'All fields are required.' }, secHeaders);
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO inquiries (name, email, organization, division, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, division, created_at`,
        [name, email, organization, division, message]
      );
      sendJson(res, 201, { ...rows[0], status: 'logged' }, secHeaders);
      return;
    }

    sendJson(res, 404, { error: 'Not found' }, secHeaders);
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Internal server error' }, secHeaders);
  }
});

await initDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TX Host-Routed Server running on port ${PORT}`);
  console.log(`  Public site: http://${PUBLIC_DOMAIN}:${PORT}`);
  console.log(`  Admin console: http://${ADMIN_DOMAIN}:${PORT}`);
});
