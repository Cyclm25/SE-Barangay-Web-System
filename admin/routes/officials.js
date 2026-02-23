const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

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
        "SuperAdminID"    AS superadminid
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
router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
        const adminName = req.body.adminName ?? req.body.adminname;
        const position = req.body.position;
        const email = req.body.email;
        const password = req.body.password;
        const superAdminId = req.body.superAdminId ?? req.body.superadminid;

        if (!adminName || !email || !password) {
            return res.status(400).json({ message: "adminName, email and password are required" });
        }

        await client.query("BEGIN");

        const hashedPassword = await bcrypt.hash(password, 10);

        const last = await client.query(`
      SELECT "BarangayAdminID"
      FROM barangayadmin
      ORDER BY "DateCreated" DESC
      LIMIT 1
    `);

        let newId = "AD20260001";
        if (last.rows.length > 0) {
            const lastId = last.rows[0].BarangayAdminID;
            const num = parseInt(String(lastId).slice(-4), 10) + 1;
            newId = "AD2026" + String(num).padStart(4, "0");
        }

        console.log("[CREATE OFFICIAL] newId:", newId);

        // 1) barangayadmin
        const adminResult = await client.query(
            `
      INSERT INTO barangayadmin
        ("BarangayAdminID","AdminName","Position","Email","Password","Status","DateCreated","SuperAdminID")
      VALUES
        ($1,$2,$3,$4,$5,TRUE,NOW(),$6)
      RETURNING
        "BarangayAdminID" AS barangayadminid,
        "AdminName"       AS adminname,
        "Position"        AS position,
        "Email"           AS email,
        "Status"          AS status,
        "DateCreated"     AS datecreated,
        "SuperAdminID"    AS superadminid
      `,
            [newId, adminName, position || null, email, hashedPassword, superAdminId || null]
        );

        // 2) residentaccount (Admin role)
        // IMPORTANT: If your table is actually named with quotes as "ResidentAccount",
        // change `residentaccount` to `"ResidentAccount"` below.
        const raResult = await client.query(
            `
      INSERT INTO residentaccount
        ("ResidentID","BarangayAdminID","SuperAdminID","Password","Role")
      VALUES
        (NULL, $1, NULL, $2, 'Admin')
      RETURNING "ResidentAccountID" AS residentaccountid
      `,
            [newId, hashedPassword]
        );

        console.log("[CREATE OFFICIAL] residentaccount inserted id:", raResult.rows[0]?.residentaccountid);

        await client.query("COMMIT");

        // (optional) return both for verification
        res.status(201).json({
            official: adminResult.rows[0],
            residentaccount: raResult.rows[0],
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("POST /api/officials error:", err);

        if (String(err.code) === "23505") {
            return res.status(409).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Server error", error: err.message, code: err.code });
    } finally {
        client.release();
    }
});

// PUT update official
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // accept both naming styles from FE
        const adminName = req.body.adminName ?? req.body.adminname;
        const position = req.body.position;
        const email = req.body.email;

        const result = await pool.query(
            `
      UPDATE barangayadmin
      SET
        "AdminName" = $1,
        "Position"  = $2,
        "Email"     = $3
      WHERE "BarangayAdminID" = $4
      RETURNING
  "BarangayAdminID" AS barangayadminid,
  "AdminName"       AS adminname,
  "Position"        AS position,
  "Email"           AS email,
  "Status"          AS status,
  "DateCreated"     AS datecreated,
  "SuperAdminID"    AS superadminid
      `,
            [adminName, position || null, email, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("PUT /api/officials/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH toggle active/inactive (Status boolean)
router.patch("/:id/status", async (req, res) => {
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
      RETURNING
  "BarangayAdminID" AS barangayadminid,
  "AdminName"       AS adminname,
  "Position"        AS position,
  "Email"           AS email,
  "Status"          AS status,
  "DateCreated"     AS datecreated,
  "SuperAdminID"    AS superadminid
      `,
            [status, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Official not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("PATCH /api/officials/:id/status error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;