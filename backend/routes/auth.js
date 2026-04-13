const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, RESET_GLOBAL_TOKEN } = require('../config');
const { User } = require('../models');
const { route } = require('../utils/http');
const { hashSecret, isHashedSecret, verifySecret } = require('../utils/security');

const router = express.Router();

router.post('/login', route(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ where: { username } });

  if (!user || !verifySecret(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

  if (!isHashedSecret(user.password)) {
    await user.update({ password: hashSecret(password) });
  }

  const token = jwt.sign({ user: user.username }, JWT_SECRET, { expiresIn: '24h' });
  return res.json({ token, user: { username: user.username, display_name: user.display_name || user.username } });
}));

router.post('/register', route(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const user = await User.create({ username, password: hashSecret(password), display_name: username });
    const token = jwt.sign({ user: user.username }, JWT_SECRET, { expiresIn: '24h' });
    return res.status(201).json({ token, user: { username, display_name: username } });
  } catch (error) {
    return res.status(409).json({ error: 'Username is already registered' });
  }
}));

router.post('/forgot-password', route(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const resetToken = String(req.body?.reset_token || '');
  if (resetToken !== RESET_GLOBAL_TOKEN) return res.status(403).json({ error: 'Global reset token is invalid' });

  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const issuedToken = crypto.randomBytes(12).toString('hex');
  await user.update({ reset_token: hashSecret(issuedToken) });
  return res.json({ reset_token: issuedToken });
}));

router.post('/reset-password', route(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const resetToken = String(req.body?.reset_token || '');
  const password = String(req.body?.password || '');

  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = await User.findOne({ where: { username } });
  const validStoredToken = user?.reset_token && verifySecret(resetToken, user.reset_token);
  if (!user || (resetToken !== RESET_GLOBAL_TOKEN && !validStoredToken)) {
    return res.status(403).json({ error: 'Reset token is invalid' });
  }

  await user.update({ password: hashSecret(password), reset_token: null });
  return res.json({ ok: true });
}));

module.exports = router;
