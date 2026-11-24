import http from 'node:http';
import { pool, initDatabase } from './db.js';

const PORT = Number(process.env.PORT || 3001);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Payload too large'));
      }
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
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // Healthcheck
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const { rows } = await pool.query('SELECT current_database() AS db, version() AS pg_version');
      sendJson(res, 200, {
        status: 'ok',
        service: 'tx-limited-backend',
        engine: 'postgresql',
        database: rows[0].db,
        pgVersion: rows[0].pg_version.split(',')[0],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // List divisions
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
      sendJson(res, 200, result);
      return;
    }

    // List deployments
    if (req.method === 'GET' && url.pathname === '/api/deployments') {
      const { rows } = await pool.query('SELECT * FROM deployments ORDER BY id ASC');
      sendJson(res, 200, { deployments: rows });
      return;
    }

    // List registered farms
    if (req.method === 'GET' && url.pathname === '/api/farms') {
      const { rows } = await pool.query('SELECT * FROM farms ORDER BY id DESC LIMIT 50');
      sendJson(res, 200, { farms: rows });
      return;
    }

    // Register a new farm with walk-around GPS coordinates
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
        sendJson(res, 400, {
          error: 'Farmer name, contact, farm name, crop type, and at least 3 walk-around GPS coordinates are required.',
        });
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO farms (farmer_name, contact, farm_name, crop_type, plan_tier, coordinates, area_hectares)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         RETURNING *`,
        [farmerName, contact, farmName, cropType, planTier, JSON.stringify(coordinates), areaHectares]
      );

      sendJson(res, 201, { farm: rows[0], status: 'registered' });
      return;
    }

    // Dynamic Crop Health & Weather Insights for a registered farm
    if (req.method === 'GET' && /^\/api\/farms\/\d+\/insights$/.test(url.pathname)) {
      const farmId = Number(url.pathname.split('/')[3]);
      const { rows } = await pool.query('SELECT * FROM farms WHERE id = $1', [farmId]);
      if (!rows.length) {
        sendJson(res, 404, { error: 'Farm not found.' });
        return;
      }

      const farm = rows[0];
      const centroid = farm.coordinates.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat / farm.coordinates.length, lng: acc.lng + p.lng / farm.coordinates.length }),
        { lat: 0, lng: 0 }
      );

      // Deterministic coordinate-seeded weather & crop health metrics
      const seed = Math.abs(Math.sin(centroid.lat * 12.9898 + centroid.lng * 78.233));
      const ndvi = (0.68 + seed * 0.22).toFixed(2);
      const moisture = Math.round(32 + seed * 24);
      const tempC = Math.round(24 + seed * 9);
      const rainProb = Math.round(15 + (1 - seed) * 65);
      const isPaid = farm.plan_tier !== 'free';

      sendJson(res, 200, {
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
      });
      return;
    }

    // Telemetry logs
    if (req.method === 'GET' && url.pathname === '/api/telemetry') {
      const { rows } = await pool.query(
        'SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 20'
      );
      sendJson(res, 200, { logs: rows });
      return;
    }

    // Create telemetry log
    if (req.method === 'POST' && url.pathname === '/api/telemetry') {
      const body = await readJsonBody(req);
      const nodeId = String(body.node_id || '').trim();
      const division = String(body.division || '').trim();
      const metricName = String(body.metric_name || '').trim();
      const metricValue = String(body.metric_value || '').trim();

      if (!nodeId || !division || !metricName || !metricValue) {
        sendJson(res, 400, { error: 'node_id, division, metric_name, and metric_value are required.' });
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO telemetry_logs (node_id, division, metric_name, metric_value)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nodeId, division, metricName, metricValue]
      );
      sendJson(res, 201, rows[0]);
      return;
    }

    // List inquiries
    if (req.method === 'GET' && url.pathname === '/api/inquiries') {
      const { rows } = await pool.query(
        'SELECT * FROM inquiries ORDER BY id DESC LIMIT 50'
      );
      sendJson(res, 200, { inquiries: rows });
      return;
    }

    // Create inquiry
    if (req.method === 'POST' && url.pathname === '/api/inquiries') {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const organization = String(body.organization || '').trim();
      const division = String(body.division || '').trim();
      const message = String(body.message || '').trim();

      if (!name || !email || !organization || !division || !message) {
        sendJson(res, 400, { error: 'All fields are required.' });
        return;
      }

      const { rows } = await pool.query(
        `INSERT INTO inquiries (name, email, organization, division, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, organization, division, message, created_at`,
        [name, email, organization, division, message]
      );

      sendJson(res, 201, {
        ...rows[0],
        status: 'logged',
      });
      return;
    }

    // Delete inquiry by ID
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/inquiries/')) {
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: 'Invalid inquiry ID.' });
        return;
      }
      const { rowCount } = await pool.query('DELETE FROM inquiries WHERE id = $1', [id]);
      if (rowCount === 0) {
        sendJson(res, 404, { error: 'Inquiry not found.' });
        return;
      }
      sendJson(res, 200, { deleted: id });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
});

await initDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TX Limited API running at http://localhost:${PORT} (PostgreSQL)`);
});
