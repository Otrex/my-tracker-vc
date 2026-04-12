const express = require('express');
const { DietEntry } = require('../models');
const { requireAuth } = require('../middleware/auth');
const {
  entryPayload,
  getDailyDiet,
  getGoals,
  getWeeklyDiet,
  publicEntry,
  updateGoals,
  validateEntry
} = require('../services/dietService');
const { route } = require('../utils/http');

const router = express.Router();

router.get('/diet', requireAuth, route(async (req, res) => {
  return res.json(await getDailyDiet(req.user.user, req.query.date));
}));

router.get('/diet/weekly', requireAuth, route(async (req, res) => {
  return res.json(await getWeeklyDiet(req.user.user, req.query.week));
}));

router.get('/diet/goals', requireAuth, route(async (req, res) => {
  return res.json(await getGoals(req.user.user));
}));

router.patch('/diet/goals', requireAuth, route(async (req, res) => {
  const result = await updateGoals(req.user.user, req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  return res.json(result.goal);
}));

router.post('/diet', requireAuth, route(async (req, res) => {
  const next = entryPayload(req.user.user, req.body || {}, {
    entry_date: req.body?.entry_date,
    meal_type: 'Meal',
    food: ''
  });
  const error = validateEntry(next);
  if (error) return res.status(400).json({ error });

  return res.status(201).json(publicEntry(await DietEntry.create(next)));
}));

router.patch('/diet/:id', requireAuth, route(async (req, res) => {
  const entry = await DietEntry.findOne({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!entry) return res.status(404).json({ error: 'Diet entry not found' });

  const next = entryPayload(req.user.user, req.body || {}, entry.get({ plain: true }));
  const error = validateEntry(next);
  if (error) return res.status(400).json({ error });

  await entry.update(next);
  return res.json(publicEntry(entry));
}));

router.delete('/diet/:id', requireAuth, route(async (req, res) => {
  const count = await DietEntry.destroy({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!count) return res.status(404).json({ error: 'Diet entry not found' });
  return res.status(204).send();
}));

module.exports = router;
