const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const { CORS_ORIGIN, ROOT_DIR } = require('./config');
const { rateLimit, securityHeaders } = require('./middleware/security');
const authRoutes = require('./routes/auth');
const dietRoutes = require('./routes/diet');
const exportRoutes = require('./routes/export');
const learningRoutes = require('./routes/learning');
const profileRoutes = require('./routes/profile');
const routineRoutes = require('./routes/routine');
const socialRoutes = require('./routes/social');

function createApp() {
  const app = express();
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    message: 'Too many authentication attempts. Try again later.'
  });

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: false
  }));
  app.use(express.json({ limit: '128kb' }));

  app.use('/api', authLimiter, authRoutes);
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
