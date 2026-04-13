const express = require('express');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { currentUserProfile } = require('../services/profileService');
const { route } = require('../utils/http');
const { hashSecret } = require('../utils/security');

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

  const patch = {
    display_name: displayName,
    email: String(req.body?.email || '').trim(),
    bio: String(req.body?.bio || '').trim(),
    location: String(req.body?.location || '').trim(),
    timezone: String(req.body?.timezone || '').trim(),
    avatar_color: String(req.body?.avatar_color || '#ff8c2a').trim().slice(0, 24),
    fitness_goal: String(req.body?.fitness_goal || '').trim(),
    diet_goal: String(req.body?.diet_goal || '').trim(),
    learning_goal: String(req.body?.learning_goal || '').trim(),
    game_handle: String(req.body?.game_handle || '').trim(),
    privacy_level: ['Private', 'Friends', 'Public'].includes(req.body?.privacy_level) ? req.body.privacy_level : 'Friends'
  };

  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  if (password) patch.password = hashSecret(password);
  await User.update(patch, { where: { username: req.user.user } });
  return res.json(await currentUserProfile(req.user.user));
}));

module.exports = router;
