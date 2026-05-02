const express = require("express");
const router = express.Router();
const pool = require("../db");
const { sendInquiryEmail } = require("../utils/sendInquiryEmail");

// GET current resident info for autofill
router.get("/me", async (req, res) => {
  try {
    const { residentId } = req.query;

    if (!residentId) {
      return res.status(400).json({ error: "residentId is required" });
    }

    const result = await pool.query(
      `
      SELECT 
        CONCAT(
          COALESCE("FirstName", ''),
          CASE WHEN "MiddleName" IS NOT NULL AND TRIM("MiddleName") <> '' THEN ' ' || "MiddleName" ELSE '' END,
          CASE WHEN "LastName" IS NOT NULL AND TRIM("LastName") <> '' THEN ' ' || "LastName" ELSE '' END
        ) AS "fullName",
        "Email" AS "email"
      FROM resident
      WHERE "ResidentID" = $1
      LIMIT 1
      `,
      [residentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Fetch resident inquiry profile error:", error);
    return res.status(500).json({ error: "Failed to fetch resident profile" });
  }
});

router.post("/send", async (req, res) => {
  try {
    const { residentName, email, subject, message, announcementTitle, announcementId } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: "Email and message are required." });
    }

    let receiverEmail = null;
    if (announcementId !== null && announcementId !== undefined && String(announcementId).trim() !== "") {
      const targetQ = await pool.query(
        `
        SELECT
          ba."Email" AS "ReceiverEmail"
        FROM announcement a
        LEFT JOIN barangayadmin ba
          ON a."PostedByID"::text = ba."BarangayAdminID"::text
        WHERE a."AnnouncementID" = $1
        LIMIT 1
        `,
        [announcementId]
      );
      receiverEmail = targetQ.rows?.[0]?.ReceiverEmail || null;
    }

    await sendInquiryEmail({
      residentName: residentName || "Resident",
      email,
      subject: subject || "No Subject",
      message,
      announcementTitle: announcementTitle || "General Announcement",
      receiverEmail,
    });

    res.status(200).json({ message: "Inquiry sent successfully!" });
  } catch (error) {
    console.error("Email Route Error:", error);
    res.status(500).json({ error: "Failed to send inquiry." });
  }
});

module.exports = router;
