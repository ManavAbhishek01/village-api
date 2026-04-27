const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: 'https://pumped-collie-107020.upstash.io',
  token: process.env.REDIS_TOKEN,
});

const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data;
  } catch (err) {
    console.error('Redis get error:', err.message);
    return null;
  }
};

const setCache = async (key, data, ttl = 3600) => {
  try {
    await redis.set(key, data, { ex: ttl });
  } catch (err) {
    console.error('Redis set error:', err.message);
  }
};

module.exports = { getCache, setCache };