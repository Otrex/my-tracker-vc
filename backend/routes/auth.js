const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, RESET_GLOBAL_TOKEN } = require('../config');
const { User } = require('../models');
const { route } = require('../utils/http');
const { hashSecret, isHashedSecret, verifySecret } = require('../utils/security');

const router = express.Router();
const RESET_TOKEN_TTL_MINUTES = 15;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function genericResetMessage() {
  return {
    ok: true,
    message: 'If the account exists and the back-office token is valid, a short-lived reset token has been issued.'
  };
}

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
  const started = Date.now();
  const username = String(req.body?.username || '').trim();
  const backOfficeToken = String(req.body?.reset_token || '');
  if (backOfficeToken !== RESET_GLOBAL_TOKEN) {
    await wait(Math.max(0, 350 - (Date.now() - started)));
    return res.status(403).json({ error: 'Back-office reset token is invalid' });
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    await wait(Math.max(0, 350 - (Date.now() - started)));
    return res.json(genericResetMessage());
  }

  const issuedToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  await user.update({
    reset_token: hashSecret(issuedToken),
    reset_token_expires_at: expiresAt
  });

  await wait(Math.max(0, 350 - (Date.now() - started)));
  return res.json({
    ...genericResetMessage(),
    reset_token: issuedToken,
    expires_at: expiresAt.toISOString()
  });
}));

router.post('/reset-password', route(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const resetToken = String(req.body?.reset_token || '');
  const password = String(req.body?.password || '');
  const confirmPassword = req.body?.confirm_password !== undefined ? String(req.body.confirm_password) : password;

  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

  const user = await User.findOne({ where: { username } });
  const tokenStillValid = user?.reset_token_expires_at && new Date(user.reset_token_expires_at).getTime() > Date.now();
  const validStoredToken = Boolean(user?.reset_token && tokenStillValid && verifySecret(resetToken, user.reset_token));
  if (!user || !validStoredToken) {
    return res.status(403).json({ error: 'Reset token is invalid' });
  }

  await user.update({ password: hashSecret(password), reset_token: null, reset_token_expires_at: null });
  return res.json({ ok: true });
}));

module.exports = router;
