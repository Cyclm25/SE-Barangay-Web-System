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
      title,
      body,
      postedByRole,
      postedById,
      status,          // UI value: posted/draft/archived OR DB value
      targetAudience,  // maps to "Category"
      isScheduled,     // NEW: boolean indicating if announcement is scheduled
      scheduledPublishDate, // NEW: ISO timestamp string
      expirationDate,  // NEW: ISO timestamp string for auto-archiving
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

    // Determine if scheduled and validate date
    let finalIsScheduled = isScheduled === true;
    let finalScheduledDate = null;
    let finalPublishedDate = null;
    let finalExpirationDate = null;

    if (finalIsScheduled && scheduledPublishDate) {
      try {
        finalScheduledDate = new Date(scheduledPublishDate).toISOString();
        // If scheduled, set status to Drafts initially (shows as unpublished)
      } catch (e) {
        return res.status(400).json({ error: "Invalid scheduledPublishDate format" });
      }
    } else {
      // If posting immediately, set PublishedDate to now
      if (dbStatus === "Active") {
        finalPublishedDate = new Date().toISOString();
      }
    }

    // Validate expiration date if provided
    if (expirationDate) {
      try {
        finalExpirationDate = new Date(expirationDate).toISOString();
      } catch (e) {
        return res.status(400).json({ error: "Invalid expirationDate format" });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO announcement
        ("Title","Body","PostedByRole","PostedByID","Category","Status","CreatedAt","IsScheduled","ScheduledPublishDate","PublishedDate","ExpirationDate")
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9,$10)
      RETURNING *
      `,
      [
        title,
        body,
        postedByRole,
        postedById,
        targetAudience || "All",
        finalIsScheduled ? "Drafts" : dbStatus,
        finalIsScheduled,
        finalScheduledDate,
        finalPublishedDate,
        finalExpirationDate,
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