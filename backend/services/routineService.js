const { Routine, sequelize } = require('../models');
const { dateToIso, mondayOfWeek } = require('../utils/date');

const WEEK_TEMPLATE = [
  { day: 'Monday', planned_activity: 'Stretching', planned_duration: 1.0 },
  { day: 'Tuesday', planned_activity: 'Stretching', planned_duration: 1.0 },
  { day: 'Wednesday', planned_activity: 'Skipping/Walking', planned_duration: 1.25 },
  { day: 'Thursday', planned_activity: 'Skipping/Walking', planned_duration: 1.25 },
  { day: 'Friday', planned_activity: 'Skipping/Walking', planned_duration: 1.25 },
  { day: 'Saturday', planned_activity: 'Cycling & Jogging', planned_duration: 2.0 },
  { day: 'Sunday', planned_activity: 'Stretching', planned_duration: 1.0 }
];

const DAYS = WEEK_TEMPLATE.map((item) => item.day);

const DAY_ORDER_SQL = `
  CASE day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    WHEN 'Sunday' THEN 7
  END
`;

function todayDayName() {
  const today = new Date();
  return DAYS[(today.getDay() + 6) % 7];
}

async function ensureWeek(week) {
  const weekStart = mondayOfWeek(week);

  for (const item of WEEK_TEMPLATE) {
    await Routine.findOrCreate({
      where: { week_start: weekStart, day: item.day },
      defaults: {
        ...item,
        week_start: weekStart,
        completed: 'No',
        actual_duration: 0,
        miles_travelled: 0,
        skips_reps: 0,
        workout_notes: '',
        notes: ''
      }
    });
  }

  return weekStart;
}

async function getWeekRows(week) {
  const weekStart = await ensureWeek(week);
  return Routine.findAll({
    where: { week_start: weekStart },
    order: sequelize.literal(DAY_ORDER_SQL)
  });
}

module.exports = {
  DAYS,
  DAY_ORDER_SQL,
  WEEK_TEMPLATE,
  dateToIso,
  ensureWeek,
  getWeekRows,
  todayDayName
};
