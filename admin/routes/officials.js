const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");
const {
    cleanString,
    normalizeDigits,
    validateOfficialPayload,
} = require("../utils/validation");

const OFFICIAL_POSITIONS = new Set([
    "Barangay Captain",
    "Kagawad",
    "SK Kagawad",
    "SK Chairman",
    "Secretary",
    "Treasurer",
]);

function normalizeDateValue(value) {
    if (!value) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const mmddyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildNextPrefixedId(lastId, prefix) {
    const currentYear = new Date().getFullYear();
    const nextNumber = lastId
        ? (parseInt(String(lastId).slice(-4), 10) || 0) + 1
        : 1;

    return `${prefix}${currentYear}${String(nextNumber).padStart(4, "0")}`;
}

// GET all officials
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        "BarangayAdminID" AS barangayadminid,
        "AdminName"       AS adminname,
        "Position"        AS position,
        "Email"           AS email,
        "Status"          AS status,
        "DateCreated"     AS datecreated,
        "SuperAdminID"    AS superadminid,
        "ContactNumber"   AS contactnumber,
        to_char("TermStart", 'YYYY-MM-DD') AS termstart,
        to_char("TermEnd", 'YYYY-MM-DD')   AS termend,
        "ProfileImage"    AS profileimage
      FROM barangayadmin
      ORDER BY "DateCreated" DESC
    `);

        res.json(result.rows);
    } catch (err) {
        console.error("GET /api/officials error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST create official (with bcrypt + generated BarangayAdminID)
router.post("/", verifyToken, requireNonSkWriteAccess, async (req, res) => {
    const client = await pool.connect();
    try {
        const adminName = req.body.adminName ?? req.body.adminname;
        const position = req.body.position;
        const email = req.body.email;
        const password = req.body.password;
        const superAdminId = req.body.superAdminId ?? req.body.superadminid;
        const termStart = normalizeDateValue(req.body.termStart ?? req.body.termstart ?? null);
        const termEnd = normalizeDateValue(req.body.termEnd ?? req.body.termend ?? null);
        const profileImage =
            req.body.profileImage || req.body.ProfileImage || req.body.image || null;

        const contactnumber = String(req.body.contactnumber ?? "")
            .replace(/\D/g, "")
            .trim();

        const validationError = validateOfficialPayload({
            adminName,
            position,
            email,
            contactnumber,
            requirePassword: true,
            password,
            termStart,
            termEnd,
            allowedPositions: Array.from(OFFICIAL_POSITIONS),
        });
        if (validationError) {
            return res.status(400).json({ message: validationError.message, errors: validationError.errors });
        }

        if (termStart && termEnd && termEnd < termStart) {
            return res.status(400).json({ message: "Term end date cannot be earlier than term start date.", errors: { termEnd: "Term end date cannot be earlier than term start date." } });
        }

        await client.query("BEGIN");

        const hashedPassword = await bcrypt.hash(password, 10);

        const last = await client.query(`
      SELECT "BarangayAdminID"
      FROM barangayadmin
      WHERE "BarangayAdminID" ~ '^AD[0-9]{8}$'
      ORDER BY CAST(RIGHT("BarangayAdminID", 4) AS INTEGER) DESC
      LIMIT 1
    `);

        const newId = buildNextPrefixedId(last.rows[0]?.BarangayAdminID, "AD");

        const adminResult = await client.query(
            `
      INSERT INTO barangayadmin
        ("BarangayAdminID","AdminName","Position","Email","ContactNumber","Password","Status","DateCreated","SuperAdminID","TermStart","TermEnd","ProfileImage")
      VALUES
        ($1,$2,$3,$4,$5,$6,TRUE,NOW(),$7,$8,$9,$10)
      RETURNING *
      `,
            [
                newId,
                adminName,
                position || null,
                email,
                contactnumber || "",
                hashedPassword,
                superAdminId || null,
                termStart || null,
                termEnd || null,
                profileImage
            ]
        );

        const raResult = await client.query(
            `
      INSERT INTO residentaccount
        ("BarangayAdminID","Password","Role")
      VALUES
        ($1, $2, 'Admin')
      RETURNING "ResidentAccountID" AS residentaccountid
      `,
            [newId, hashedPassword]
        );

        await client.query("COMMIT");

        res.status(201).json({
            official: adminResult.rows[0],
            residentaccount: raResult.rows[0],
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("[POST /api/officials] Full error:", err);

        if (String(err.code) === "23505") {
            return res.status(409).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// PUT update official
router.put("/:id", verifyToken, requireNonSkWriteAccess, async (req, res) => {
    try {
        const { id } = req.params;
        const adminName = req.body.adminName ?? req.body.adminname;
        const position = req.body.position;
        const email = req.body.email;
        const rawStatus = req.body.status;
        const normalizedStatus =
            typeof rawStatus === "boolean"
                ? rawStatus
                : rawStatus === "true"
                    ? true
                    : rawStatus === "false"
                        ? false
                        : null;
        const termStart = normalizeDateValue(req.body.termStart ?? req.body.termstart ?? null);
        const termEnd = normalizeDateValue(req.body.termEnd ?? req.body.termend ?? null);
        const profileImage =
            req.body.profileImage || req.body.ProfileImage || req.body.image || null;
        const contactnumber = String(req.body.contactnumber ?? req.body.contactNumber ?? "")
            .replace(/\D/g, "")
            .trim();

        const validationError = validateOfficialPayload({
            adminName,
            position,
            email,
            contactnumber,
            termStart,
            termEnd,
            allowedPositions: Array.from(OFFICIAL_POSITIONS),
        });
        if (validationError) {
            return res.status(400).json({ message: validationError.message, errors: validationError.errors });
        }

        if (termStart && termEnd && termEnd < termStart) {
            return res.status(400).json({ message: "Term end date cannot be earlier than term start date.", errors: { termEnd: "Term end date cannot be earlier than term start date." } });
        }

        const result = await pool.query(
            `
      UPDATE barangayadmin
      SET
        "AdminName" = $1,
        "Position" = $2,
        "Email" = $3,
        "ContactNumber" = $5,
        "TermStart" = $6,
        "TermEnd" = $7,
        "Status" = COALESCE($8, "Status"),
        "ProfileImage" = COALESCE($9, "ProfileImage")
      WHERE "BarangayAdminID" = $4
      RETURNING *
      `,
            [
                adminName,
                position || null,
                email,
                id,
                contactnumber || null,
                termStart || null,
                termEnd || null,
                normalizedStatus,
                profileImage
            ]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Not found" });
        const row = result.rows[0];
        res.json({
            barangayadminid: row.BarangayAdminID,
            adminname: row.AdminName,
            position: row.Position,
            email: row.Email,
            status: row.Status,
            datecreated: row.DateCreated,
            contactnumber: row.ContactNumber,
            termstart: normalizeDateValue(row.TermStart),
            termend: normalizeDateValue(row.TermEnd),
            profileimage: row.ProfileImage,
        });
    } catch (err) {
        console.error("PUT /api/officials/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH toggle active/inactive (Status boolean)
router.patch("/:id/status", verifyToken, requireNonSkWriteAccess, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (typeof status !== "boolean") {
            return res.status(400).json({ message: "status must be boolean (true/false)" });
        }

        const result = await pool.query(
            `
      UPDATE barangayadmin
      SET "Status" = $1
      WHERE "BarangayAdminID" = $2
      RETURNING *
      `,
            [status, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Official not found" });
        const row = result.rows[0];
        res.json({
            barangayadminid: row.BarangayAdminID,
            adminname: row.AdminName,
            position: row.Position,
            email: row.Email,
            status: row.Status,
            datecreated: row.DateCreated,
            contactnumber: row.ContactNumber,
            termstart: normalizeDateValue(row.TermStart),
            termend: normalizeDateValue(row.TermEnd),
            profileimage: row.ProfileImage,
        });
    } catch (err) {
        console.error("PATCH /api/officials/:id/status error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
