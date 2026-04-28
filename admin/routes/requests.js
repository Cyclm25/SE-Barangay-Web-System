// requests.js
const router = require("express").Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");
const { sendReadyForPickupSms } = require("../utils/sendSmsNotification");
const { sendReadyForPickupEmail } = require("../utils/sendEmailNotification");
const { validateRequestPayload } = require("../utils/validation");
require("dotenv").config();

function buildAppointmentNotificationMessage({
  date,
  time,
  requirements,
  additionalNotes,
  setByAdmin,
}) {
  return JSON.stringify({
    type: "appointment",
    date: date || "",
    time: time || "",
    requirements: requirements || "",
    additionalNotes: additionalNotes || "",
    setByAdmin: setByAdmin || "Barangay Admin",
  });
}

function parseAppointmentNotificationMessage(rawMessage) {
  if (!rawMessage) return null;

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed && typeof parsed === "object" && parsed.type === "appointment") {
      return parsed;
    }
  } catch (_) {
    return null;
  }

  return null;
}

/* ==============================
   CREATE REQUEST (Resident)
============================== */

router.post("/", async (req, res) => {
  let client;

  try {
    const { residentId, requestType, requestPurpose } = req.body;

    const validationError = validateRequestPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        error: validationError.message,
        errors: validationError.errors,
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
      } catch { }
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

router.patch("/:id/status", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      status,
      reason,
      appointmentDate,
      appointmentTime,
      requirements,
      additionalNotes,
      setByAdmin,
    } = req.body;

    const allowed = ["Pending", "Processing", "Ready for Pickup", "Completed", "Rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (status === "Rejected" && (!reason || !String(reason).trim())) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    await client.query("BEGIN");

    const current = await client.query(
      `SELECT "RequestStatus", "ResidentID", "RequestType"
       FROM request
       WHERE "RequestID" = $1`,
      [id]
    );
    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Request not found" });
    }

    const prevStatus = current.rows[0].RequestStatus;
    const residentId = current.rows[0].ResidentID;
    const requestType = current.rows[0].RequestType;

    let updateQuery = `UPDATE request SET "RequestStatus" = $1`;
    const params = [status];
    let idx = 2;

    // persist rejection reason
    if (status === "Rejected") {
      updateQuery += `, "RejectionReason" = $${idx}`;
      params.push(String(reason).trim());
      idx++;
    }

    if (status === "Ready for Pickup" && prevStatus !== "Ready for Pickup") {
      updateQuery += `, "PickupDate" = NOW()`;
    }

    if (status === "Completed" && prevStatus !== "Completed") {
      updateQuery += `, "CompletionDate" = NOW()`;
    }

    updateQuery += ` WHERE "RequestID" = $${idx}
      RETURNING "RequestID","ResidentID","RequestType","RequestPurpose","RequestStatus","RequestDate","PickupDate","CompletionDate","RejectionReason"`;
    params.push(id);

    const update = await client.query(updateQuery, params);

    if (status === "Processing" && appointmentDate && appointmentTime) {
      const appointmentMessage = buildAppointmentNotificationMessage({
        date: appointmentDate,
        time: appointmentTime,
        requirements,
        additionalNotes,
        setByAdmin,
      });

      await client.query(
        `INSERT INTO notification
          ("RequestID","RecipientRole","RecipientID","NotificationType","NotificationDate","Message")
         VALUES ($1,'Resident',$2,'Appointment',NOW(),$3)`,
        [id, residentId, appointmentMessage]
      );
    }

    await client.query("COMMIT");

    let sms = {
      attempted: false,
      success: false,
      skipped: true,
      reason: "SMS only triggers when transitioning to Ready for Pickup.",
    };
    let email = {
      attempted: false,
      success: false,
      skipped: true,
      reason: "Email only triggers when transitioning to Ready for Pickup.",
    };

    if (status === "Ready for Pickup" && prevStatus !== "Ready for Pickup") {
      const residentInfo = await pool.query(
        `SELECT "FirstName", "MiddleName", "LastName", "ContactNumber", "Email"
         FROM resident
         WHERE "ResidentID" = $1
         LIMIT 1`,
        [residentId]
      );

      if (residentInfo.rowCount === 0) {
        email = await sendReadyForPickupEmail({
          requestId: Number(id),
          residentId,
          residentName: residentId,
          documentType: requestType,
          emailAddress: null,
        });
        sms = await sendReadyForPickupSms({
          requestId: Number(id),
          residentId,
          residentName: residentId,
          documentType: requestType,
          rawPhoneNumber: null,
        });
      } else {
        const resident = residentInfo.rows[0];
        const residentName = [resident.FirstName, resident.MiddleName, resident.LastName]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        email = await sendReadyForPickupEmail({
          requestId: Number(id),
          residentId,
          residentName: residentName || residentId,
          documentType: requestType,
          emailAddress: resident.Email,
        });

        sms = await sendReadyForPickupSms({
          requestId: Number(id),
          residentId,
          residentName: residentName || residentId,
          documentType: requestType,
          rawPhoneNumber: resident.ContactNumber,
        });
      }
    }

    return res.json({
      message: "Status updated",
      data: update.rows[0],
      email,
      sms,
    });
  } catch (err) {
    await client.query("ROLLBACK");
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
        req."PickupDate",
        req."CompletionDate",
        req."RequestType",
        req."RequestStatus",
        req."RequestPurpose",
        req."ResidentID",
        req."RejectionReason",
        latest_appt."Message" AS "AppointmentMessage",
        r."FirstName",
        r."MiddleName",
        r."LastName",
        r."ContactNumber",
        r."Email"
      FROM request req
      JOIN resident r ON req."ResidentID" = r."ResidentID"
      LEFT JOIN LATERAL (
        SELECT n."Message"
        FROM notification n
        WHERE n."RequestID" = req."RequestID"
          AND n."RecipientRole" = 'Resident'
          AND n."NotificationType" = 'Appointment'
        ORDER BY n."NotificationDate" DESC
        LIMIT 1
      ) latest_appt ON TRUE
      ORDER BY req."RequestDate" DESC
      `
    );

    res.json(
      result.rows.map((row) => {
        const appointmentDetails = parseAppointmentNotificationMessage(row.AppointmentMessage);

        return {
          ...row,
          AppointmentDate: appointmentDetails?.date || null,
          AppointmentTime: appointmentDetails?.time || null,
          AppointmentRequirements: appointmentDetails?.requirements || null,
          AppointmentNotes: appointmentDetails?.additionalNotes || null,
          AppointmentSetByAdmin: appointmentDetails?.setByAdmin || null,
        };
      })
    );
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
      SELECT
        req."RequestID",
        req."ResidentID",
        req."RequestDate",
        req."PickupDate",
        req."CompletionDate",
        req."RequestType",
        req."RequestStatus",
        req."RequestPurpose",
        latest_appt."Message" AS "AppointmentMessage"
      FROM request req
      LEFT JOIN LATERAL (
        SELECT n."Message"
        FROM notification n
        WHERE n."RequestID" = req."RequestID"
          AND n."RecipientRole" = 'Resident'
          AND n."NotificationType" = 'Appointment'
        ORDER BY n."NotificationDate" DESC
        LIMIT 1
      ) latest_appt ON TRUE
      WHERE req."ResidentID" = $1
      ORDER BY req."RequestDate" DESC, req."RequestID" DESC
      `,
      [residentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch Resident Requests Error:", err);
    res.status(500).json({ error: err.message });
  }
});
