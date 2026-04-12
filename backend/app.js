const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const { ROOT_DIR } = require('./config');
const authRoutes = require('./routes/auth');
const dietRoutes = require('./routes/diet');
const exportRoutes = require('./routes/export');
const learningRoutes = require('./routes/learning');
const profileRoutes = require('./routes/profile');
const routineRoutes = require('./routes/routine');
const socialRoutes = require('./routes/social');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', authRoutes);
  app.use('/api', profileRoutes);
  app.use('/api', routineRoutes);
  app.use('/api', dietRoutes);
  app.use('/api', learningRoutes);
  app.use('/api', socialRoutes);
  app.use('/api', exportRoutes);

  const distDir = path.join(ROOT_DIR, 'client', 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) return res.status(404).send('Frontend has not been built yet. Run cd client && npm run build.');
    return res.sendFile(indexPath);
  });

  app.use((error, req, res, next) => {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
