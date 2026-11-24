/* ==========================================================================
   TX Limited — Minimalist Unified Platform Logic (PostgreSQL-Backed)
   Platforms: farmSense (AgriTech) · Vmines (Mining) · techx (AI&ML) · Biotx (Biotech)
   ========================================================================== */

const API_BASE = 'http://localhost:3001/api';

let currentPlatform = 'agriculture';
let allDeployments = [];
let allTelemetry = [];

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initUnifiedPlatformHub();
  initFarmerHub();
  initContactForm();
  initHeroTelemetryCanvas();
});

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const nav = document.getElementById('primary-nav');
  if (!toggleBtn || !nav) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

/* Unified Minimalist 4-Platform Hub: farmSense, Vmines, techx, Biotx */
async function initUnifiedPlatformHub() {
  const tabs = document.querySelectorAll('#platforms .tab-btn');
  const jumpLinks = document.querySelectorAll('[data-jump]');
  const panel = document.getElementById('explorer-panel');
  const farmSenseHub = document.getElementById('farmsense-hub');
  const pingBtn = document.getElementById('ping-telemetry-btn');
  if (!tabs.length || !panel) return;

  let divisions = {};
  try {
    const [divRes, depRes, telRes] = await Promise.all([
      fetch(`${API_BASE}/divisions`),
      fetch(`${API_BASE}/deployments`),
      fetch(`${API_BASE}/telemetry`),
    ]);
    if (divRes.ok) divisions = await divRes.json();
    if (depRes.ok) allDeployments = (await depRes.json()).deployments || [];
    if (telRes.ok) allTelemetry = (await telRes.json()).logs || [];
  } catch {
    // API offline
  }

  const eyebrowEl = document.getElementById('exp-eyebrow');
  const titleEl = document.getElementById('exp-title');
  const descEl = document.getElementById('exp-desc');
  const listEl = document.getElementById('exp-list');
  const sysNameEl = document.getElementById('exp-sys-name');
  const sysStatusEl = document.getElementById('exp-sys-status');
  const kpisEl = document.getElementById('exp-kpis');
  const stackEl = document.getElementById('exp-stack');

  function renderTelemetry(slug) {
    const feedEl = document.getElementById('live-telemetry-feed');
    const labelEl = document.getElementById('active-telemetry-label');
    if (!feedEl) return;

    const brandMap = { agriculture: 'farmSense', mining: 'Vmines', aiml: 'techx', biotech: 'Biotx' };
    if (labelEl) labelEl.textContent = `${brandMap[slug] || 'TX'} Live Telemetry`;

    const filtered = allTelemetry.filter((t) => t.division === slug);
    const items = (filtered.length ? filtered : allTelemetry).slice(0, 4);

    if (!items.length) {
      feedEl.innerHTML = '<span class="telemetry-pill">No readings yet</span>';
      return;
    }

    feedEl.innerHTML = items
      .map(
        (l) => `
        <span class="telemetry-pill">
          <span class="telemetry-pill__node">${escapeHtml(l.node_id)}</span>
          <span>${escapeHtml(l.metric_name)}:</span>
          <strong>${escapeHtml(l.metric_value)}</strong>
        </span>`
      )
      .join('');
  }

  function renderDeployments(slug) {
    const grid = document.getElementById('deployments-grid');
    if (!grid) return;

    const filtered = allDeployments.filter((d) => d.division_slug === slug);
    const items = filtered.length ? filtered : allDeployments.slice(0, 2);

    grid.innerHTML = items
      .map(
        (d) => `
        <article class="case-card">
          <span class="case-card__sector">${escapeHtml(d.sector)}</span>
          <h3 class="case-card__title">${escapeHtml(d.title)}</h3>
          <p class="case-card__body">${escapeHtml(d.summary)}</p>
          <div class="case-card__outcome">Outcome: ${escapeHtml(d.outcome)}</div>
        </article>`
      )
      .join('');
  }

  function selectPlatform(slug) {
    currentPlatform = slug;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.division === slug)));

    if (farmSenseHub) {
      farmSenseHub.style.display = slug === 'agriculture' ? 'block' : 'none';
    }

    const data = divisions[slug];
    if (data) {
      eyebrowEl.textContent = data.leadRole ? `${data.eyebrow} · ${data.leadRole}` : data.eyebrow;
      titleEl.textContent = data.title;
      descEl.textContent = data.desc;
      sysNameEl.textContent = data.sysName;
      sysStatusEl.textContent = data.sysStatus;
      listEl.innerHTML = data.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('');
      kpisEl.innerHTML = data.kpis
        .map(
          (k) => `
          <div>
            <div class="telemetry-kpi__num">${escapeHtml(k.num)}</div>
            <div class="telemetry-kpi__desc">${escapeHtml(k.desc)}</div>
          </div>`
        )
        .join('');
      stackEl.innerHTML = data.stack.map((s) => `<span class="stack-chip">${escapeHtml(s)}</span>`).join('');
    }

    renderTelemetry(slug);
    renderDeployments(slug);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectPlatform(tab.dataset.division));
  });

  jumpLinks.forEach((link) => {
    link.addEventListener('click', () => selectPlatform(link.dataset.jump));
  });

  pingBtn?.addEventListener('click', async () => {
    pingBtn.textContent = 'Syncing...';
    const samples = {
      agriculture: { node_id: 'FS-04', division: 'agriculture', metric_name: 'SOIL_MOISTURE', metric_value: `${(36 + Math.random() * 8).toFixed(1)}%` },
      mining: { node_id: 'VM-02', division: 'mining', metric_name: 'ORE_GRADE', metric_value: `${(92 + Math.random() * 4).toFixed(1)}%` },
      aiml: { node_id: 'TX-07', division: 'aiml', metric_name: 'EDGE_LATENCY', metric_value: `${(6 + Math.random() * 3).toFixed(1)}ms` },
      biotech: { node_id: 'BX-03', division: 'biotech', metric_name: 'CULTURE_PH', metric_value: `${(6.6 + Math.random() * 0.4).toFixed(2)}` },
    };
    try {
      await fetch(`${API_BASE}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samples[currentPlatform] || samples.agriculture),
      });
      const res = await fetch(`${API_BASE}/telemetry`);
      if (res.ok) allTelemetry = (await res.json()).logs || [];
    } catch {
      // ignore
    }
    renderTelemetry(currentPlatform);
    pingBtn.textContent = 'Sync Nodes';
  });

  selectPlatform('agriculture');
}

/* farmSense Interactive Hub (Walk-Around GPS + Live Weather & Crop Health) */
async function initFarmerHub() {
  const canvas = document.getElementById('walk-canvas');
  const pointsCountEl = document.getElementById('walk-points-count');
  const areaDisplayEl = document.getElementById('walk-area-display');
  const simBtn = document.getElementById('btn-sim-walk');
  const gpsBtn = document.getElementById('btn-device-gps');
  const clearBtn = document.getElementById('btn-clear-walk');
  const form = document.getElementById('farm-reg-form');
  const feedback = document.getElementById('farm-reg-feedback');
  const farmSelect = document.getElementById('registered-farm-select');

  if (!canvas || !form || !farmSelect) return;
  const ctx = canvas.getContext('2d');

  let points = [];
  const baseLat = 11.98;
  const baseLng = 8.52;

  function computeAreaHectares(pts) {
    if (pts.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    const sqMeters = Math.abs(area / 2) * (2.2 * 2.2);
    return Number((sqMeters / 10000).toFixed(2));
  }

  function drawWalkCanvas() {
    ctx.fillStyle = '#FAF9F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(31, 74, 56, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 35; y < canvas.height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (points.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(31, 74, 56, 0.14)';
        ctx.fill();
      }
      ctx.strokeStyle = '#1F4A38';
      ctx.lineWidth = 2;
      ctx.stroke();

      points.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#B56734' : '#1F4A38';
        ctx.fill();
      });
    }

    const ha = computeAreaHectares(points);
    pointsCountEl.textContent = `${points.length} points`;
    areaDisplayEl.textContent = `${ha.toFixed(2)} ha`;
  }

  function addPoint(x, y, latOverride, lngOverride) {
    const lat = latOverride ?? Number((baseLat + (canvas.height - y) * 0.00004).toFixed(5));
    const lng = lngOverride ?? Number((baseLng + x * 0.00004).toFixed(5));
    points.push({ x, y, lat, lng });
    drawWalkCanvas();
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    addPoint((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  });

  simBtn?.addEventListener('click', () => {
    points = [];
    const cx = canvas.width / 2 + (Math.random() * 40 - 20);
    const cy = canvas.height / 2 + (Math.random() * 20 - 10);
    const rx = 120 + Math.random() * 40;
    const ry = 60 + Math.random() * 20;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const jitter = 0.85 + Math.random() * 0.3;
      addPoint(cx + Math.cos(angle) * rx * jitter, cy + Math.sin(angle) * ry * jitter);
    }
  });

  gpsBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      simBtn?.click();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const idx = points.length;
        addPoint(100 + (idx * 90) % 340, 60 + ((idx * 55) % 110), Number(pos.coords.latitude.toFixed(5)), Number(pos.coords.longitude.toFixed(5)));
      },
      () => simBtn?.click(),
      { timeout: 3000 }
    );
  });

  clearBtn?.addEventListener('click', () => {
    points = [];
    drawWalkCanvas();
  });

  drawWalkCanvas();

  async function loadRegisteredFarms(selectId) {
    try {
      const res = await fetch(`${API_BASE}/farms`);
      if (!res.ok) return;
      const farms = (await res.json()).farms || [];
      if (!farms.length) {
        farmSelect.innerHTML = '<option value="">No farms registered</option>';
        return;
      }
      farmSelect.innerHTML = farms
        .map((f) => `<option value="${f.id}">${escapeHtml(f.farm_name)} (${escapeHtml(f.crop_type)} · ${f.area_hectares} ha)</option>`)
        .join('');
      if (selectId) farmSelect.value = String(selectId);
      await loadFarmInsights(farmSelect.value);
    } catch {
      farmSelect.innerHTML = '<option value="">API Offline</option>';
    }
  }

  async function loadFarmInsights(farmId) {
    if (!farmId) return;
    try {
      const res = await fetch(`${API_BASE}/farms/${farmId}/insights`);
      if (!res.ok) return;
      const d = await res.json();
      document.getElementById('farm-meta-bar').textContent =
        `${d.farm_name} · ${d.area_hectares} ha · GPS (${d.centroid.lat}°, ${d.centroid.lng}°) · ${d.plan_tier.toUpperCase()}`;
      document.getElementById('ins-temp').textContent = `${d.weather.temperature_c}°C · ${d.weather.rain_probability_pct}% Rain`;
      document.getElementById('ins-forecast').textContent = d.weather.forecast;
      document.getElementById('ins-ndvi').textContent = `NDVI ${d.crop_health.ndvi}`;
      document.getElementById('ins-ndvi-status').textContent = d.crop_health.status;
      document.getElementById('ins-moisture').textContent = `${d.crop_health.soil_moisture_pct}%`;
      document.getElementById('ins-irrigation').textContent = d.crop_health.irrigation_advisory;
      document.getElementById('ins-pest').textContent = d.crop_health.pest_risk;
      document.getElementById('ins-agronomist').textContent = d.crop_health.agronomist_note;
    } catch {
      // ignore
    }
  }

  farmSelect.addEventListener('change', () => loadFarmInsights(farmSelect.value));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_name = form.farmer_name.value.trim();
    const contact = form.contact.value.trim();
    const farm_name = form.farm_name.value.trim();
    const crop_type = form.crop_type.value;
    const plan_tier = form.plan_tier.value;
    const area_hectares = computeAreaHectares(points);

    if (!farmer_name || !contact || !farm_name || points.length < 3 || area_hectares <= 0) {
      feedback.textContent = 'Please enter farmer details and map at least 3 walk-around GPS points.';
      feedback.classList.add('is-visible');
      return;
    }

    const coordinates = points.map((p) => ({ lat: p.lat, lng: p.lng }));
    try {
      const res = await fetch(`${API_BASE}/farms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_name, contact, farm_name, crop_type, plan_tier, coordinates, area_hectares }),
      });
      if (res.ok) {
        const saved = await res.json();
        feedback.textContent = `Registered "${farm_name}" (${area_hectares} ha) to farmSense!`;
        feedback.classList.add('is-visible');
        form.reset();
        points = [];
        drawWalkCanvas();
        await loadRegisteredFarms(saved.farm.id);
        return;
      }
    } catch {
      // ignore
    }
    feedback.textContent = 'Unable to reach PostgreSQL API right now.';
    feedback.classList.add('is-visible');
  });

  await loadRegisteredFarms();
}

