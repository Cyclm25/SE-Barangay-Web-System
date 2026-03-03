// backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    // 1) totals
    const totalResidentsQ = pool.query(
      `SELECT COUNT(*)::int AS count FROM resident`
    );

    const totalOfficialsQ = pool.query(
      `SELECT COUNT(*)::int AS count FROM barangayadmin`
    );

    // 2) requests by status (uses your real column: "RequestStatus")
    const pendingRequestsQ = pool.query(`
      SELECT COUNT(*)::int AS count
      FROM request
      WHERE "RequestStatus" = 'Pending'
    `);

    const readyPickupQ = pool.query(`
      SELECT COUNT(*)::int AS count
      FROM request
      WHERE "RequestStatus" = 'Ready for Pickup'
    `);

    // 3) voter stats (BOOLEAN column: "VoterStatus")
    const voterStatsQ = pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE "VoterStatus" IS TRUE)::int  AS registered,
        COUNT(*) FILTER (WHERE "VoterStatus" IS FALSE OR "VoterStatus" IS NULL)::int AS not_registered
      FROM resident
      WHERE COALESCE(status, 'Active') = 'Active'
    `);

    const [
      totalResidents,
      totalOfficials,
      pendingRequests,
      readyPickup,
      voterStats,
    ] = await Promise.all([
      totalResidentsQ,
      totalOfficialsQ,
      pendingRequestsQ,
      readyPickupQ,
      voterStatsQ,
    ]);

    res.json({
      totalResidents: totalResidents.rows[0].count,
      totalOfficials: totalOfficials.rows[0].count,
      pendingRequests: pendingRequests.rows[0].count,
      readyPickup: readyPickup.rows[0].count,
      voters: voterStats.rows[0], // { registered, not_registered }
    });
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
});

module.exports = router;