const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const pool = require("./db");

/* ================================
   ANNOUNCEMENT AUTOMATION
   - Runs once on startup (after server
     is listening so DB is ready)
   - Then repeats every 60 seconds
================================ */
const {
  router: announcementsRouter,
  publishScheduledAnnouncements,
  archiveExpiredAnnouncements,
} = require("./routes/announcements");

async function runAnnouncementScheduler(label = "interval") {
  try {
    const pubResult = await publishScheduledAnnouncements();
    if (pubResult.rowCount > 0) {
      console.log(
        `[Scheduler][${label}] Published ${pubResult.rowCount} scheduled announcement(s)`
      );
    } 
    // SPAM FIX: Commented this out so it stops flooding your terminal!
    // else {
    //   console.log(`[Scheduler][${label}] No scheduled announcements to publish`);
    // }

    const archResult = await archiveExpiredAnnouncements();
    if (archResult.rowCount > 0) {
      console.log(
        `[Scheduler][${label}] Archived ${archResult.rowCount} expired announcement(s)`
      );
    }
  } catch (err) {
    console.error(`[Scheduler][${label}] Error:`, err.message);
  }
}

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

// Inline resident-types stat
app.get("/api/stats/resident-types", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT "ResidentType" AS type, COUNT(*)::int AS count
      FROM resident
      WHERE "ResidentType" IS NOT NULL AND TRIM("ResidentType") <> ''
      GROUP BY "ResidentType"
      ORDER BY count DESC
    `);
    return res.json({ data: result.rows });
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
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/_dbinfo", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS db,
        current_schema()   AS schema,
        inet_server_addr() AS server_ip,
        inet_server_port() AS server_port
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   START SERVER
================================ */
const PORT = 5001;
app.listen(PORT, async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log("[Scheduler] Announcement automation started — checking every 60s");

  // Run immediately now that the server + DB are ready
  await runAnnouncementScheduler("startup");

  // Then repeat every 60 seconds
  setInterval(() => runAnnouncementScheduler("interval"), 60 * 1000);
});