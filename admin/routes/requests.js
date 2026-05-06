// requests.js
const router = require("express").Router();
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");
const {
  sendReadyForPickupEmail,
  sendRequestRejectedEmail,
  sendReturnForCompletionEmail,
} = require("../utils/sendEmailNotification");
const { validateRequestPayload } = require("../utils/validation");
require("dotenv").config();

let hasReceiverNameColumnCache = null;
async function checkReceiverNameColumn(client) {
  if (typeof hasReceiverNameColumnCache === "boolean") return hasReceiverNameColumnCache;
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'request'
       AND column_name = 'ReceiverName'
     LIMIT 1`
  );
  hasReceiverNameColumnCache = result.rowCount > 0;
  return hasReceiverNameColumnCache;
}

async function ensureReceiverNameColumn(client) {
  await client.query(`ALTER TABLE request ADD COLUMN IF NOT EXISTS "ReceiverName" TEXT`);
  hasReceiverNameColumnCache = true;
}

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

function normalizeRequestStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  switch (value) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "returned for completion":
    case "return for completion":
    case "returned":
    case "incomplete":
      return "Returned for Completion";
    case "ready for pickup":
      return "Ready for Pickup";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    default:
      return null;
  }
}

function getStatusUpdateActorId(user, fallbackResidentId) {
  return (
    user?.superAdminId ||
    user?.barangayAdminId ||
    user?.residentId ||
    user?.accountId ||
    fallbackResidentId ||
    null
  );
}

function buildStatusUpdatePurpose({ requestType, requestPurpose, status, reason }) {
  const base = [requestType, requestPurpose].filter(Boolean).join(" - ");
  const reasonText = String(reason || "").trim();

  if (status === "Rejected" && reasonText) {
    return `${base || "Document request"} - Reason: ${reasonText}`;
  }

  return base || "Document request";
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
    await ensureReceiverNameColumn(client);
    const { id } = req.params;
    const {
      status: rawStatus,
      reason,
      receiver_name,
      appointmentDate,
      appointmentTime,
      requirements,
      additionalNotes,
      setByAdmin,
    } = req.body;

    const status = normalizeRequestStatus(rawStatus);
    const allowed = ["Pending", "Processing", "Returned for Completion", "Ready for Pickup", "Completed", "Rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (
      (status === "Rejected" || status === "Returned for Completion") &&
      (!reason || !String(reason).trim())
    ) {
      return res.status(400).json({ error: "Reason is required" });
    }

    if (
      (status === "Rejected" || status === "Returned for Completion") &&
      String(reason).trim().length > 30
    ) {
      return res.status(400).json({ error: "Reason must be 30 characters or less" });
    }

    const hasReceiverNameColumn = await checkReceiverNameColumn(client);

    if (status === "Completed" && !String(receiver_name || "").trim()) {
      return res.status(400).json({ error: "Name of Receiver is required" });
    }

    await client.query("BEGIN");

    const current = await client.query(
      `SELECT "RequestStatus", "ResidentID", "RequestType", "RequestPurpose"
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
    const requestPurpose = current.rows[0].RequestPurpose;

    let updateQuery = `UPDATE request SET "RequestStatus" = $1`;
    const params = [status];
    let idx = 2;

    // persist rejection reason
    if (status === "Rejected" || status === "Returned for Completion") {
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

    if (status === "Completed" && hasReceiverNameColumn) {
      updateQuery += `, "ReceiverName" = $${idx}`;
      params.push(String(receiver_name).trim());
      idx++;
    }

    updateQuery += ` WHERE "RequestID" = $${idx}
      RETURNING "RequestID","ResidentID","RequestType","RequestPurpose","RequestStatus","RequestDate","PickupDate","CompletionDate","RejectionReason"${
        hasReceiverNameColumn ? ',"ReceiverName"' : ""
      }`;
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

    if (status !== prevStatus) {
      await client.query(
        `
        INSERT INTO transaction_history
          ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
        VALUES
          ($1,$2,$3,$4,$5,$6,NOW())
        `,
        [
          id,
          getStatusUpdateActorId(req.user, residentId),
          status === "Rejected" ? "Denied Document Request" : "Updated Document Request",
          status,
          "Online Requests",
          buildStatusUpdatePurpose({ requestType, requestPurpose, status, reason }),
        ]
      );
    }

    await client.query("COMMIT");

    let email = {
      attempted: false,
      success: false,
      skipped: true,
      reason: "Email only triggers when transitioning to Ready for Pickup.",
    };
    let rejectionEmail = {
      attempted: false,
      success: false,
      skipped: true,
      reason: "Rejection email only triggers when transitioning to Rejected.",
    };
    let returnForCompletionEmail = {
      attempted: false,
      success: false,
      skipped: true,
      reason: "Return for completion email only triggers when transitioning to Returned for Completion.",
    };

    if (
      (status === "Ready for Pickup" && prevStatus !== "Ready for Pickup") ||
      (status === "Rejected" && prevStatus !== "Rejected") ||
      (status === "Returned for Completion" && prevStatus !== "Returned for Completion")
    ) {
      const residentInfo = await pool.query(
        `SELECT "FirstName", "MiddleName", "LastName", "ContactNumber", "Email"
         FROM resident
         WHERE "ResidentID" = $1
         LIMIT 1`,
        [residentId]
      );

      const resident = residentInfo.rowCount > 0 ? residentInfo.rows[0] : null;
      const residentName = resident
        ? [resident.FirstName, resident.MiddleName, resident.LastName]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim() || residentId
        : residentId;

      if (status === "Ready for Pickup" && prevStatus !== "Ready for Pickup") {
        email = await sendReadyForPickupEmail({
          requestId: Number(id),
          residentId,
          residentName,
          documentType: requestType,
          emailAddress: resident?.Email || null,
        });

      }

      if (status === "Rejected" && prevStatus !== "Rejected") {
        rejectionEmail = await sendRequestRejectedEmail({
          requestId: Number(id),
          residentId,
          residentName,
          documentType: requestType,
          reason: String(reason).trim(),
          emailAddress: resident?.Email || null,
        });
      }

      if (status === "Returned for Completion" && prevStatus !== "Returned for Completion") {
        returnForCompletionEmail = await sendReturnForCompletionEmail({
          requestId: Number(id),
          residentId,
          residentName,
          documentType: requestType,
          reason: String(reason).trim(),
          emailAddress: resident?.Email || null,
        });
      }
    }

    return res.json({
      message: "Status updated",
      data: update.rows[0],
      email,
      rejectionEmail,
      returnForCompletionEmail,
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
    await ensureReceiverNameColumn(pool);
    const hasReceiverNameColumn = await checkReceiverNameColumn(pool);
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
        ${hasReceiverNameColumn ? 'req."ReceiverName",' : "NULL::text AS \"ReceiverName\","}
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
    await ensureReceiverNameColumn(pool);
    const { residentId } = req.params;
    const hasReceiverNameColumn = await checkReceiverNameColumn(pool);

    const result = await pool.query(
      `
      SELECT
        req."RequestID",
        req."ResidentID",
        r."FirstName",
        r."LastName",
        req."RequestDate",
        req."PickupDate",
        req."CompletionDate",
        req."RequestType",
        req."RequestStatus",
        req."RequestPurpose",
        req."RejectionReason",
        ${hasReceiverNameColumn ? 'req."ReceiverName",' : "NULL::text AS \"ReceiverName\","}
        latest_appt."Message" AS "AppointmentMessage"
      FROM request req
      LEFT JOIN resident r ON r."ResidentID" = req."ResidentID"
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
