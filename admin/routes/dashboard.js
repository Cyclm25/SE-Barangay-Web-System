// backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

async function getResidentDateColumn() {
  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resident'
      AND column_name IN ('DateRegistered', 'DateCreated', 'dateRegistered', 'datecreated', 'created_at', 'CreatedAt')
    ORDER BY CASE column_name
      WHEN 'DateRegistered' THEN 1
      WHEN 'DateCreated' THEN 2
      WHEN 'dateRegistered' THEN 3
      WHEN 'datecreated' THEN 4
      WHEN 'CreatedAt' THEN 5
      WHEN 'created_at' THEN 6
      ELSE 99
    END
    LIMIT 1
    `
  );

  return result.rows[0]?.column_name || null;
}

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const cutoff =
      typeof req.query.cutoff === "string" && req.query.cutoff.trim()
        ? req.query.cutoff.trim()
        : null;

    const residentDateColumn = await getResidentDateColumn();
    const residentDateField = residentDateColumn
      ? residentDateColumn === residentDateColumn.toLowerCase()
        ? `r.${residentDateColumn}`
        : `r."${residentDateColumn}"`
      : null;
    const residentDateFieldNoAlias = residentDateColumn
      ? residentDateColumn === residentDateColumn.toLowerCase()
        ? residentDateColumn
        : `"${residentDateColumn}"`
      : null;

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

    const newResidentsQ = residentDateFieldNoAlias
      ? cutoff
        ? pool.query(
            `
            SELECT COUNT(*)::int AS count
            FROM resident
            WHERE COALESCE(status, 'Active') = 'Active'
              AND ${residentDateFieldNoAlias} >= $1::date
            `,
            [cutoff]
          )
        : pool.query(`
            SELECT COUNT(*)::int AS count
            FROM resident
            WHERE COALESCE(status, 'Active') = 'Active'
              AND ${residentDateFieldNoAlias} >= CURRENT_DATE - INTERVAL '30 days'
          `)
      : Promise.resolve({ rows: [{ count: 0 }] });

    const weeklyTrendQ = residentDateField
      ? pool.query(`
          WITH weeks AS (
            SELECT generate_series(0, 3) AS offset
          )
          SELECT
            CONCAT('Week ', 4 - weeks.offset) AS week,
            COUNT(r.*)::int AS count
          FROM weeks
          LEFT JOIN resident r
            ON ${residentDateField} >= date_trunc('week', CURRENT_DATE) - ((3 - weeks.offset) * INTERVAL '1 week')
           AND ${residentDateField} < date_trunc('week', CURRENT_DATE) - ((2 - weeks.offset) * INTERVAL '1 week')
           AND COALESCE(r.status, 'Active') = 'Active'
          GROUP BY weeks.offset
          ORDER BY weeks.offset
        `)
      : Promise.resolve({
          rows: [
            { week: "Week 1", count: 0 },
            { week: "Week 2", count: 0 },
            { week: "Week 3", count: 0 },
            { week: "Week 4", count: 0 },
          ],
        });

    const [
      totalResidents,
      totalOfficials,
      pendingRequests,
      readyPickup,
      voterStats,
      newResidents,
      weeklyTrend,
    ] = await Promise.all([
      totalResidentsQ,
      totalOfficialsQ,
      pendingRequestsQ,
      readyPickupQ,
      voterStatsQ,
      newResidentsQ,
      weeklyTrendQ,
    ]);

    res.json({
      totalResidents: totalResidents.rows[0].count,
      totalOfficials: totalOfficials.rows[0].count,
      pendingRequests: pendingRequests.rows[0].count,
      readyPickup: readyPickup.rows[0].count,
      newResidents: newResidents.rows[0].count,
      voters: voterStats.rows[0], // { registered, not_registered }
      weeklyTrend: weeklyTrend.rows,
    });
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
});

module.exports = router;
