require('dotenv').config();
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Plan wise limits
const PLAN_LIMITS = {
  FREE: 5000,
  PREMIUM: 50000,
  PRO: 300000,
  UNLIMITED: 1000000
};

// ✅ Security Headers Middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
};

// ✅ Rate Limiter (Basic - without Redis)
const basicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: 'RATE_LIMITED', message: 'Too many requests' }
});

// ✅ API Key Authentication Middleware
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'X-API-Key header is required'
      });
    }

    // Find API key in database
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true }
    });

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Invalid API key'
      });
    }

    if (keyRecord.status === 'REVOKED') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'API key has been revoked'
      });
    }

    if (keyRecord.user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Account is not active'
      });
    }

    // Check daily limit
    const limit = PLAN_LIMITS[keyRecord.user.planType] || 5000;
    
    // Get today's usage from ApiLog
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUsage = await prisma.apiLog.count({
      where: {
        apiKeyId: keyRecord.id,
        createdAt: { gte: today }
      }
    });

    if (todayUsage >= limit) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Daily quota exceeded',
        meta: {
          rateLimit: {
            limit,
            remaining: 0,
            reset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
    }

    // Attach user info to request
    req.apiKey = keyRecord;
    req.user = keyRecord.user;
    req.rateLimit = {
      limit,
      remaining: limit - todayUsage - 1,
      reset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });

    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
};

// ✅ API Log Middleware
const logApiRequest = async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    try {
      if (req.apiKey) {
        await prisma.apiLog.create({
          data: {
            apiKeyId: req.apiKey.id,
            userId: req.user.id,
            endpoint: req.path,
            responseTime: Date.now() - start,
            statusCode: res.statusCode,
            ipAddress: req.ip || 'unknown'
          }
        });
      }
    } catch (err) {
      console.error('Log error:', err.message);
    }
  });

  next();
};

module.exports = { securityHeaders, basicRateLimit, apiKeyAuth, logApiRequest };