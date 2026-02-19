const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const pool = require("./db");

app.get("/_dbinfo", async (req, res) => {
  const r = await pool.query(`
    SELECT current_database() as db,
           current_schema() as schema,
           inet_server_addr() as server_ip,
           inet_server_port() as server_port
  `);
  res.json(r.rows[0]);
});

// API is up
app.get("/_ping", (req, res) => {
  res.json({ ok: true });
});

// DB is reachable
app.get("/_dbping", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.use(cors());

// ===== HEALTH CHECK =====
app.get("/_ping", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ===== ROUTES =====
try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
} catch (err) {
  console.error("Failed to load auth routes:", err.message);
}

app.use("/residents", require("./routes/residents"));
app.use("/requests", require("./routes/requests"));


// ===== START SERVER =====
const PORT = 5001;

app.get("/_ping", (req, res) => {
  res.json({ ok: true });
});

app.get("/_dbping", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
