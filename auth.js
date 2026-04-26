require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'village-api-secret';

// Middleware - JWT verify
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// ✅ POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, businessName, phone, password } = req.body;
    if (!email || !businessName || !password) {
      return res.status(400).json({ success: false, error: 'Email, businessName, password required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, businessName, phone, passwordHash, status: 'PENDING', planType: 'FREE' }
    });

    res.json({
      success: true,
      message: 'Registration successful! Admin approval pending.',
      data: { id: user.id, email: user.email, businessName: user.businessName, status: user.status }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (user.status === 'PENDING') return res.status(403).json({ success: false, error: 'Account pending approval' });
    if (user.status === 'SUSPENDED') return res.status(403).json({ success: false, error: 'Account suspended' });

    const token = jwt.sign(
      { id: user.id, email: user.email, planType: user.planType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, businessName: user.businessName, planType: user.planType } }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ POST /auth/keys - Generate API Key
router.post('/keys', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const apiKey = 'ak_' + crypto.randomBytes(16).toString('hex');
    const apiSecret = 'as_' + crypto.randomBytes(16).toString('hex');
    const secretHash = await bcrypt.hash(apiSecret, 10);

    const key = await prisma.apiKey.create({
      data: { name, key: apiKey, secretHash, userId: req.user.id }
    });

    res.json({
      success: true,
      message: 'API Key created! Secret shown only once.',
      data: { id: key.id, name: key.name, key: apiKey, secret: apiSecret }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET /auth/keys - List API Keys
router.get('/keys', verifyToken, async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: { id: true, name: true, key: true, status: true, lastUsed: true, createdAt: true }
    });
    res.json({ success: true, count: keys.length, data: keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ DELETE /auth/keys/:id - Revoke API Key
router.delete('/keys/:id', verifyToken, async (req, res) => {
  try {
    await prisma.apiKey.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'REVOKED' }
    });
    res.json({ success: true, message: 'API Key revoked!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET /auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, businessName: true, planType: true, status: true, createdAt: true }
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, verifyToken };