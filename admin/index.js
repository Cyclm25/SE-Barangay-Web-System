const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const pool = require("./db");

/* ================================
   MIDDLEWARE
================================ */

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* ================================
   HEALTH CHECK ROUTES
================================ */

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/_ping", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/_dbping", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/_dbinfo", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT current_database() as db,
             current_schema() as schema,
             inet_server_addr() as server_ip,
             inet_server_port() as server_port
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/* ================================
   API ROUTES
================================ */

/* ================================
   API ROUTES
================================ */

console.log("Loading route '/api/officials' from:", require.resolve("./routes/officials"));
app.use("/api/officials", require("./routes/officials"));

console.log("Loading route '/api/announcements' from:", require.resolve("./routes/announcements"));
app.use("/api/announcements", require("./routes/announcements"));

try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
} catch (err) {
  console.error("Failed to load auth routes:", err.message);
}

app.use("/residents", require("./routes/residents"));
app.use("/requests", require("./routes/requests"));
app.use("/api/otp", require("./routes/otp"));


/* ================================
   START SERVER
================================ */

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
