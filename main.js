/* ==========================================================================
   TX Limited — Dynamic Frontend Logic (PostgreSQL-Backed + Daylight Canvas)
   ========================================================================== */

const API_BASE = 'http://localhost:3001/api';

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initLiveTelemetryFeed();
  initFarmerHub();
  initDivisionExplorer();
  initImpactEstimator();
  initDeploymentsFilter();
  initContactForm();
  initHeroTelemetryCanvas();
});

/* 1. Sticky Header Scroll State */
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 16);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* 2. Mobile Navigation Drawer */
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

/* 3. IntersectionObserver Scroll Reveal */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* 4. Live PostgreSQL Field Telemetry Feed */
async function initLiveTelemetryFeed() {
  const feedEl = document.getElementById('live-telemetry-feed');
  const pingBtn = document.getElementById('ping-telemetry-btn');
  if (!feedEl) return;

  async function refreshFeed() {
    try {
      const res = await fetch(`${API_BASE}/telemetry`);
      if (!res.ok) throw new Error('Telemetry offline');
      const data = await res.json();
      const logs = (data.logs || []).slice(0, 4);

      if (!logs.length) {
        feedEl.innerHTML = '<span class="telemetry-pill">No active readings</span>';
        return;
      }

      feedEl.innerHTML = logs
        .map(
          (l) => `
          <span class="telemetry-pill">
            <span class="telemetry-pill__node">${escapeHtml(l.node_id)}</span>
            <span>${escapeHtml(l.metric_name)}:</span>
            <strong>${escapeHtml(l.metric_value)}</strong>
          </span>`
        )
        .join('');
    } catch {
      feedEl.innerHTML = '<span class="telemetry-pill">Field sync standby</span>';
    }
  }

  pingBtn?.addEventListener('click', async () => {
    pingBtn.textContent = 'Syncing...';
    const sampleNodes = [
      { node_id: 'AG-04', division: 'agriculture', metric_name: 'SOIL_MOISTURE', metric_value: `${(36 + Math.random() * 8).toFixed(1)}%` },
      { node_id: 'MN-02', division: 'mining', metric_name: 'ORE_GRADE', metric_value: `${(92 + Math.random() * 4).toFixed(1)}%` },
      { node_id: 'BIO-05', division: 'biotech', metric_name: 'CULTURE_PH', metric_value: `${(6.6 + Math.random() * 0.4).toFixed(2)}` },
    ];
    const pick = sampleNodes[Math.floor(Math.random() * sampleNodes.length)];
    try {
      await fetch(`${API_BASE}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pick),
      });
    } catch {
      // ignore if offline
    }
    await refreshFeed();
    pingBtn.textContent = 'Sync Field Nodes';
  });

  await refreshFeed();
}

/* 4b. Precision Agriculture Farmer Hub (Walk-Around GPS + Live Insights) */
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

  // Store normalized points {x, y} on canvas and {lat, lng} GPS coordinates
  let points = [];
  const baseLat = 11.98;
  const baseLng = 8.52;

  function computeAreaHectares(pts) {
    if (pts.length < 3) return 0;
    // Shoelace formula on scaled meters (1 canvas px ~ 2.2m)
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

    // Subtle field plot lines
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
    pointsCountEl.textContent = `${points.length} boundary points`;
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
    const ry = 65 + Math.random() * 20;
    const vertices = 5;
    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * Math.PI * 2;
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
        const x = 100 + (idx * 90) % 340;
        const y = 60 + ((idx * 55) % 110);
        addPoint(x, y, Number(pos.coords.latitude.toFixed(5)), Number(pos.coords.longitude.toFixed(5)));
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
      const data = await res.json();
      const farms = data.farms || [];
      if (!farms.length) {
        farmSelect.innerHTML = '<option value="">No farms registered yet</option>';
        return;
      }
      farmSelect.innerHTML = farms
        .map(
          (f) =>
            `<option value="${f.id}">${escapeHtml(f.farm_name)} (${escapeHtml(f.crop_type)} · ${f.area_hectares} ha · ${escapeHtml(f.plan_tier.toUpperCase())})</option>`
        )
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
        `${d.farm_name} · ${d.area_hectares} ha · GPS (${d.centroid.lat}°, ${d.centroid.lng}°) · Plan: ${d.plan_tier.toUpperCase()}`;
      document.getElementById('ins-temp').textContent = `${d.weather.temperature_c}°C · ${d.weather.rain_probability_pct}% Rain`;
      document.getElementById('ins-forecast').textContent = `${d.weather.forecast} (Wind ${d.weather.wind_kmh} km/h)`;
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
      feedback.textContent = 'Please enter farmer details and map at least 3 walk-around GPS points on the plot.';
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
        feedback.textContent = `Registered "${farm_name}" (${area_hectares} ha, ${plan_tier.toUpperCase()} tier) to PostgreSQL! Live weather & crop health loaded.`;
        feedback.classList.add('is-visible');
        form.reset();
        points = [];
        drawWalkCanvas();
        await loadRegisteredFarms(saved.farm.id);
        return;
      }
    } catch {
      // fallback
    }
    feedback.textContent = 'Unable to reach PostgreSQL API right now.';
    feedback.classList.add('is-visible');
  });

  await loadRegisteredFarms();
}

/* 5. Dynamic Division Capabilities Explorer (PostgreSQL-backed) */
async function initDivisionExplorer() {
  const tabs = document.querySelectorAll('#explorer .tab-btn');
  const panel = document.getElementById('explorer-panel');
  if (!tabs.length || !panel) return;

  let activeData = {};
  try {
    const res = await fetch(`${API_BASE}/divisions`);
    if (res.ok) {
      activeData = await res.json();
    }
  } catch {
    // Offline fallback handled below
  }

  const eyebrowEl = document.getElementById('exp-eyebrow');
  const titleEl = document.getElementById('exp-title');
  const descEl = document.getElementById('exp-desc');
  const listEl = document.getElementById('exp-list');
  const sysNameEl = document.getElementById('exp-sys-name');
  const sysStatusEl = document.getElementById('exp-sys-status');
  const kpisEl = document.getElementById('exp-kpis');
  const stackEl = document.getElementById('exp-stack');

  function renderDivision(key, tabId) {
    const data = activeData[key];
    if (!data) return;

    panel.setAttribute('aria-labelledby', tabId);
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

  renderDivision('agriculture', 'tab-ag');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      renderDivision(tab.dataset.division, tab.id);
    });
  });
}

/* 6. Interactive Operational Impact Estimator */
function initImpactEstimator() {
  const sectorEl = document.getElementById('est-sector');
  const scaleEl = document.getElementById('est-scale');
  const scaleDisplay = document.getElementById('est-scale-display');
  const noteEl = document.getElementById('est-note');
  const m1Val = document.getElementById('est-metric-1-val');
  const m1Label = document.getElementById('est-metric-1-label');
  const m2Val = document.getElementById('est-metric-2-val');
  const m2Label = document.getElementById('est-metric-2-label');
  const m3Val = document.getElementById('est-metric-3-val');
  const m3Label = document.getElementById('est-metric-3-label');
  const m4Val = document.getElementById('est-metric-4-val');
  const m4Label = document.getElementById('est-metric-4-label');

  if (!sectorEl || !scaleEl) return;

  function updateEstimate() {
    const sector = sectorEl.value;
    const val = Number(scaleEl.value);

    if (sector === 'agriculture') {
      scaleDisplay.textContent = `${val.toLocaleString()} ha`;
      m1Val.textContent = `${((val * 320) / 1000).toFixed(1)}k m³`;
      m1Label.textContent = 'Annual freshwater saved';
      m2Val.textContent = '+24.6%';
      m2Label.textContent = 'Projected yield uplift';
      m3Val.textContent = '-32%';
      m3Label.textContent = 'Synthetic fertilizer reduction';
      m4Val.textContent = `${Math.max(4, Math.round(val / 1200))} wks`;
      m4Label.textContent = 'Field commissioning';
      noteEl.textContent = 'Benchmarked from commercial estates with TX AgroSense + field agronomist support.';
    } else if (sector === 'mining') {
      scaleDisplay.textContent = `${val.toLocaleString()} t/day`;
      m1Val.textContent = `${Math.round(val * 0.28).toLocaleString()} t`;
      m1Label.textContent = 'Waste rock sorted pre-mill';
      m2Val.textContent = '-29%';
      m2Label.textContent = 'Milling energy reduction';
      m3Val.textContent = '+14.2%';
      m3Label.textContent = 'Net mineral recovery';
      m4Val.textContent = '24/7';
      m4Label.textContent = 'Geotechnical radar coverage';
      noteEl.textContent = 'Estimated from inline XRF sorting and geologist-led pit telemetry deployments.';
    } else {
      scaleDisplay.textContent = `${val.toLocaleString()} L`;
      m1Val.textContent = `${Math.round(val * 1.8).toLocaleString()} kg`;
      m1Label.textContent = 'Annual bio-inoculant output';
      m2Val.textContent = '4.2x';
      m2Label.textContent = 'Faster strain optimization';
      m3Val.textContent = '88%';
      m3Label.textContent = 'Heavy-metal detox rate';
      m4Val.textContent = '45k/wk';
      m4Label.textContent = 'Microfluidic assay capacity';
      noteEl.textContent = 'Modeled from TX BioFoundry wet-lab fermentation and screening benchmarks.';
    }
  }

  sectorEl.addEventListener('change', updateEstimate);
  scaleEl.addEventListener('input', updateEstimate);
  updateEstimate();
}

/* 7. Dynamic Field Deployments Grid (PostgreSQL-backed + Filterable) */
async function initDeploymentsFilter() {
  const grid = document.getElementById('deployments-grid');
  const filterBtns = document.querySelectorAll('#deployments .filter-bar .tab-btn');
  if (!grid) return;

  let deployments = [];
  try {
    const res = await fetch(`${API_BASE}/deployments`);
    if (res.ok) {
      const data = await res.json();
      deployments = data.deployments || [];
    }
  } catch {
    deployments = [];
  }

  function renderCards(filter) {
    const items =
      filter === 'all'
        ? deployments
        : deployments.filter((d) => d.division_slug === filter);

    if (!items.length) {
      grid.innerHTML = '<article class="case-card"><p>No deployments recorded for this filter.</p></article>';
      return;
    }

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

  renderCards('all');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      renderCards(btn.dataset.filter);
    });
  });
}

/* 8. Contact Form Validation & PostgreSQL Persistence */
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
      feedback.textContent = 'Please complete all required fields before submitting your inquiry.';
      feedback.classList.add('is-visible');
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      feedback.textContent = 'Please enter a valid work email address.';
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
        feedback.textContent = `Thank you, ${name}. Inquiry #${saved.id} (${division}) for ${organization} has been saved to PostgreSQL. Our engineering team will respond to ${email} within one business day.`;
        feedback.classList.add('is-visible');
        form.reset();
        return;
      }
    } catch {
      // Fallback
    }

    feedback.textContent = `Thank you, ${name}. Your ${division} inquiry for ${organization} has been logged.`;
    feedback.classList.add('is-visible');
    form.reset();
  });
}

