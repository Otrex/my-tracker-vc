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
  DB_DIALECT: process.env.DB_DIALECT || 'sqlite'
};
