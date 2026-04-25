const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const db = new Database('villages.db');
app.use(cors());
app.use(express.json());

// ✅ GET /v1/states
app.get('/v1/states', (req, res) => {
  const states = db.prepare('SELECT code, name FROM states ORDER BY name').all();
  res.json({ success: true, count: states.length, data: states });
});

// ✅ GET /v1/states/:code/districts
app.get('/v1/states/:code/districts', (req, res) => {
  const districts = db.prepare(
    'SELECT code, name FROM districts WHERE state_code = ? ORDER BY name'
  ).all(req.params.code);
  res.json({ success: true, count: districts.length, data: districts });
});

// ✅ GET /v1/districts/:code/subdistricts
app.get('/v1/districts/:code/subdistricts', (req, res) => {
  const subs = db.prepare(
    'SELECT code, name FROM sub_districts WHERE district_code = ? ORDER BY name'
  ).all(req.params.code);
  res.json({ success: true, count: subs.length, data: subs });
});

// ✅ GET /v1/subdistricts/:code/villages
app.get('/v1/subdistricts/:code/villages', (req, res) => {
  const villages = db.prepare(
    'SELECT code, name FROM villages WHERE sub_district_code = ? ORDER BY name'
  ).all(req.params.code);
  res.json({ success: true, count: villages.length, data: villages });
});

// ✅ GET /v1/autocomplete?q=xxx
app.get('/v1/autocomplete', (req, res) => {
  const q = req.query.q || '';
  if (q.length < 2) {
    return res.status(400).json({ success: false, error: 'Minimum 2 characters required' });
  }
  const villages = db.prepare(`
    SELECT 
      v.code,
      v.name AS village,
      sd.name AS sub_district,
      d.name AS district,
      s.name AS state
    FROM villages v
    JOIN sub_districts sd ON v.sub_district_code = sd.code
    JOIN districts d ON sd.district_code = d.code
    JOIN states s ON d.state_code = s.code
    WHERE v.name LIKE ?
    LIMIT 10
  `).all(`${q}%`);

  const data = villages.map(v => ({
    value: v.code,
    label: v.village,
    fullAddress: `${v.village}, ${v.sub_district}, ${v.district}, ${v.state}, India`,
    hierarchy: {
      village: v.village,
      subDistrict: v.sub_district,
      district: v.district,
      state: v.state,
      country: 'India'
    }
  }));

  res.json({ success: true, count: data.length, data });
});

// ✅ GET /v1/search?q=xxx
app.get('/v1/search', (req, res) => {
  const q = req.query.q || '';
  const state = req.query.state || '';
  if (q.length < 2) {
    return res.status(400).json({ success: false, error: 'Minimum 2 characters required' });
  }

  let query = `
    SELECT 
      v.code,
      v.name AS village,
      sd.name AS sub_district,
      d.name AS district,
      s.name AS state
    FROM villages v
    JOIN sub_districts sd ON v.sub_district_code = sd.code
    JOIN districts d ON sd.district_code = d.code
    JOIN states s ON d.state_code = s.code
    WHERE v.name LIKE ?
  `;
  const params = [`%${q}%`];

  if (state) {
    query += ' AND s.name LIKE ?';
    params.push(`%${state}%`);
  }

  query += ' LIMIT 20';

  const villages = db.prepare(query).all(...params);
  res.json({ success: true, count: villages.length, data: villages });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: '🌍 All India Villages API', version: 'v1', status: 'running' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chal raha hai: http://localhost:${PORT}`);
  console.log(`📡 Endpoints ready:`);
  console.log(`   GET /v1/states`);
  console.log(`   GET /v1/states/:code/districts`);
  console.log(`   GET /v1/districts/:code/subdistricts`);
  console.log(`   GET /v1/subdistricts/:code/villages`);
  console.log(`   GET /v1/autocomplete?q=xxx`);
  console.log(`   GET /v1/search?q=xxx`);
});