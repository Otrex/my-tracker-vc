const express = require('express');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { currentUserProfile } = require('../services/profileService');
const { route } = require('../utils/http');

const router = express.Router();

router.get('/profile', requireAuth, route(async (req, res) => {
  return res.json(await currentUserProfile(req.user.user));
}));

router.patch('/profile', requireAuth, route(async (req, res) => {
  const displayName = String(req.body?.display_name || '').trim();
  const password = req.body?.password !== undefined ? String(req.body.password) : undefined;
  if (displayName.length < 1) return res.status(400).json({ error: 'Name is required' });
  if (password !== undefined && password.length > 0 && password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const patch = { display_name: displayName };
  if (password) patch.password = password;
  await User.update(patch, { where: { username: req.user.user } });
  return res.json(await currentUserProfile(req.user.user));
}));

module.exports = router;
