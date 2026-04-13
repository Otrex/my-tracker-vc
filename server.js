const createApp = require('./backend/app');
const { PORT } = require('./backend/config');
const { Setting, User, syncDatabase } = require('./backend/models');
const { ensureWeek } = require('./backend/services/routineService');
const { mondayOfWeek } = require('./backend/utils/date');
const { hashSecret } = require('./backend/utils/security');

async function start() {
  await syncDatabase();

  await User.findOrCreate({
    where: { username: 'admin' },
    defaults: { password: hashSecret('morning2025'), display_name: 'Admin' }
  });

  await Setting.findOrCreate({
    where: { key: 'learning_default_duration' },
    defaults: { value: '1' }
  });

  await ensureWeek(mondayOfWeek(new Date()));

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Morning Ritual API running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
