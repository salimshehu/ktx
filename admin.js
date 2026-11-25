const API_BASE = '/api/admin';

let cachedInquiries = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadPublicConfig();
  await checkSession();

  document.getElementById('admin-login-box')?.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('refresh-admin-btn')?.addEventListener('click', loadDashboard);
  document.getElementById('filter-division')?.addEventListener('change', renderInquiries);
  document.getElementById('telemetry-form')?.addEventListener('submit', handleTelemetrySubmit);
});

async function loadPublicConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (res.ok) {
      const cfg = await res.json();
      const link = document.getElementById('back-to-site-btn');
      if (link && cfg.publicUrl) link.href = cfg.publicUrl;
    }
  } catch {
    // ignore
  }
}

async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/session`, { credentials: 'same-origin' });
    if (res.ok) {
      showDashboard();
      await loadDashboard();
      return;
    }
  } catch {
    // ignore
  }
  showLogin();
}

function showLogin() {
  document.getElementById('admin-login-box').style.display = 'grid';
  document.getElementById('admin-dashboard').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('refresh-admin-btn').style.display = 'none';
}

function showDashboard() {
  document.getElementById('admin-login-box').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline-flex';
  document.getElementById('refresh-admin-btn').style.display = 'inline-flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const feedback = document.getElementById('login-feedback');

  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    feedback.classList.remove('is-visible');
    showDashboard();
    await loadDashboard();
  } else {
    feedback.textContent = 'Invalid admin credentials.';
    feedback.classList.add('is-visible');
  }
}

async function handleLogout() {
  await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'same-origin' });
  showLogin();
}

async function loadDashboard() {
  try {
    const opts = { credentials: 'same-origin' };
    const [healthRes, divRes, inqRes, telRes, farmsRes] = await Promise.all([
      fetch(`${API_BASE}/health`, opts),
      fetch(`${API_BASE}/divisions`, opts),
      fetch(`${API_BASE}/inquiries`, opts),
      fetch(`${API_BASE}/telemetry`, opts),
      fetch(`${API_BASE}/farms`, opts),
    ]);

    if (healthRes.status === 401) {
      showLogin();
      return;
    }

    const health = await healthRes.json();
    const divData = await divRes.json();
    const inqData = await inqRes.json();
    const telData = await telRes.json();
    const farmsData = await farmsRes.json();

    document.getElementById('admin-pg-badge').textContent = `${health.engine.toUpperCase()} // ${health.database}`;
    document.getElementById('stat-engine').textContent = 'PostgreSQL 16';
    document.getElementById('stat-divisions').textContent = (divData.divisions || []).length;

    cachedInquiries = inqData.inquiries || [];
    document.getElementById('stat-inquiries').textContent = cachedInquiries.length;
    renderInquiries();

    const logs = telData.logs || [];
    document.getElementById('stat-telemetry').textContent = logs.length;
    renderTelemetry(logs);

    renderFarms(farmsData.farms || []);
  } catch {
    document.getElementById('admin-pg-badge').textContent = 'API Offline';
  }
}

function renderFarms(farms) {
  const tbody = document.getElementById('farms-tbody');
  const badge = document.getElementById('stat-farms-badge');
  if (badge) badge.textContent = `${farms.length} Farms`;
  if (!tbody) return;

  if (!farms.length) {
    tbody.innerHTML = '<tr><td colspan="5">No farms registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = farms
    .map(
      (f) => `
      <tr>
        <td>#${f.id}</td>
        <td><strong>${escapeHtml(f.farmer_name)}</strong><br /><small>${escapeHtml(f.contact)}</small></td>
        <td><strong>${escapeHtml(f.farm_name)}</strong><br /><small>${escapeHtml(f.crop_type)}</small></td>
        <td>${f.area_hectares} ha (${(f.coordinates || []).length} GPS pts)</td>
        <td><span class="badge-tag">${escapeHtml(f.plan_tier.toUpperCase())}</span></td>
      </tr>`
    )
    .join('');
}

function renderInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  const filter = document.getElementById('filter-division')?.value || 'ALL';
  if (!tbody) return;

  const filtered = filter === 'ALL' ? cachedInquiries : cachedInquiries.filter((item) => item.division === filter);

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5">No inquiries found for this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (row) => `
      <tr>
        <td>#${row.id}</td>
        <td>
          <strong>${escapeHtml(row.name)}</strong><br />
          <span>${escapeHtml(row.organization)}</span><br />
          <small>${escapeHtml(row.email)}</small>
        </td>
        <td><span class="badge-tag">${escapeHtml(row.division)}</span></td>
        <td>${escapeHtml(row.message)}</td>
        <td><button class="btn-sm" type="button" onclick="deleteInquiry(${row.id})">Resolve</button></td>
      </tr>`
    )
    .join('');
}

function renderTelemetry(logs) {
  const tbody = document.getElementById('telemetry-tbody');
  if (!tbody) return;

  tbody.innerHTML = logs
    .map(
      (log) => `
      <tr>
        <td><strong>${escapeHtml(log.node_id)}</strong></td>
        <td>${escapeHtml(log.metric_name)}</td>
        <td><code>${escapeHtml(log.metric_value)}</code></td>
      </tr>`
    )
    .join('');
}

async function handleTelemetrySubmit(e) {
  e.preventDefault();
  const node_id = document.getElementById('tel-node').value.trim();
  const division = document.getElementById('tel-division').value;
  const metric_name = document.getElementById('tel-metric').value.trim();
  const metric_value = document.getElementById('tel-value').value.trim();

  if (!node_id || !metric_name || !metric_value) return;

  const res = await fetch(`${API_BASE}/telemetry`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id, division, metric_name, metric_value }),
  });

  if (res.ok) {
    e.target.reset();
    await loadDashboard();
  }
}

window.deleteInquiry = async function deleteInquiry(id) {
  const res = await fetch(`${API_BASE}/inquiries/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  if (res.ok) await loadDashboard();
};

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
