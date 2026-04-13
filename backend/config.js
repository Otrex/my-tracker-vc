const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.join(__dirname, '..');

module.exports = {
  ROOT_DIR,
  PORT: Number(process.env.PORT || 3001),
  JWT_SECRET: process.env.JWT_SECRET || 'MORNING_SECRET',
  UPDATE_TOKEN: process.env.UPDATE_TOKEN || 'BACKOFFICE2025',
  RESET_GLOBAL_TOKEN: process.env.RESET_GLOBAL_TOKEN || 'RESET2025',
  DB_PATH: process.env.DB_PATH || path.join(ROOT_DIR, 'morning-ritual.db'),
  DB_DIALECT: process.env.DB_DIALECT || 'sqlite',
  DB_URL: process.env.DB_URL || '',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || '',
  DB_NAME: process.env.DB_NAME || 'morning_ritual',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_LOGGING: process.env.DB_LOGGING === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
