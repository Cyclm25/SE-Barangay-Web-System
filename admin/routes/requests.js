// requests.js
const router = require("express").Router();
const pool = require("../db");

/**
 * POST /requests
 * Body: { residentId, requestType, requestPurpose }
 *
 * ✅ Creates:
 *  1) request row (Pending)
 *  2) notification row(s) for BarangayAdmin + SuperAdmin (if IDs exist)
 * This is what makes the request "reflect" on the admin side via /requests/inbox/:id.
 */
router.post("/", async (req, res) => {
  let client;

  try {
    const { residentId, requestType, requestPurpose } = req.body;

    if (!residentId || !requestType || !requestPurpose) {
      return res.status(400).json({
        error: "residentId, requestType, requestPurpose are required",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // 1) Get who to notify (Admin + Super Admin) from residentaccount using ResidentID
    const ra = await client.query(
      `SELECT "BarangayAdminID", "SuperAdminID"
       FROM residentaccount
       WHERE "ResidentID" = $1
       LIMIT 1`,
      [residentId]
    );

    if (ra.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "No residentaccount row found for this ResidentID",
      });
    }

    const { BarangayAdminID, SuperAdminID } = ra.rows[0];

    // 2) Create request (FK is ResidentID)
    const reqInsert = await client.query(
      `INSERT INTO request
        ("ResidentID", "RequestDate", "RequestType", "RequestStatus", "RequestPurpose")
       VALUES ($1, NOW(), $2, 'Pending', $3)
       RETURNING "RequestID"`,
      [residentId, requestType, requestPurpose]
    );

    const requestId = reqInsert.rows[0].RequestID;

    // 3) Create notifications addressed to admin + super admin
    const message = `New request submitted: ${requestType} - ${requestPurpose}`;

    if (BarangayAdminID) {
      await client.query(
        `INSERT INTO notification
          ("RequestID","RecipientRole","RecipientID","NotificationType","NotificationDate","Message")
         VALUES ($1,'BarangayAdmin',$2,'Request',NOW(),$3)`,
        [requestId, BarangayAdminID, message]
      );
    }

    if (SuperAdminID) {
      await client.query(
        `INSERT INTO notification
          ("RequestID","RecipientRole","RecipientID","NotificationType","NotificationDate","Message")
         VALUES ($1,'SuperAdmin',$2,'Request',NOW(),$3)`,
        [requestId, SuperAdminID, message]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Request submitted",
      requestId,
      notified: {
        BarangayAdminID: BarangayAdminID || null,
        SuperAdminID: SuperAdminID || null,
      },
    });
  } catch (err) {
    console.error("Create Request Error FULL:", err);

    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback Error:", rollbackErr);
      }
    }

    return res.status(500).json({
      error: "Internal Server Error",
      detail: err.message,
      code: err.code || null,
    });
  } finally {
    if (client) client.release();
  }
});

/**
 * GET /requests/inbox/:id
 * :id is AD... or SA...
 *
 * ✅ Updated:
 *  - Joins resident table so Admin sees resident full name + contact/email
 *  - Still returns notifications + request data
 */
router.get("/inbox/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const inbox = await pool.query(
      `SELECT
          n."NotificationID",
          n."NotificationDate",
          n."Message",
          n."IsRead",
          n."RecipientRole",
          n."RecipientID",

          req."RequestID",
          req."RequestDate",
          req."RequestType",
          req."RequestStatus",
          req."RequestPurpose",
          req."ResidentID",

          -- ✅ extra resident details for autofill/display on admin side
          resi."FirstName",
          resi."MiddleName",
          resi."LastName",
          resi."ContactNumber",
          resi."Email"
       FROM notification n
       JOIN request req ON n."RequestID" = req."RequestID"
       LEFT JOIN resident resi ON req."ResidentID" = resi."ResidentID"
       WHERE n."RecipientID" = $1
       ORDER BY n."NotificationDate" DESC`,
      [id]
    );

    return res.json(inbox.rows);
  } catch (err) {
    console.error("Inbox Error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      detail: err.message,
      code: err.code || null,
    });
  }
});

router.get("/admin/all", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        req."RequestID",
        req."RequestDate",
        req."RequestType",
        req."RequestStatus",
        req."RequestPurpose",
        req."ResidentID",

        r."FirstName",
        r."MiddleName",
        r."LastName",
        r."ContactNumber",
        r."Email"

      FROM request req
      JOIN resident r ON req."ResidentID" = r."ResidentID"
      ORDER BY req."RequestDate" DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Admin Requests Error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Allow valid status transitions
    if (!["Pending", "Processing", "Ready for Pickup", "Completed", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await pool.query(
      `
      UPDATE request
      SET "RequestStatus" = $1
      WHERE "RequestID" = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
