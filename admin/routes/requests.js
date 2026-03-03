// requests.js
const router = require("express").Router();
const pool = require("../db");
const nodemailer = require("nodemailer");
require("dotenv").config();

/* ==============================
   MAILER CONFIG
============================== */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ==============================
   CREATE REQUEST (Resident)
============================== */

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

    const reqInsert = await client.query(
      `INSERT INTO request
        ("ResidentID", "RequestDate", "RequestType", "RequestStatus", "RequestPurpose")
       VALUES ($1, NOW(), $2, 'Pending', $3)
       RETURNING "RequestID"`,
      [residentId, requestType, requestPurpose]
    );

    const requestId = reqInsert.rows[0].RequestID;

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
    });
  } catch (err) {
    console.error("Create Request Error FULL:", err);

    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {}
    }

    return res.status(500).json({
      error: "Internal Server Error",
      detail: err.message,
    });
  } finally {
    if (client) client.release();
  }
});

/* ==============================
   ADMIN UPDATE STATUS
   + SEND EMAIL TO RESIDENT
============================== */

router.patch("/:id/status", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["Pending", "Processing", "Ready for Pickup", "Completed", "Rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await client.query("BEGIN");

    // 1) Get current request (so we can detect transition)
    const current = await client.query(
      `SELECT "RequestID", "ResidentID", "RequestType", "RequestPurpose", "RequestStatus"
       FROM request
       WHERE "RequestID" = $1`,
      [id]
    );

    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Request not found" });
    }

    const prevStatus = current.rows[0].RequestStatus;

    // 2) Update request
    const update = await client.query(
      `UPDATE request
       SET "RequestStatus" = $1
       WHERE "RequestID" = $2
       RETURNING "RequestID","ResidentID","RequestType","RequestPurpose","RequestStatus"`,
      [status, id]
    );

    const requestData = update.rows[0];

    // 3) Only email when moving INTO "Ready for Pickup"
    const movedToReadyForPickup =
      prevStatus !== "Ready for Pickup" && status === "Ready for Pickup";

    let emailed = false;

    if (movedToReadyForPickup) {
      // Get resident info
      const resident = await client.query(
        `SELECT "FirstName", "Email"
         FROM resident
         WHERE "ResidentID" = $1`,
        [requestData.ResidentID]
      );

      if (resident.rowCount > 0 && resident.rows[0].Email) {
        const { FirstName, Email } = resident.rows[0];

        // Optional: prevent duplicates using Notification table (recommended)
        const alreadySent = await client.query(
          `SELECT 1
           FROM notification
           WHERE "RequestID" = $1
             AND "NotificationType" = 'Email'
             AND "Message" = 'READY_FOR_PICKUP_EMAIL'
           LIMIT 1`,
          [id]
        );

        if (alreadySent.rowCount === 0) {
          // Send email (still inside transaction? better after COMMIT, see below)
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: Email,
            subject: `Your document is ready for pickup (Request #${id})`,
            text:
`Hello ${FirstName},

Your requested document is now READY FOR PICKUP.

Document: ${requestData.RequestType}
Purpose: ${requestData.RequestPurpose}
Request No: ${id}

Please proceed to the Barangay Office to claim your document.

Thank you,
Barangay 160`,
          });

          // Log so you don't send again
          await client.query(
            `INSERT INTO notification
              ("RequestID","RecipientRole","RecipientID","NotificationType","NotificationDate","Message")
             VALUES ($1,'Resident',$2,'Email',NOW(),'READY_FOR_PICKUP_EMAIL')`,
            [id, requestData.ResidentID]
          );

          emailed = true;
        }
      }
    }

    await client.query("COMMIT");

    return res.json({
      message: movedToReadyForPickup
        ? (emailed ? "Moved to Ready for Pickup and email sent" : "Moved to Ready for Pickup (email skipped)")
        : "Status updated",
      data: requestData,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update Status Error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* ==============================
   ADMIN VIEW ALL REQUESTS
============================== */

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

module.exports = router;
// GET requests of a specific resident (for Track My Requests)
router.get("/resident/:residentId", async (req, res) => {
  try {
    const { residentId } = req.params;

    const result = await pool.query(
      `
      SELECT "RequestID","ResidentID","RequestDate","RequestType","RequestStatus","RequestPurpose"
      FROM request
      WHERE "ResidentID" = $1
      ORDER BY "RequestDate" DESC, "RequestID" DESC
      `,
      [residentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Resident Requests Error:", err);
    res.status(500).json({ error: err.message });
  }
});