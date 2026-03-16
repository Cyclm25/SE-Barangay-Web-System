const router = require("express").Router();
const pool = require("../db");

/**
 * Reusable automation function:
 * publish scheduled announcements whose publish date has passed
 */
async function publishScheduledAnnouncements() {
  const now = new Date().toISOString();

  const result = await pool.query(
    `
    UPDATE announcement
    SET "Status" = 'Active',
        "IsScheduled" = false,
        "PublishedDate" = NOW(),
        "IsPublished" = true
    WHERE "IsScheduled" = true
      AND "Status" = 'Drafts'
      AND "ScheduledPublishDate" IS NOT NULL
      AND "ScheduledPublishDate" <= $1
    RETURNING *
    `,
    [now]
  );

  return result;
}

/**
 * Reusable automation function:
 * archive expired announcements
 */
async function archiveExpiredAnnouncements() {
  const now = new Date().toISOString();

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

  return result;
}

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
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      body,
      postedByRole,
      postedById,
      status,
      targetAudience,
      isScheduled,
      scheduledPublishDate,
      expirationDate,
      images,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const finalIsScheduled = isScheduled === true;
    const dbStatus = finalIsScheduled
      ? "Drafts"
      : status === "draft"
      ? "Drafts"
      : "Active";

    const finalIsPublished = !finalIsScheduled && dbStatus === "Active";

    let categories = Array.isArray(targetAudience) ? targetAudience : ["All"];
    if (categories.length === 0) categories = ["All"];

    const queryText = `
      INSERT INTO announcement (
        "Title",
        "Body",
        "PostedByRole",
        "PostedByID",
        "Category",
        "Status",
        "CreatedAt",
        "IsScheduled",
        "ScheduledPublishDate",
        "PublishedDate",
        "ExpirationDate",
        "Images",
        "IsPublished"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        NOW(),
        $7,
        $8,
        CASE WHEN $9 = true THEN NOW() ELSE NULL END,
        $10,
        $11,
        $12
      )
      RETURNING *
    `;

    const values = [
      title,
      body,
      postedByRole || "Admin",
      postedById || "SYSTEM",
      categories,
      dbStatus,
      finalIsScheduled,
      scheduledPublishDate || null,
      finalIsPublished,
      expirationDate || null,
      images || [],
      finalIsPublished,
    ];

    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ARCHIVE manually:
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
 * Manual endpoint to publish scheduled announcements
 * GET /api/announcements/publish-scheduled
 */
router.get("/publish-scheduled", async (req, res) => {
  try {
    const result = await publishScheduledAnnouncements();

    res.json({
      message:
        result.rowCount === 0
          ? "No scheduled announcements to publish"
          : `Published ${result.rowCount} scheduled announcement(s)`,
      published: result.rowCount,
      announcements: result.rows,
    });
  } catch (err) {
    console.error("Publish Scheduled Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Manual endpoint to archive expired announcements
 * GET /api/announcements/archive-expired
 */
router.get("/archive-expired", async (req, res) => {
  try {
    const result = await archiveExpiredAnnouncements();

    res.json({
      message:
        result.rowCount === 0
          ? "No announcements to archive"
          : `Archived ${result.rowCount} expired announcement(s)`,
      archived: result.rowCount,
      announcements: result.rows,
    });
  } catch (err) {
    console.error("Archive Expired Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = {
  router,
  publishScheduledAnnouncements,
  archiveExpiredAnnouncements,
};