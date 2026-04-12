const jwt = require('jsonwebtoken');
const { JWT_SECRET, UPDATE_TOKEN } = require('../config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Missing authorization token' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function hasBackOfficeToken(req) {
  return req.get('x-update-token') === UPDATE_TOKEN;
}

module.exports = {
  hasBackOfficeToken,
  requireAuth
};
