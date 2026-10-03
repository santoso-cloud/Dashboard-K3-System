'use strict';
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const app = require('./backend/src/app');
const pool = require('./backend/config/db');
const port = Number(process.env.PORT || 5000);

async function start() {
  await pool.query('SELECT 1');
  const server = app.listen(port, () => {
    console.log(`PT JASIL K3 - JASIL SAFETY: http://localhost:${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => pool.end()));
  }
}

start().catch(async (error) => {
  console.error('Server gagal dimulai:', error.code || error.message || 'CONNECTION_ERROR');
  await pool.end();
  process.exitCode = 1;
});
