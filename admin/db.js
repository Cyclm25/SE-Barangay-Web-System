const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "ramennagi",
  database: "barangay160_db",
});

module.exports = pool;
