const { DietEntry, DietGoal, Op } = require('../models');
const { addDays, dateToIso, mondayOfWeek, parseIsoDate } = require('../utils/date');
const { clamp, normalNumber, plain, validateNonNegative } = require('../utils/http');

const DEFAULT_GOALS = {
  calorie_goal: 2200,
  protein_goal: 120,
  carbs_goal: 240,
  fat_goal: 70,
  fiber_goal: 30,
  water_goal: 2.5,
  notes: ''
};

const DIET_NUMBER_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium_mg',
  'water_liters'
];

const GOAL_FIELDS = [
  'calorie_goal',
  'protein_goal',
  'carbs_goal',
  'fat_goal',
  'fiber_goal',
  'water_goal'
];

function parseTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    } catch (error) {
      return value.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
  }

  return [];
}

function serializeTags(value) {
  return JSON.stringify(parseTags(value));
}

function publicEntry(entry) {
  const row = plain(entry);
  return row ? { ...row, tags: parseTags(row.tags) } : null;
}

function summarize(entries) {
  const totals = entries.reduce((acc, entry) => {
    DIET_NUMBER_FIELDS.forEach((field) => {
      acc[field] += Number(entry[field] || 0);
    });
    acc.hunger_before += Number(entry.hunger_before || 0);
    acc.energy_after += Number(entry.energy_after || 0);
    return acc;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium_mg: 0,
    water_liters: 0,
    hunger_before: 0,
    energy_after: 0,
    meal_count: entries.length
  });

  if (entries.length) {
    totals.hunger_before = Number((totals.hunger_before / entries.length).toFixed(1));
    totals.energy_after = Number((totals.energy_after / entries.length).toFixed(1));
  }

  return totals;
}

function withGoalMath(summary, goals) {
  const goalMap = {
    calories: Number(goals.calorie_goal || 0),
    protein: Number(goals.protein_goal || 0),
    carbs: Number(goals.carbs_goal || 0),
    fat: Number(goals.fat_goal || 0),
    fiber: Number(goals.fiber_goal || 0),
    water_liters: Number(goals.water_goal || 0)
  };

  const adherence = Object.entries(goalMap).reduce((acc, [field, goal]) => {
    acc[field] = goal > 0 ? Math.min(150, Math.round((Number(summary[field] || 0) / goal) * 100)) : 0;
    return acc;
  }, {});

  const remaining = Object.entries(goalMap).reduce((acc, [field, goal]) => {
    acc[field] = Number((goal - Number(summary[field] || 0)).toFixed(field === 'water_liters' ? 1 : 0));
    return acc;
  }, {});

  return { adherence, goals: goalMap, remaining };
}

async function getGoals(username) {
  const [goal] = await DietGoal.findOrCreate({
    where: { user_username: username },
    defaults: { user_username: username, ...DEFAULT_GOALS }
  });

  return plain(goal);
}

async function updateGoals(username, payload) {
  const goal = await getGoals(username);
  const patch = {};

  GOAL_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) patch[field] = normalNumber(payload[field], goal[field]);
  });

  if (payload.notes !== undefined) patch.notes = String(payload.notes || '');

  const error = GOAL_FIELDS.reduce((message, field) => {
    return message || (patch[field] !== undefined ? validateNonNegative(patch[field], field) : null);
  }, null);
  if (error) return { error };

  await DietGoal.update(patch, { where: { user_username: username } });
  return { goal: await getGoals(username) };
}

function entryPayload(username, body, existing = {}) {
  const entry = {
    user_username: username,
    entry_date: body.entry_date !== undefined
      ? dateToIso(parseIsoDate(body.entry_date))
      : dateToIso(parseIsoDate(existing.entry_date)),
    meal_type: body.meal_type !== undefined ? String(body.meal_type || 'Meal').trim() : existing.meal_type,
    meal_time: body.meal_time !== undefined ? String(body.meal_time || '') : existing.meal_time || '',
    food: body.food !== undefined ? String(body.food || '').trim() : existing.food,
    serving: body.serving !== undefined ? String(body.serving || '') : existing.serving || '',
    source: body.source !== undefined ? String(body.source || '') : existing.source || '',
    notes: body.notes !== undefined ? String(body.notes || '') : existing.notes || '',
    hunger_before: body.hunger_before !== undefined ? clamp(body.hunger_before, 0, 10) : Number(existing.hunger_before ?? 5),
    energy_after: body.energy_after !== undefined ? clamp(body.energy_after, 0, 10) : Number(existing.energy_after ?? 5),
    tags: body.tags !== undefined ? serializeTags(body.tags) : existing.tags || '[]'
  };

  DIET_NUMBER_FIELDS.forEach((field) => {
    entry[field] = body[field] !== undefined ? normalNumber(body[field]) : Number(existing[field] || 0);
  });

  return entry;
}

function validateEntry(entry) {
  if (!entry.food) return 'Food is required';
  return DIET_NUMBER_FIELDS.reduce((message, field) => message || validateNonNegative(entry[field], field), null);
}

async function getDailyDiet(username, date) {
  const entryDate = dateToIso(parseIsoDate(date));
  const entries = await DietEntry.findAll({
    where: { user_username: username, entry_date: entryDate },
    order: [['created_at', 'ASC'], ['id', 'ASC']]
  });
  const plainEntries = entries.map(publicEntry);
  const summary = summarize(plainEntries);
  const goals = await getGoals(username);

  return {
    date: entryDate,
    entries: plainEntries,
    summary,
    goal_details: goals,
    ...withGoalMath(summary, goals)
  };
}

async function getWeeklyDiet(username, week) {
  const weekStart = mondayOfWeek(week);
  const dates = Array.from({ length: 7 }, (_value, index) => dateToIso(addDays(weekStart, index)));
  const entries = await DietEntry.findAll({
    where: {
      user_username: username,
      entry_date: { [Op.between]: [dates[0], dates[6]] }
    },
    order: [['entry_date', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']]
  });
  const byDate = entries.map(publicEntry).reduce((acc, entry) => {
    acc[entry.entry_date] = acc[entry.entry_date] || [];
    acc[entry.entry_date].push(entry);
    return acc;
  }, {});
  const goals = await getGoals(username);

  const days = dates.map((date) => {
    const dayEntries = byDate[date] || [];
    const summary = summarize(dayEntries);
    return {
      date,
      entries_count: dayEntries.length,
      summary,
      ...withGoalMath(summary, goals)
    };
  });

  return { week_start: weekStart, goals, days };
}

module.exports = {
  entryPayload,
  getDailyDiet,
  getGoals,
  getWeeklyDiet,
  publicEntry,
  updateGoals,
  validateEntry
};
