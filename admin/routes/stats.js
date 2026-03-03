const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/stats/resident-types
router.get("/resident-types", async (req, res) => {
  try {
    const q = `
      SELECT "ResidentType" AS type, COUNT(*)::int AS count
      FROM resident
      WHERE "ResidentType" IS NOT NULL AND TRIM("ResidentType") <> ''
      GROUP BY "ResidentType"
      ORDER BY count DESC;
    `;

    const result = await pool.query(q);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("resident-types stats error:", err);
    return res.status(500).json({ error: "Failed to fetch resident type stats" });
  }
});

module.exports = router;