const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const pool = require("./db");
const PORT = 5001;

/* =============================================
   1. ANNOUNCEMENT AUTOMATION
============================================= */
let publishScheduledAnnouncements = null;
let archiveExpiredAnnouncements = null;

try {
  const announcementsModule = require("./routes/announcements");

  // supports either:
  // module.exports = router
  // or module.exports = { router, publishScheduledAnnouncements, archiveExpiredAnnouncements }
  publishScheduledAnnouncements =
    announcementsModule.publishScheduledAnnouncements || null;
  archiveExpiredAnnouncements =
    announcementsModule.archiveExpiredAnnouncements || null;
} catch (err) {
  console.error("[AUTO] Failed to load announcement automation:", err.message);
}

async function runAnnouncementScheduler(label = "interval") {
  try {
    if (typeof publishScheduledAnnouncements === "function") {
      const pubResult = await publishScheduledAnnouncements();
      if (pubResult?.rowCount > 0) {
        console.log(
          `[Scheduler][${label}] Published ${pubResult.rowCount} scheduled announcement(s)`
        );
      }
    }

    if (typeof archiveExpiredAnnouncements === "function") {
      const archResult = await archiveExpiredAnnouncements();
      if (archResult?.rowCount > 0) {
        console.log(
          `[Scheduler][${label}] Archived ${archResult.rowCount} expired announcement(s)`
        );
      }
    }
  } catch (err) {
    console.error(`[Scheduler][${label}] Error:`, err.message);
  }
}

// Run once on startup
(async () => {
  try {
    console.log("[AUTO] Running initial sync...");
    await runAnnouncementScheduler("startup");
  } catch (err) {
    console.error("[AUTO] Startup Sync Error:", err.message);
  }
})();

// Run every 1 minute
setInterval(async () => {
  try {
    await runAnnouncementScheduler("interval");
  } catch (err) {
    console.error("[AUTO] Background Sync Error:", err.message);
  }
}, 60000);

/* =============================================
   1.5 OFFICIALS AUTOMATION
============================================= */
let inactivateExpiredOfficials = null;

try {
  const officialsModule = require("./routes/officials");

  // supports either:
  // module.exports = router
  // or module.exports = { router, inactivateExpiredOfficials }
  inactivateExpiredOfficials =
    officialsModule.inactivateExpiredOfficials || null;
} catch (err) {
  console.error("[AUTO] Failed to load officials automation:", err.message);
}

async function runOfficialsScheduler(label = "interval") {
  try {
    if (typeof inactivateExpiredOfficials === "function") {
      const result = await inactivateExpiredOfficials();
      if (result?.rowCount > 0) {
        console.log(
          `[Scheduler][${label}] Inactivated ${result.rowCount} official(s) with expired term(s)`
        );
      }
    }
  } catch (err) {
    console.error(`[Scheduler][${label}] Error:`, err.message);
  }
}

// Run once on startup
(async () => {
  try {
    console.log("[AUTO] Running initial officials check...");
    await runOfficialsScheduler("startup");
  } catch (err) {
    console.error("[AUTO] Officials Startup Check Error:", err.message);
  }
})();

// Run every 1 minute
setInterval(async () => {
  try {
    await runOfficialsScheduler("interval");
  } catch (err) {
    console.error("[AUTO] Officials Background Check Error:", err.message);
  }
}, 60000);

/* =============================================
   2. MIDDLEWARE
============================================= */
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

/* =============================================
   3. SAFE ROUTE LOADER
============================================= */
function loadRoute(modulePath, label) {
  try {
    const mod = require(modulePath);

    // case 1: module.exports = router
    if (typeof mod === "function") {
      console.log(`[ROUTE OK] ${label}`);
      return mod;
    }

    // case 2: module.exports = { router: ... }
    if (mod && typeof mod.router === "function") {
      console.log(`[ROUTE OK] ${label} (using .router)`);
      return mod.router;
    }

    console.error(
      `[ROUTE FAIL] ${label} does not export a router function from ${modulePath}`
    );
    return null;
  } catch (err) {
    console.error(`[ROUTE FAIL] ${label}:`, err.message);
    return null;
  }
}

function safeUse(basePath, modulePath, label) {
  const route = loadRoute(modulePath, label);
  if (route) {
    app.use(basePath, route);
  }
}

/* =============================================
   4. API ROUTES
============================================= */
safeUse("/auth", "./routes/auth", "auth");
safeUse("/residents", "./routes/residents", "residents");
safeUse("/requests", "./routes/requests", "requests");
safeUse("/api/inquiry", "./routes/inquiry", "inquiry");
safeUse("/api/dashboard", "./routes/dashboard", "dashboard");
safeUse("/api/officials", "./routes/officials", "officials");
safeUse("/api/announcements", "./routes/announcements", "announcements");
safeUse("/api/transactions", "./routes/transactions", "transactions");
safeUse("/api/otp", "./routes/otp", "otp");
safeUse("/api/stats", "./routes/stats", "stats");
safeUse("/api/upload", "./routes/upload", "upload");
safeUse("/api/id-ocr", "./routes/idOcr", "id-ocr");

/* =============================================
   5. EXTRA ROUTES
============================================= */
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
    res.json({ data: r.rows });
  } catch (err) {
    console.error("resident-types stats error:", err);
    res.status(500).json({ error: "Failed to fetch resident type stats" });
  }
});

/* =============================================
   6. HEALTH CHECKS
============================================= */
app.get("/", (req, res) => res.send("Backend is running"));
app.get("/_ping", (req, res) => res.status(200).json({ ok: true }));

app.get("/_dbping", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =============================================
   7. START SERVER
============================================= */
app.listen(PORT, () => {
  console.log(`\n=============================================`);
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`=============================================\n`);
});
