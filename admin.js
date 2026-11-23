const API_BASE = 'http://localhost:3001/api';

let cachedInquiries = [];

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

  document.getElementById('refresh-admin-btn')?.addEventListener('click', loadDashboard);
  document.getElementById('filter-division')?.addEventListener('change', renderInquiries);
  document.getElementById('telemetry-form')?.addEventListener('submit', handleTelemetrySubmit);
});

async function loadDashboard() {
  try {
    const [healthRes, divRes, inqRes, telRes] = await Promise.all([
      fetch(`${API_BASE}/health`),
      fetch(`${API_BASE}/divisions`),
      fetch(`${API_BASE}/inquiries`),
      fetch(`${API_BASE}/telemetry`),
    ]);

    const health = await healthRes.json();
    const divisions = await divRes.json();
    const inqData = await inqRes.json();
    const telData = await telRes.json();

    document.getElementById('admin-pg-badge').textContent = `${health.engine.toUpperCase()} // ${health.database}`;
    document.getElementById('stat-engine').textContent = 'PostgreSQL 16';
    document.getElementById('stat-divisions').textContent = Object.keys(divisions).length;

    cachedInquiries = inqData.inquiries || [];
    document.getElementById('stat-inquiries').textContent = cachedInquiries.length;
    renderInquiries();

    const logs = telData.logs || [];
    document.getElementById('stat-telemetry').textContent = logs.length;
    renderTelemetry(logs);
  } catch (err) {
    document.getElementById('admin-pg-badge').textContent = 'API Offline';
  }
}

function renderInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  const filter = document.getElementById('filter-division')?.value || 'ALL';
  if (!tbody) return;

  const filtered =
    filter === 'ALL'
      ? cachedInquiries
      : cachedInquiries.filter((item) => item.division === filter);

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
        <td>
          <button class="btn-sm" type="button" onclick="deleteInquiry(${row.id})">Resolve</button>
        </td>
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id, division, metric_name, metric_value }),
  });

  if (res.ok) {
    e.target.reset();
    await loadDashboard();
  }
}

window.deleteInquiry = async function deleteInquiry(id) {
  const res = await fetch(`${API_BASE}/inquiries/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadDashboard();
  }
};

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
