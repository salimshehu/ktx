/* ==========================================================================
   TX — Elegant Landing Page Logic (farmSense · Vmines · techx · Biotx)
   ========================================================================== */

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initHeroTelemetryCanvas();
  initFarmerHub();
  initSectorPreviews();
  initReviews();
  initContactForm();
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

/* Interactive Previews for Vmines, techx, and Biotx */
function initSectorPreviews() {
  const vminesData = {
    xrf: { v1: '94.2%', s1: 'Ore-grade classification', v2: '-29%', s2: 'Milling energy saved' },
    radar: { v1: '0.4 mm', s1: 'Pit-wall radar sensitivity', v2: '24/7', s2: 'Geotechnical monitoring' },
    fleet: { v1: '-38%', s1: 'Haulage & reagent waste', v2: '99.4%', s2: 'Dispatch uptime' },
  };
  document.querySelectorAll('[data-vmines]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vmines]').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const d = vminesData[btn.dataset.vmines];
      document.getElementById('vm-m1-val').textContent = d.v1;
      document.getElementById('vm-m1-sub').textContent = d.s1;
      document.getElementById('vm-m2-val').textContent = d.v2;
      document.getElementById('vm-m2-sub').textContent = d.s2;
    });
  });

  const techxData = {
    vision: { v1: '8 ms', s1: 'On-device TensorRT', v2: '99.1%', s2: 'Verified field precision' },
    anomaly: { v1: '0 kbps', s1: 'Air-gapped inference', v2: '4.8 TB', s2: 'Daily telemetry processed' },
    grading: { v1: '3.4x', s1: 'Faster cooperative payout', v2: '98.7%', s2: 'Moisture & kernel accuracy' },
  };
  document.querySelectorAll('[data-techx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-techx]').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const d = techxData[btn.dataset.techx];
      document.getElementById('tx-m1-val').textContent = d.v1;
      document.getElementById('tx-m1-sub').textContent = d.s1;
      document.getElementById('tx-m2-val').textContent = d.v2;
      document.getElementById('tx-m2-sub').textContent = d.s2;
    });
  });

  const biotxData = {
    soil: { v1: '45,000 / wk', s1: 'Microfluidic assays', v2: '-41% Urea', s2: 'Verified estate trials' },
    leach: { v1: '88%', s1: 'Heavy-metal detox rate', v2: '4.2x', s2: 'Faster strain optimization' },
  };
  document.querySelectorAll('[data-biotx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-biotx]').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const d = biotxData[btn.dataset.biotx];
      document.getElementById('bx-m1-val').textContent = d.v1;
      document.getElementById('bx-m1-sub').textContent = d.s1;
      document.getElementById('bx-m2-val').textContent = d.v2;
      document.getElementById('bx-m2-sub').textContent = d.s2;
    });
  });
}

/* User Reviews Section */
function initReviews() {
  const reviews = [
    {
      platform: 'farmSense',
      author: 'Ibrahim Musa',
      role: 'Commercial Maize Grower · Kano',
      quote: 'Walking our 14.8 ha boundary on the farmSense app took ten minutes. The rain alerts and NDVI stress warnings saved our second planting.',
    },
    {
      platform: 'Vmines',
      author: 'Eng. Chidi Okafor',
      role: 'Chief Mine Geologist',
      quote: 'Vmines conveyor XRF sorting cut our waste-rock milling volume by nearly a third while giving our pit team live slope radar visibility.',
    },
    {
      platform: 'techx',
      author: 'Dr. Grace Adeyemi',
      role: 'Cooperative Operations Lead',
      quote: 'techx runs completely offline at our rural collection hubs. Grain grading now takes seconds with transparent visual evidence.',
    },
    {
      platform: 'Biotx',
      author: 'Dr. Samuel Kofi',
      role: 'Agronomy & Soil Director',
      quote: 'Pairing Biotx rhizosphere inoculants with farmSense dosing maps reduced our synthetic urea spend by 41% across three seasons.',
    },
  ];

  const grid = document.getElementById('reviews-grid');
  const filterBtns = document.querySelectorAll('[data-rev]');
  if (!grid) return;

  function render(filter) {
    const list = filter === 'all' ? reviews : reviews.filter((r) => r.platform === filter);
    grid.innerHTML = list
      .map(
        (r) => `
        <article class="case-card">
          <span class="case-card__sector">${escapeHtml(r.platform)}</span>
          <p class="case-card__body" style="color: var(--ink-primary); font-size: 1rem;">&ldquo;${escapeHtml(r.quote)}&rdquo;</p>
          <div class="case-card__outcome">${escapeHtml(r.author)} &middot; ${escapeHtml(r.role)}</div>
        </article>`
      )
      .join('');
  }

  render('all');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      render(btn.dataset.rev);
    });
  });
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
    const ry = 55 + Math.random() * 20;
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
