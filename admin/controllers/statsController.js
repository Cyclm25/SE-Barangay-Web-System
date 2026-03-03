const pool = require("../db");

async function getResidentTypeStats(req, res) {
  try {
    const q = `
      SELECT "ResidentType" AS type, COUNT(*)::int AS count
      FROM resident
      WHERE "ResidentType" IS NOT NULL AND TRIM("ResidentType") <> ''
      GROUP BY "ResidentType"
      ORDER BY count DESC;
    `;

    const { rows } = await pool.query(q);

    return res.json({ data: rows });
  } catch (err) {
    console.error("resident-types stats error:", err);
    return res.status(500).json({ error: "Failed to fetch resident type statistics" });
  }
}

module.exports = { getResidentTypeStats };