import pg from 'pg';

const { Pool } = pg;

export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://tx_user:tx_pass@localhost:5432/tx_limited';

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS divisions (
      slug TEXT PRIMARY KEY,
      eyebrow TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      bullets JSONB NOT NULL,
      sys_name TEXT NOT NULL,
      sys_status TEXT NOT NULL,
      kpis JSONB NOT NULL,
      stack JSONB NOT NULL,
      lead_role TEXT NOT NULL DEFAULT 'Field Engineering Team'
    );

    CREATE TABLE IF NOT EXISTS farms (
      id SERIAL PRIMARY KEY,
      farmer_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      farm_name TEXT NOT NULL,
      crop_type TEXT NOT NULL,
      plan_tier TEXT NOT NULL DEFAULT 'free',
      coordinates JSONB NOT NULL,
      area_hectares NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      sector TEXT NOT NULL,
      division_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      outcome TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      organization TEXT NOT NULL,
      division TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS telemetry_logs (
      id SERIAL PRIMARY KEY,
      node_id TEXT NOT NULL,
      division TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS lead_role TEXT NOT NULL DEFAULT 'Field Engineering Team';
  `);

  const { rows: farmCount } = await pool.query('SELECT COUNT(*)::int AS count FROM farms');
  if (farmCount[0].count === 0) {
    const sampleCoords = [
      { lat: 11.9812, lng: 8.5201 },
      { lat: 11.9845, lng: 8.5204 },
      { lat: 11.9843, lng: 8.5242 },
      { lat: 11.981, lng: 8.5238 },
    ];
    await pool.query(
      `INSERT INTO farms (farmer_name, contact, farm_name, crop_type, plan_tier, coordinates, area_hectares)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        'Ibrahim Musa',
        'ibrahim.musa@savannafarms.ng',
        'Kano North Maize Block',
        'Maize',
        'pro',
        JSON.stringify(sampleCoords),
        14.8,
      ]
    );
  }

  const { rows: divCount } = await pool.query('SELECT COUNT(*)::int AS count FROM divisions');
  if (divCount[0].count === 0) {
    const seedDivisions = [
      {
        slug: 'agriculture',
        eyebrow: 'Precision Agriculture Hub',
        title: 'Farmer Registration, Walk-Around Mapping & Crop Health',
        description:
          'Farmers register on web or mobile (Google Play & App Store / iCloud), walk their field perimeter to capture GPS boundaries, and receive weather and crop health advisories on Free or Subscription plans.',
        bullets: [
          'Walk-around GPS polygon mapping via smartphone or web boundary tool',
          'Hyperlocal weather forecasts, evapotranspiration, and rainfall alerts',
          'NDVI crop health monitoring, pest warnings, and agronomist support',
        ],
        sys_name: 'TX AgroSense · Farmer Hub',
        sys_status: 'LIVE FIELD SYNC',
        kpis: [
          { num: '+24.6%', desc: 'Net marketable yield uplift' },
          { num: '32%', desc: 'Reduction in freshwater draw' },
          { num: '1.2 cm', desc: 'Ground sampling distance' },
          { num: '99.4%', desc: 'LoRaWAN sensor uptime' },
        ],
        stack: ['Mobile GPS Walk', 'iCloud & Play Sync', 'Weather & NDVI', 'Subscription Advisories'],
        lead_role: 'Lead Agronomists & Hydrologists',
      },
      {
        slug: 'mining',
        eyebrow: 'Mining Tech Solutions',
        title: 'Geologist-Led Ore Control & Safer Extraction',
        description:
          'Built with site geologists and mine planners, TX StrataVision unifies LiDAR pit mapping, slope-stability radar, and inline XRF assaying.',
        bullets: [
          'Continuous pit-wall millimeter radar monitored by geotechnical safety officers',
          'Inline conveyor ore-sorting models separating waste rock before primary milling',
          'Haulage dispatch schedules tuned for operator safety and lower diesel burn',
        ],
        sys_name: 'TX StrataVision · Geological Assay',
        sys_status: 'ACTIVE ASSAY',
        kpis: [
          { num: '38%', desc: 'Reduction in haulage & reagent waste' },
          { num: '< 120 ms', desc: 'Edge XRF ore-grade classification' },
          { num: '0.4 mm', desc: 'Slope radar deformation sensitivity' },
          { num: '24/7', desc: 'Geotechnical safety monitoring' },
        ],
        stack: ['LiDAR SLAM', 'Inline XRF', 'Slope Radar', 'Geologist Sign-Off'],
        lead_role: 'Geologists & Mining Engineers',
      },
      {
        slug: 'aiml',
        eyebrow: 'AI & Machine Learning',
        title: 'Human-Interpretable Models Built for Field Teams',
        description:
          'Our ML researchers craft transparent vision and time-series models that run locally on rugged field hardware with clear human-in-the-loop oversight.',
        bullets: [
          'Air-gapped edge deployment on industrial ARM and GPU modules in remote sites',
          'Explainable anomaly flags that show operators the exact sensor evidence',
          'Continuous active-learning loops curated by domain specialists',
        ],
        sys_name: 'TX Inference · Edge Compute',
        sys_status: 'HUMAN-IN-LOOP',
        kpis: [
          { num: '8 ms', desc: 'On-device vision inference latency' },
          { num: '99.1%', desc: 'Equipment anomaly recall rate' },
          { num: '0 kbps', desc: 'Required uplink for core inference' },
          { num: '4.8 TB', desc: 'Daily field telemetry processed' },
        ],
        stack: ['Geospatial ViT', 'Quantized TensorRT', 'Explainable Alerts', 'Federated Sync'],
        lead_role: 'Applied ML Researchers',
      },
      {
        slug: 'biotech',
        eyebrow: 'Biotech Technology',
        title: 'Biologist-Curated Bio-Foundries & Soil Remediation',
        description:
          'Our microbiologists and bioprocess engineers develop resilient bio-fertilizers, drought-tolerant traits, and bio-leaching consortia for cleaner recovery.',
        bullets: [
          'Droplet microfluidics screening 45,000+ natural microbial variants weekly',
          'Rhizosphere bio-inoculants tailored to regional soil chemistry',
          'Acidophilic bio-leaching cultures for low-impact tailings remediation',
        ],
        sys_name: 'TX BioFoundry · Wet-Lab Array',
        sys_status: 'CULTURE OPTIMAL',
        kpis: [
          { num: '45,000', desc: 'Automated assays per week' },
          { num: '4.2x', desc: 'Faster strain optimization cycle' },
          { num: '88%', desc: 'Tailings heavy-metal detoxification' },
          { num: '-41%', desc: 'Synthetic fertilizer dependency' },
        ],
        stack: ['Microfluidic Screening', 'Genomic Modeling', 'Bioreactor Telemetry', 'Wet-Lab Validation'],
        lead_role: 'Microbiologists & Bioprocess Leads',
      },
    ];

    for (const d of seedDivisions) {
      await pool.query(
        `INSERT INTO divisions (slug, eyebrow, title, description, bullets, sys_name, sys_status, kpis, stack, lead_role)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9::jsonb, $10)`,
        [
          d.slug,
          d.eyebrow,
          d.title,
          d.description,
          JSON.stringify(d.bullets),
          d.sys_name,
          d.sys_status,
          JSON.stringify(d.kpis),
          JSON.stringify(d.stack),
          d.lead_role,
        ]
      );
    }
  }

  const { rows: depCount } = await pool.query('SELECT COUNT(*)::int AS count FROM deployments');
  if (depCount[0].count === 0) {
    const seedDeployments = [
      {
        sector: 'Precision Ag × Biotech',
        division_slug: 'agriculture',
        title: 'Nitrogen-fixing bio-inoculants paired with drone variable dosing',
        summary:
          'Deployed across 42,000 hectares of commercial maize and sorghum estates with local agronomists reviewing weekly prescription maps.',
        outcome: '-41% synthetic urea · +19% harvest',
      },
      {
        sector: 'Mining Tech × AI&ML',
        division_slug: 'mining',
        title: 'Real-time ore sorting & operator-assisted haulage dispatch',
        summary:
          'Integrated conveyor-mounted XRF sensors and explainable computer vision to separate waste rock before primary crushing.',
        outcome: '-29% mill energy · +14% recovery',
      },
      {
        sector: 'Biotech × Mining Tech',
        division_slug: 'biotech',
        title: 'Tailings bio-remediation & secondary metal recovery',
        summary:
          'Bioprocess teams deployed acidophilic microbial consortia with pH/redox telemetry to extract residual cobalt and neutralize runoff.',
        outcome: '88% leachate detox · New metal yield',
      },
      {
        sector: 'AI&ML × Precision Ag',
        division_slug: 'aiml',
        title: 'Offline edge vision for smallholder cooperative grain grading',
        summary:
          'Trained lightweight optical models with cooperative inspectors to grade moisture and kernel quality at rural collection hubs.',
        outcome: '8 ms grading · 3.4x faster payout',
      },
    ];

    for (const dep of seedDeployments) {
      await pool.query(
        `INSERT INTO deployments (sector, division_slug, title, summary, outcome)
         VALUES ($1, $2, $3, $4, $5)`,
        [dep.sector, dep.division_slug, dep.title, dep.summary, dep.outcome]
      );
    }
  }

  const { rows: telCount } = await pool.query('SELECT COUNT(*)::int AS count FROM telemetry_logs');
  if (telCount[0].count === 0) {
    await pool.query(
      `INSERT INTO telemetry_logs (node_id, division, metric_name, metric_value)
       VALUES
         ('AG-01', 'agriculture', 'NDVI_MEAN', '0.84'),
         ('MN-04', 'mining', 'ORE_PURITY', '94.2%'),
         ('AI-07', 'aiml', 'EDGE_LATENCY', '8ms'),
         ('BIO-02', 'biotech', 'BIOREACTOR_PH', '6.82')`
    );
  }
}
