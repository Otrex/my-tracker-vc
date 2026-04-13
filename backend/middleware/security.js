function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return next();
}

function rateLimit({ windowMs, limit, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (record.resetAt <= now) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > limit) {
      return res.status(429).json({ error: message || 'Too many requests. Try again soon.' });
    }

    return next();
  };
}

module.exports = {
  rateLimit,
  securityHeaders
};
