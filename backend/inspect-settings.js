require("dotenv").config();
const pool = require("./config/db");
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' ORDER BY ordinal_position")
  .then(result => console.log(JSON.stringify(result.rows, null, 2)))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => pool.end());
