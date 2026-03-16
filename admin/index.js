const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const pool = require("./db");

/* ================================
   ANNOUNCEMENT AUTOMATION
================================ */
const {
  router: announcementsRouter,
  publishScheduledAnnouncements,
  archiveExpiredAnnouncements,
} = require("./routes/announcements");

(async () => {
  try {
    console.log("[AUTO] Running initial scheduled announcements check...");
    const pubResult = await publishScheduledAnnouncements();
    if (pubResult.rowCount > 0) {
      console.log(
        `[AUTO] Published ${pubResult.rowCount} scheduled announcement(s) on startup`
      );
    }

    console.log("[AUTO] Running initial expired announcements check...");
    const archResult = await archiveExpiredAnnouncements();
    if (archResult.rowCount > 0) {
      console.log(
        `[AUTO] Archived ${archResult.rowCount} expired announcement(s) on startup`
      );
    }
  } catch (err) {
    console.error("[AUTO] Error during startup checks:", err.message);
  }
})();

setInterval(async () => {
  try {
    const result = await publishScheduledAnnouncements();
    if (result.rowCount > 0) {
      console.log(
        `[AUTO] Published ${result.rowCount} scheduled announcement(s)`
      );
    }
  } catch (err) {
    console.error("[AUTO] Error publishing scheduled announcements:", err.message);
  }
}, 60 * 1000);

setInterval(async () => {
  try {
    console.log("[Announcement Expiration] Checking for expired announcements...");
    const result = await archiveExpiredAnnouncements();
    if (result.rowCount > 0) {
      console.log(
        `[AUTO] Archived ${result.rowCount} expired announcement(s)`
      );
    }
  } catch (err) {
    console.error("[AUTO] Error archiving expired announcements:", err.message);
  }
}, 60 * 1000);

console.log("[AUTO] Announcement automation started - checking every 1 minute");

/* ================================
   MIDDLEWARE
================================ */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   API ROUTES
================================ */
const dashboardRoutes = require("./routes/dashboard");
app.use("/api/dashboard", dashboardRoutes);

console.log(
  "Loading route '/api/officials' from:",
  require.resolve("./routes/officials")
);
app.use("/api/officials", require("./routes/officials"));

console.log(
  "Loading route '/api/announcements' from:",
  require.resolve("./routes/announcements")
);
app.use("/api/announcements", announcementsRouter);

try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
} catch (err) {
  console.error("Failed to load auth routes:", err.message);
}

app.use("/residents", require("./routes/residents"));
app.use("/requests", require("./routes/requests"));
app.use("/api/otp", require("./routes/otp"));

console.log(
  "Loading route '/api/transactions' from:",
  require.resolve("./routes/transactions")
);
app.use("/api/transactions", require("./routes/transactions"));

const statsRoutes = require("./routes/stats");
app.use("/api/stats", statsRoutes);

console.log("Loading route '/api/upload'");
app.use("/api/upload", require("./routes/upload"));

app.get("/api/stats/resident-types", async (req, res) => {
  try {
    const q = `
      SELECT "ResidentType" AS type, COUNT(*)::int AS count
      FROM resident
      WHERE "ResidentType" IS NOT NULL AND TRIM("ResidentType") <> ''
      GROUP BY "ResidentType"
      ORDER BY count DESC;
    `;
    const r = await pool.query(q);
    return res.json({ data: r.rows });
  } catch (err) {
    console.error("resident-types stats error:", err);
    return res.status(500).json({ error: "Failed to fetch resident type stats" });
  }
});

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
   START SERVER
================================ */
const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});