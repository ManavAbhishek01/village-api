require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { router: authRouter } = require('./auth');
const { securityHeaders, basicRateLimit, apiKeyAuth, logApiRequest } = require('./middleware');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(securityHeaders);
app.use(basicRateLimit);
app.use('/auth', authRouter);
app.use('/v1', apiKeyAuth);
app.use(logApiRequest);

// ✅ GET /v1/states
app.get('/v1/states', async (req, res) => {
  try {
    const start = Date.now();
    const states = await prisma.state.findMany({ orderBy: { name: 'asc' } });
    res.json({
      success: true,
      count: states.length,
      data: states,
      meta: {
        responseTime: Date.now() - start,
        rateLimit: req.rateLimit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ✅ GET /v1/states/:code/districts
app.get('/v1/states/:code/districts', async (req, res) => {
  try {
    const start = Date.now();
    const state = await prisma.state.findUnique({ where: { code: parseInt(req.params.code) } });
    if (!state) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'State not found' });
    const districts = await prisma.district.findMany({
      where: { stateId: state.id },
      orderBy: { name: 'asc' }
    });
    res.json({
      success: true,
      count: districts.length,
      data: districts,
      meta: { responseTime: Date.now() - start, rateLimit: req.rateLimit }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ✅ GET /v1/districts/:code/subdistricts
app.get('/v1/districts/:code/subdistricts', async (req, res) => {
  try {
    const start = Date.now();
    const district = await prisma.district.findUnique({ where: { code: parseInt(req.params.code) } });
    if (!district) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'District not found' });
    const subDistricts = await prisma.subDistrict.findMany({
      where: { districtId: district.id },
      orderBy: { name: 'asc' }
    });
    res.json({
      success: true,
      count: subDistricts.length,
      data: subDistricts,
      meta: { responseTime: Date.now() - start, rateLimit: req.rateLimit }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ✅ GET /v1/subdistricts/:code/villages
app.get('/v1/subdistricts/:code/villages', async (req, res) => {
  try {
    const start = Date.now();
    const subDistrict = await prisma.subDistrict.findUnique({ where: { code: parseInt(req.params.code) } });
    if (!subDistrict) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'SubDistrict not found' });
    const villages = await prisma.village.findMany({
      where: { subDistrictId: subDistrict.id },
      orderBy: { name: 'asc' }
    });
    res.json({
      success: true,
      count: villages.length,
      data: villages,
      meta: { responseTime: Date.now() - start, rateLimit: req.rateLimit }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ✅ GET /v1/autocomplete?q=xxx
app.get('/v1/autocomplete', async (req, res) => {
  try {
    const start = Date.now();
    const q = req.query.q || '';
    if (q.length < 2) return res.status(400).json({ success: false, error: 'INVALID_QUERY', message: 'Minimum 2 characters required' });

    const villages = await prisma.village.findMany({
      where: { name: { startsWith: q, mode: 'insensitive' } },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      },
      take: 10
    });

    const data = villages.map(v => ({
      value: v.code,
      label: v.name,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name,
        country: 'India'
      }
    }));

    res.json({
      success: true,
      count: data.length,
      data,
      meta: { responseTime: Date.now() - start, rateLimit: req.rateLimit }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ✅ GET /v1/search?q=xxx
app.get('/v1/search', async (req, res) => {
  try {
    const start = Date.now();
    const q = req.query.q || '';
    const state = req.query.state || '';
    if (q.length < 2) return res.status(400).json({ success: false, error: 'INVALID_QUERY', message: 'Minimum 2 characters required' });

    const villages = await prisma.village.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(state && {
          subDistrict: {
            district: {
              state: { name: { contains: state, mode: 'insensitive' } }
            }
          }
        })
      },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      },
      take: 20
    });

    const data = villages.map(v => ({
      code: v.code,
      village: v.name,
      subDistrict: v.subDistrict.name,
      district: v.subDistrict.district.name,
      state: v.subDistrict.district.state.name
    }));

    res.json({
      success: true,
      count: data.length,
      data,
      meta: { responseTime: Date.now() - start, rateLimit: req.rateLimit }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ message: '🌍 All India Villages API', version: 'v1', status: 'running', database: 'NeonDB PostgreSQL' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chal raha hai: http://localhost:${PORT}`);
  console.log(`🗄️ Database: NeonDB PostgreSQL`);
  console.log(`📡 Endpoints ready!`);
});