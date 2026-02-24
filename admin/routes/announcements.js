const router = require("express").Router();
const pool = require("../db");

/**
 * ADMIN fetch (optionally filter by status):
 * GET /api/announcements?status=Active|Drafts|Archived
 */
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;

    let query = `SELECT * FROM announcement`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE "Status" = $1`;
    }

    query += ` ORDER BY "CreatedAt" DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Announcement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * RESIDENT fetch (visible only):
 * GET /api/announcements/resident
 * Visible = Status is 'Active'
 */
router.get("/resident", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM announcement
      WHERE "Status" = 'Active'
      ORDER BY "CreatedAt" DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Resident Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE announcement:
 * POST /api/announcements
 *
 * Important:
 * Your UI sends status like: "posted" | "draft" | "archived"
 * But DB expects: "Active" | "Drafts" | "Archived"
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      body,
      postedByRole,
      postedById,
      status,          // UI value: posted/draft/archived OR DB value
      targetAudience,  // maps to "Category"
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    // ✅ Normalize UI -> DB status
    const uiStatus = (status || "posted").toLowerCase();
    const dbStatus =
      uiStatus === "posted" ? "Active" :
        uiStatus === "draft" ? "Drafts" :
          uiStatus === "archived" ? "Archived" :
            // if someone already sends Active/Drafts/Archived, keep it safe:
            (status === "Active" || status === "Drafts" || status === "Archived") ? status :
              "Active";

    const result = await pool.query(
      `
      INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
      `,
      [
        title,
        body,
        postedByRole,
        postedById,
        targetAudience || "All",
        dbStatus, // ✅ use normalized status
      ]
    );

    const newAnnouncement = result.rows[0];

    // ==============================
    // ✅ INSERT TRANSACTION LOG HERE
    // ==============================

    await pool.query(
      `
  INSERT INTO transaction_history
    ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
  VALUES
    ($1,$2,$3,$4,$5,$6,NOW())
  `,
      [
        null,                  // not tied to request
        postedById,            // this is the admin/superadmin ID
        "Posted Announcement", // action
        dbStatus,              // Active/Drafts/Archived
        "Announcements",       // module
        title                  // store title as detail
      ]
    );

    // return response AFTER logging
    res.status(201).json(newAnnouncement);
  } catch (err) {
    console.error("Create Announcement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ARCHIVE (hide from residents):
 * PATCH /api/announcements/:id/archive
 */
router.patch("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE announcement
      SET "Status" = 'Archived'
      WHERE "AnnouncementID" = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Archive Announcement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;