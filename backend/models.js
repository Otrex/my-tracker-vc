const { Sequelize, DataTypes, Op } = require('sequelize');
const { DB_DIALECT, DB_PATH } = require('./config');

const sequelize = new Sequelize({
  dialect: DB_DIALECT,
  storage: DB_PATH,
  logging: false
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  display_name: { type: DataTypes.STRING },
  reset_token: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, {
  tableName: 'users',
  timestamps: false
});

const Routine = sequelize.define('Routine', {
  day: { type: DataTypes.STRING, allowNull: false },
  planned_activity: { type: DataTypes.STRING },
  planned_duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  completed: { type: DataTypes.STRING, defaultValue: 'No' },
  actual_duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  miles_travelled: { type: DataTypes.FLOAT, defaultValue: 0 },
  skips_reps: { type: DataTypes.INTEGER, defaultValue: 0 },
  workout_notes: { type: DataTypes.TEXT, defaultValue: '' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  week_start: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'routine',
  timestamps: false,
  indexes: [{ unique: true, fields: ['week_start', 'day'] }]
});

const DietEntry = sequelize.define('DietEntry', {
  user_username: { type: DataTypes.STRING, allowNull: false },
  entry_date: { type: DataTypes.STRING, allowNull: false },
  meal_type: { type: DataTypes.STRING, allowNull: false },
  meal_time: { type: DataTypes.STRING, defaultValue: '' },
  food: { type: DataTypes.STRING, allowNull: false },
  serving: { type: DataTypes.STRING, defaultValue: '' },
  source: { type: DataTypes.STRING, defaultValue: '' },
  calories: { type: DataTypes.FLOAT, defaultValue: 0 },
  protein: { type: DataTypes.FLOAT, defaultValue: 0 },
  carbs: { type: DataTypes.FLOAT, defaultValue: 0 },
  fat: { type: DataTypes.FLOAT, defaultValue: 0 },
  fiber: { type: DataTypes.FLOAT, defaultValue: 0 },
  sugar: { type: DataTypes.FLOAT, defaultValue: 0 },
  sodium_mg: { type: DataTypes.FLOAT, defaultValue: 0 },
  water_liters: { type: DataTypes.FLOAT, defaultValue: 0 },
  hunger_before: { type: DataTypes.FLOAT, defaultValue: 5 },
  energy_after: { type: DataTypes.FLOAT, defaultValue: 5 },
  tags: { type: DataTypes.TEXT, defaultValue: '[]' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  created_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, {
  tableName: 'diet_entries',
  timestamps: false
});

const DietGoal = sequelize.define('DietGoal', {
  user_username: { type: DataTypes.STRING, unique: true, allowNull: false },
  calorie_goal: { type: DataTypes.FLOAT, defaultValue: 2200 },
  protein_goal: { type: DataTypes.FLOAT, defaultValue: 120 },
  carbs_goal: { type: DataTypes.FLOAT, defaultValue: 240 },
  fat_goal: { type: DataTypes.FLOAT, defaultValue: 70 },
  fiber_goal: { type: DataTypes.FLOAT, defaultValue: 30 },
  water_goal: { type: DataTypes.FLOAT, defaultValue: 2.5 },
  notes: { type: DataTypes.TEXT, defaultValue: '' }
}, {
  tableName: 'diet_goals',
  underscored: true
});

const Setting = sequelize.define('Setting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'settings',
  timestamps: false
});

const LearningSubject = sequelize.define('LearningSubject', {
  user_username: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  learning_plan: { type: DataTypes.TEXT, defaultValue: '' },
  total_duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  duration_per_day: { type: DataTypes.FLOAT },
  goal_questions: { type: DataTypes.TEXT, defaultValue: '[]' },
  status: { type: DataTypes.STRING, defaultValue: 'Active' }
}, {
  tableName: 'learning_subjects',
  underscored: true
});

const LearningSession = sequelize.define('LearningSession', {
  user_username: { type: DataTypes.STRING, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  session_date: { type: DataTypes.STRING, allowNull: false },
  planned_duration: { type: DataTypes.FLOAT, defaultValue: 1 },
  actual_duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: { type: DataTypes.TEXT, defaultValue: '' }
}, {
  tableName: 'learning_sessions',
  underscored: true
});

const ExamAttempt = sequelize.define('ExamAttempt', {
  user_username: { type: DataTypes.STRING, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  answers: { type: DataTypes.TEXT, defaultValue: '[]' },
  score: { type: DataTypes.FLOAT, defaultValue: 0 },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  feedback: { type: DataTypes.TEXT, defaultValue: '' }
}, {
  tableName: 'exam_attempts',
  underscored: true
});

const Challenge = sequelize.define('Challenge', {
  challenger_username: { type: DataTypes.STRING, allowNull: false },
  opponent_username: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'Learning' },
  target: { type: DataTypes.STRING, defaultValue: '' },
  status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  winner_username: { type: DataTypes.STRING },
  completed_at: { type: DataTypes.DATE }
}, {
  tableName: 'challenges',
  underscored: true
});

async function ensureColumn(tableName, columnName, definition) {
  const description = await sequelize.getQueryInterface().describeTable(tableName);
  if (!description[columnName]) {
    await sequelize.getQueryInterface().addColumn(tableName, columnName, definition);
  }
}

async function syncDatabase() {
  await sequelize.sync();

  await ensureColumn('users', 'reset_token', { type: DataTypes.STRING });
  await ensureColumn('users', 'display_name', { type: DataTypes.STRING });
  await ensureColumn('routine', 'miles_travelled', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('routine', 'skips_reps', { type: DataTypes.INTEGER, defaultValue: 0 });
  await ensureColumn('routine', 'workout_notes', { type: DataTypes.TEXT, defaultValue: '' });

  await ensureColumn('diet_entries', 'meal_time', { type: DataTypes.STRING, defaultValue: '' });
  await ensureColumn('diet_entries', 'serving', { type: DataTypes.STRING, defaultValue: '' });
  await ensureColumn('diet_entries', 'source', { type: DataTypes.STRING, defaultValue: '' });
  await ensureColumn('diet_entries', 'carbs', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('diet_entries', 'fat', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('diet_entries', 'fiber', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('diet_entries', 'sugar', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('diet_entries', 'sodium_mg', { type: DataTypes.FLOAT, defaultValue: 0 });
  await ensureColumn('diet_entries', 'hunger_before', { type: DataTypes.FLOAT, defaultValue: 5 });
  await ensureColumn('diet_entries', 'energy_after', { type: DataTypes.FLOAT, defaultValue: 5 });
  await ensureColumn('diet_entries', 'tags', { type: DataTypes.TEXT, defaultValue: '[]' });
}

module.exports = {
  Challenge,
  DataTypes,
  DietEntry,
  DietGoal,
  ExamAttempt,
  LearningSession,
  LearningSubject,
  Op,
  Routine,
  Sequelize,
  Setting,
  User,
  sequelize,
  syncDatabase
};
