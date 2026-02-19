const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

// GET all officials
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        "BarangayAdminID" as barangayadminid,
        "AdminName"      as adminname,
        "Email"          as email,
        "SuperAdminID"   as superadminid,
        "Position"       as position,
        "Status"         as status
      FROM barangayadmin
      ORDER BY "DateCreated" DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/barangayadmins error:", err);
    res.status(500).json({ error: err.message });
  }
});



// POST create official
router.post("/", async (req, res) => {
    try {
        const { adminname, position, email, password, superadminid } = req.body;

        if (!adminname || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        // hash password properly
        const hashedPassword = await bcrypt.hash(password, 10);

        // generate ID (simple version for now)
        const { rows: lastRow } = await pool.query(`
            SELECT "BarangayAdminID"
            FROM barangayadmin
            ORDER BY "DateCreated" DESC
            LIMIT 1
        `);

        let newId = "AD20260001";

        if (lastRow.length > 0) {
            const lastId = lastRow[0].BarangayAdminID; // e.g. AD20260001
            const num = parseInt(lastId.slice(-4)) + 1;
            newId = "AD2026" + String(num).padStart(4, "0");
        }

        const { rows } = await pool.query(
            `
            INSERT INTO barangayadmin
            ("BarangayAdminID","AdminName","Position","Email","Password","Status","DateCreated","SuperAdminID")
            VALUES ($1,$2,$3,$4,$5,true,NOW(),$6)
            RETURNING
                "BarangayAdminID" as barangayadminid,
                "AdminName" as adminname,
                "Position" as position,
                "Email" as email,
                "Status" as status,
                "DateCreated" as datecreated,
                "SuperAdminID" as superadminid
            `,
            [newId, adminname, position || null, email, hashedPassword, superadminid || null]
        );

        res.status(201).json(rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// PUT update official
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { adminname, position, email } = req.body;

        const { rows } = await pool.query(
            `UPDATE barangayadmin
       SET adminname=$1, position=$2, email=$3
       WHERE barangayadminid=$4
       RETURNING barangayadminid, adminname, position, email, status, datecreated`,
            [adminname, position, email, id]
        );

        if (!rows[0]) return res.status(404).json({ message: "Not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH toggle active/inactive (matches Status boolean)
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // boolean

        const { rows } = await pool.query(
            `UPDATE barangayadmin
       SET status=$1
       WHERE barangayadminid=$2
       RETURNING barangayadminid, adminname, position, email, status, datecreated`,
            [status, id]
        );

        if (!rows[0]) return res.status(404).json({ message: "Not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
