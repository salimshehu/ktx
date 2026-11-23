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
