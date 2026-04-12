const express = require('express');
const { Routine, sequelize } = require('../models');
const { hasBackOfficeToken, requireAuth } = require('../middleware/auth');
const { getWeekRows, todayDayName } = require('../services/routineService');
const { mondayOfWeek } = require('../utils/date');
const { normalNumber, plain, route, validateNonNegative } = require('../utils/http');

const router = express.Router();

router.get('/routine', requireAuth, route(async (req, res) => {
  const rows = await getWeekRows(req.query.week);
  return res.json(rows.map(plain));
}));

router.patch('/routine/:id', requireAuth, route(async (req, res) => {
  const row = await Routine.findByPk(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Routine row not found' });

  const changingPlan = req.body.planned_activity !== undefined || req.body.planned_duration !== undefined;
  const canUseDailyCheckIn = row.week_start === mondayOfWeek(new Date()) && row.day === todayDayName() && !changingPlan;
  if (!hasBackOfficeToken(req) && !canUseDailyCheckIn) {
    return res.status(403).json({ error: 'Back-office update token required to edit this day' });
  }

  const next = {
    completed: req.body.completed !== undefined ? req.body.completed : row.completed,
    actual_duration: req.body.actual_duration !== undefined ? normalNumber(req.body.actual_duration) : row.actual_duration,
    miles_travelled: req.body.miles_travelled !== undefined ? normalNumber(req.body.miles_travelled) : Number(row.miles_travelled || 0),
    skips_reps: req.body.skips_reps !== undefined ? normalNumber(req.body.skips_reps) : Number(row.skips_reps || 0),
    workout_notes: req.body.workout_notes !== undefined ? String(req.body.workout_notes) : row.workout_notes || '',
    notes: req.body.notes !== undefined ? String(req.body.notes) : row.notes || '',
    planned_activity: req.body.planned_activity !== undefined ? String(req.body.planned_activity) : row.planned_activity,
    planned_duration: req.body.planned_duration !== undefined ? normalNumber(req.body.planned_duration) : row.planned_duration
  };

  if (!['Yes', 'No', 'Partial'].includes(next.completed)) return res.status(400).json({ error: 'completed must be Yes, No, or Partial' });
  const error = validateNonNegative(next.actual_duration, 'actual_duration')
    || validateNonNegative(next.planned_duration, 'planned_duration')
    || validateNonNegative(next.miles_travelled, 'miles_travelled')
    || validateNonNegative(next.skips_reps, 'skips_reps');
  if (error) return res.status(400).json({ error });

  await row.update(next);
  return res.json(plain(row));
}));

router.get('/weeks', requireAuth, route(async (req, res) => {
  const rows = await Routine.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('week_start')), 'week_start']],
    order: [['week_start', 'DESC']]
  });
  return res.json(rows.map((row) => row.week_start));
}));

module.exports = router;
