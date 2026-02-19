const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all barangay officials (BarangayAdmin)
router.get("/", async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        "BarangayAdminID" AS id,
        "AdminName"       AS name,
        "Position"        AS position,
        "Email"           AS email,
        "Status"          AS status,
        "DateCreated"     AS dateCreated
      FROM barangayadmin
      ORDER BY "Position" ASC, "AdminName" ASC
    `);

        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Server error" });
    }
});

// POST create barangay official (BarangayAdmin)
router.post("/", async (req, res) => {
    try {
        const { adminName, position, email, password, superAdminId } = req.body;

        if (!adminName || !email || !password) {
            return res.status(400).json({ message: "adminName, email, password are required" });
        }

        const result = await db.query(
            `
      INSERT INTO barangayadmin
        ("AdminName","Position","Email","Password","Status","DateCreated","SuperAdminID")
      VALUES
        ($1,$2,$3,$4,TRUE,NOW(),$5)
      RETURNING
        "BarangayAdminID" AS id,
        "AdminName" AS name,
        "Position" AS position,
        "Email" AS email,
        "Status" AS status,
        "DateCreated" AS dateCreated
      `,
            [adminName, position || null, email, password, superAdminId || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error(e);
        // Unique email conflict (if your DB enforces it)
        if (String(e.code) === "23505") return res.status(409).json({ message: "Email already exists" });
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH activate/inactivate (Status boolean)
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // true/false

        if (typeof status !== "boolean") {
            return res.status(400).json({ message: "status must be boolean (true/false)" });
        }

        const result = await db.query(
            `
      UPDATE barangayadmin
      SET "Status" = $1
      WHERE "BarangayAdminID" = $2
      RETURNING
        "BarangayAdminID" AS id,
        "AdminName" AS name,
        "Position" AS position,
        "Email" AS email,
        "Status" AS status,
        "DateCreated" AS dateCreated
      `,
            [status, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Official not found" });
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
