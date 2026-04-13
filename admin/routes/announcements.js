const router = require("express").Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");

async function generateNextAnnouncementId(db = pool) {
  const result = await db.query(
    `
    SELECT "AnnouncementID"
    FROM announcement
    ORDER BY "AnnouncementID" DESC
    LIMIT 1
    `
  );

  const lastId = Number(result.rows[0]?.AnnouncementID);
  return Number.isFinite(lastId) ? lastId + 1 : 1;
}

async function publishScheduledAnnouncements() {
  const result = await pool.query(
    `
    UPDATE announcement
    SET "Status" = 'Active',
        "IsScheduled" = false,
        "PublishedDate" = TIMEZONE('Asia/Manila', NOW()),
        "IsPublished" = true
    WHERE "IsScheduled" = true
      AND "Status" = 'Drafts'
      AND "ScheduledPublishDate" IS NOT NULL
      AND "ScheduledPublishDate" <= TIMEZONE('Asia/Manila', NOW())
    RETURNING *
    `
  );
  return result;
}

async function archiveExpiredAnnouncements() {
  const result = await pool.query(
    `
    UPDATE announcement
    SET "Status" = 'Archived'
    WHERE "ExpirationDate" IS NOT NULL
      AND "ExpirationDate" <= TIMEZONE('Asia/Manila', NOW())
      AND "Status" = 'Active'
      AND "IsPublished" = true
      AND "PublishedDate" IS NOT NULL
      AND "PublishedDate" <= TIMEZONE('Asia/Manila', NOW()) - INTERVAL '5 minutes'
    RETURNING "AnnouncementID", "Title", "ExpirationDate"
    `
  );
  return result;
}

function buildAnnouncementSelect(
  whereClause = "",
  orderClause = `ORDER BY a."CreatedAt" DESC`
) {
  return `
    SELECT
      a.*,
      COALESCE(
        ba."AdminName",
        CASE WHEN sa."SuperAdminID" IS NOT NULL THEN 'Super Admin' END,
        a."PostedByRole",
        'Admin'
      ) AS "PostedByName"
    FROM announcement a
    LEFT JOIN barangayadmin ba
      ON a."PostedByID"::text = ba."BarangayAdminID"::text
    LEFT JOIN superadmin sa
      ON a."PostedByID"::text = sa."SuperAdminID"::text
    ${whereClause}
    ${orderClause}
  `;
}

router.get("/resident", async (req, res) => {
  try {
    await publishScheduledAnnouncements();
    await archiveExpiredAnnouncements();

    const result = await pool.query(
      buildAnnouncementSelect(
        `WHERE a."Status" = 'Active'
           AND (a."ExpirationDate" IS NULL OR a."ExpirationDate" > NOW())`,
        `ORDER BY a."PublishedDate" DESC, a."CreatedAt" DESC`
      )
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Resident Announcements Error:", err);
    res.status(500).json({ error: err.message });
  }
});

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

router.get("/", async (req, res) => {
  try {
    await publishScheduledAnnouncements();
    await archiveExpiredAnnouncements();

    const { status } = req.query;
    let whereClause = "";
    let orderClause = `ORDER BY a."CreatedAt" DESC`;
    const params = [];

    if (status === "Scheduled") {
      whereClause = `
        WHERE a."IsScheduled" = true
          AND a."Status" = 'Drafts'
          AND a."ScheduledPublishDate" IS NOT NULL
      `;
      orderClause = `ORDER BY a."ScheduledPublishDate" ASC`;
    } else if (status) {
      params.push(status);
      whereClause = `WHERE a."Status" = $1`;
    }

    const result = await pool.query(
      buildAnnouncementSelect(whereClause, orderClause),
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Announcement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  try {
    const {
      title, body, postedByRole, postedById, status, targetAudience,
      isScheduled, scheduledPublishDate, expirationDate, images,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const finalIsScheduled = isScheduled === true;
    const dbStatus = finalIsScheduled ? "Drafts" : status === "draft" ? "Drafts" : "Active";
    const finalIsPublished = !finalIsScheduled && dbStatus === "Active";

    let categories;
    if (Array.isArray(targetAudience) && targetAudience.length > 0) {
      categories = targetAudience;
    } else if (targetAudience && targetAudience !== "all") {
      categories = [targetAudience];
    } else {
      categories = ["All"];
    }

    const nextAnnouncementId = await generateNextAnnouncementId(pool);

    const queryText = `
      INSERT INTO announcement (
        "AnnouncementID", "Title", "Body", "PostedByRole", "PostedByID", "Category",
        "Status", "CreatedAt", "IsScheduled", "ScheduledPublishDate",
        "PublishedDate", "ExpirationDate", "Images", "IsPublished"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        NOW(), $8, $9,
        CASE WHEN $10 = true THEN NOW() ELSE NULL END,
        $11, $12, $10
      )
      RETURNING *
    `;

    const values = [
      nextAnnouncementId,
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
    ];

    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// THE FIX: Added Explicit Logging to track the 404 issue
router.put("/:id", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  console.log(`\n[Announcements] ---> Attempting to EDIT Announcement ID: ${req.params.id}`);
  try {
    const { id } = req.params;
    const {
      title, body, status, targetAudience, isScheduled,
      scheduledPublishDate, expirationDate, images,
    } = req.body;

    const finalIsScheduled = isScheduled === true;
    const dbStatus = finalIsScheduled ? "Drafts" : status === "draft" ? "Drafts" : "Active";
    const finalIsPublished = !finalIsScheduled && dbStatus === "Active";

    let categories;
    if (Array.isArray(targetAudience) && targetAudience.length > 0) {
      categories = targetAudience;
    } else if (targetAudience && targetAudience !== "all") {
      categories = [targetAudience];
    } else {
      categories = ["All"];
    }

    const queryText = `
      UPDATE announcement
      SET 
        "Title" = $1, 
        "Body" = $2, 
        "Category" = $3,
        "Status" = $4, 
        "IsScheduled" = $5, 
        "ScheduledPublishDate" = $6,
        "IsPublished" = $7, 
        "ExpirationDate" = $8, 
        "Images" = $9,
        "PublishedDate" = CASE 
                            WHEN $7 = true AND "PublishedDate" IS NULL THEN NOW() 
                            ELSE "PublishedDate" 
                          END
      WHERE "AnnouncementID" = $10
      RETURNING *
    `;

    // Ensure id is treated as a number just in case PostgreSQL is being strict
    const numericId = parseInt(id, 10) || id;

    const values = [
      title, body, categories, dbStatus, finalIsScheduled,
      scheduledPublishDate || null, finalIsPublished, expirationDate || null,
      images || [], numericId,
    ];

    const result = await pool.query(queryText, values);
    
    if (result.rowCount === 0) {
      console.log(`[Announcements] ❌ ERROR: Could not find an announcement with ID ${id} in the database.`);
      return res.status(404).json({ error: "Announcement not found in database" });
    }
    
    console.log(`[Announcements] SUCCESS: Updated Announcement ID: ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[Announcements] ❌ Update Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/archive", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE announcement SET "Status" = 'Archived' WHERE "AnnouncementID" = $1 RETURNING *`,
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

module.exports = {
  router,
  publishScheduledAnnouncements,
  archiveExpiredAnnouncements,
};
