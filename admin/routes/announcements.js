const router = require("express").Router();
const pool = require("../db");

/**
 * ADMIN fetch (optionally filter by status):
 * GET /api/announcements?status=Active|Drafts|Archived
 * 
 * Includes poster name and expiration date
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
 * Visible = Status is 'Active' AND not expired
 */
router.get("/resident", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM announcement
      WHERE "Status" = 'Active'
        AND ("ExpirationDate" IS NULL OR "ExpirationDate" > NOW())
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
 * 
 * NEW: Supports scheduled publishing and expiration
 * - isScheduled: boolean
 * - scheduledPublishDate: ISO date string (e.g., "2026-03-15T10:30:00")
 * - expirationDate: ISO date string (when to archive)
 */
router.post("/", async (req, res) => {
  try {
    const {
      title, body, postedByRole, postedById, status,
      targetAudience, // This will now be an ARRAY: ['Students', 'Health']
      isScheduled, scheduledPublishDate, expirationDate, images
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const finalIsScheduled = isScheduled === true;
    let dbStatus = finalIsScheduled ? "Drafts" : (status === "draft" ? "Drafts" : "Active");
    const finalIsPublished = !finalIsScheduled && dbStatus === "Active";

    // Ensure targetAudience is an array and handle "All" logic
    let categories = Array.isArray(targetAudience) ? targetAudience : ["All"];
    if (categories.length === 0) categories = ["All"];

    const queryText = `
      INSERT INTO announcement (
        "Title", "Body", "PostedByRole", "PostedByID", "Category", "Status", 
        "CreatedAt", "IsScheduled", "ScheduledPublishDate", "PublishedDate", 
        "ExpirationDate", "Images", "IsPublished"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, 
        CASE WHEN $9 = true THEN NOW() ELSE NULL END, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      title, body, postedByRole || 'Admin', postedById || 'SYSTEM',
      categories, // Saved as TEXT[] array
      dbStatus, finalIsScheduled, scheduledPublishDate || null,
      finalIsPublished, expirationDate || null, images || [], finalIsPublished
    ];

    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Error:", err.message);
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

/**
 * PUBLISH SCHEDULED ANNOUNCEMENTS:
 * GET /api/announcements/publish-scheduled
 * 
 * This endpoint finds all scheduled announcements whose scheduled time has passed
 * and publishes them (updates their status to Active and sets PublishedDate)
 */
router.get("/publish-scheduled", async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Find all scheduled announcements that are ready to be published
    const scheduled = await pool.query(
      `
      SELECT "AnnouncementID"
      FROM announcement
      WHERE "IsScheduled" = true
        AND "Status" = 'Drafts'
        AND "ScheduledPublishDate" IS NOT NULL
        AND "ScheduledPublishDate" <= $1
      `,
      [now]
    );

    if (scheduled.rowCount === 0) {
      return res.json({ message: "No scheduled announcements to publish", published: 0 });
    }

    // Update all matching announcements
    const result = await pool.query(
      `
      UPDATE announcement
      SET "Status" = 'Active',
          "IsScheduled" = false,
          "PublishedDate" = NOW()
      WHERE "IsScheduled" = true
        AND "Status" = 'Drafts'
        AND "ScheduledPublishDate" IS NOT NULL
        AND "ScheduledPublishDate" <= $1
      RETURNING *
      `,
      [now]
    );

    res.json({
      message: `Published ${result.rowCount} scheduled announcement(s)`,
      published: result.rowCount,
      announcements: result.rows,
    });
  } catch (err) {
    console.error("Publish Scheduled Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ARCHIVE EXPIRED ANNOUNCEMENTS:
 * GET /api/announcements/archive-expired
 * 
 * This endpoint finds all announcements whose expiration time has passed
 * and archives them (updates their status to Archived)
 */
router.get("/archive-expired", async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Find all announcements that are expired
    const expired = await pool.query(
      `
      SELECT "AnnouncementID"
      FROM announcement
      WHERE "ExpirationDate" IS NOT NULL
        AND "ExpirationDate" <= $1
        AND "Status" != 'Archived'
      `,
      [now]
    );

    if (expired.rowCount === 0) {
      return res.json({ message: "No announcements to archive", archived: 0 });
    }

    // Update all matching announcements
    const result = await pool.query(
      `
      UPDATE announcement
      SET "Status" = 'Archived'
      WHERE "ExpirationDate" IS NOT NULL
        AND "ExpirationDate" <= $1
        AND "Status" != 'Archived'
      RETURNING "AnnouncementID", "Title", "ExpirationDate"
      `,
      [now]
    );

    res.json({
      message: `Archived ${result.rowCount} expired announcement(s)`,
      archived: result.rowCount,
      announcements: result.rows,
    });
  } catch (err) {
    console.error("Archive Expired Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;