/* 9. Bright Daylight Topographic & Field Station Canvas */
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
    // Warm daylight mineral paper background
    ctx.fillStyle = '#F4F2EA';
    ctx.fillRect(0, 0, width, height);

    // Subtle botanical warmth gradient
    const grad = ctx.createRadialGradient(width * 0.65, height * 0.35, 10, width * 0.65, height * 0.35, width * 0.75);
    grad.addColorStop(0, 'rgba(31, 74, 56, 0.12)');
    grad.addColorStop(0.55, 'rgba(181, 103, 52, 0.08)');
    grad.addColorStop(1, 'rgba(244, 242, 234, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Topographic elevation contour lines
    const layers = 14;
    for (let i = 0; i < layers; i++) {
      const baseY = (height / (layers + 1)) * (i + 1.1);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const wave1 = Math.sin(x * 0.008 + phase + i * 0.45) * 18;
        const wave2 = Math.cos(x * 0.015 - phase * 0.6 + i * 0.3) * 10;
        const y = baseY + wave1 + wave2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      if (i === 5 || i === 10) {
        ctx.strokeStyle = 'rgba(181, 103, 52, 0.65)';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = `rgba(31, 74, 56, ${0.18 + (i % 3) * 0.08})`;
        ctx.lineWidth = 1.1;
      }
      ctx.stroke();
    }

    // Human-operated field station markers
    const nodes = [
      { x: width * 0.28, y: height * 0.36, label: 'AG-01 · Estate' },
      { x: width * 0.64, y: height * 0.28, label: 'MN-04 · Pit' },
      { x: width * 0.52, y: height * 0.62, label: 'BIO-02 · Lab' },
    ];

    nodes.forEach((node, idx) => {
      const pulse = prefersReduced ? 12 : 12 + Math.sin(phase * 2 + idx) * 4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 1 ? 'rgba(181, 103, 52, 0.5)' : 'rgba(31, 74, 56, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 1 ? '#B56734' : '#1F4A38';
      ctx.fill();

      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#181C19';
      ctx.fillText(node.label, node.x + 12, node.y + 4);
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