/* Contact Form */
function initContactForm() {
  const form = document.getElementById('partnership-form');
  const feedback = document.getElementById('form-feedback');
  if (!form || !feedback) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const organization = form.organization.value.trim();
    const division = form.division.value;
    const message = form.message.value.trim();

    if (!name || !email || !organization || !message) {
      feedback.textContent = 'Please complete all required fields.';
      feedback.classList.add('is-visible');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, organization, division, message }),
      });
      if (res.ok) {
        const saved = await res.json();
        feedback.textContent = `Thank you, ${name}. Inquiry #${saved.id} (${division}) saved.`;
        feedback.classList.add('is-visible');
        form.reset();
        return;
      }
    } catch {
      // ignore
    }
    feedback.textContent = `Thank you, ${name}. Inquiry logged.`;
    feedback.classList.add('is-visible');
    form.reset();
  });
}

/* Daylight Topographic Canvas */
function initHeroTelemetryCanvas() {
  const canvas = document.getElementById('hero-telemetry-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let phase = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.fillStyle = '#F4F2EA';
    ctx.fillRect(0, 0, width, height);

    const layers = 12;
    for (let i = 0; i < layers; i++) {
      const baseY = (height / (layers + 1)) * (i + 1.1);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 14) {
        const y = baseY + Math.sin(x * 0.008 + phase + i * 0.45) * 16 + Math.cos(x * 0.015 - phase * 0.6 + i * 0.3) * 9;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i === 5 || i === 9 ? 'rgba(181, 103, 52, 0.6)' : 'rgba(31, 74, 56, 0.22)';
      ctx.lineWidth = i === 5 || i === 9 ? 1.4 : 1;
      ctx.stroke();
    }

    const nodes = [
      { x: width * 0.26, y: height * 0.34, label: 'farmSense' },
      { x: width * 0.66, y: height * 0.28, label: 'Vmines' },
      { x: width * 0.34, y: height * 0.66, label: 'techx' },
      { x: width * 0.68, y: height * 0.62, label: 'Biotx' },
    ];

    nodes.forEach((node, idx) => {
      const pulse = prefersReduced ? 11 : 11 + Math.sin(phase * 2 + idx) * 3.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 1 ? 'rgba(181, 103, 52, 0.45)' : 'rgba(31, 74, 56, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 1 ? '#B56734' : '#1F4A38';
      ctx.fill();

      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#181C19';
      ctx.fillText(node.label, node.x + 11, node.y + 4);
    });

    if (!prefersReduced) {
      phase += 0.012;
      requestAnimationFrame(draw);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
