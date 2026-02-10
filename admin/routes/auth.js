const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

router.post("/login", async (req, res) => {
  console.log("LOGIN HIT:", req.body);

  try {
    const { residentId, password } = req.body;

    if (!residentId || !password) {
      return res.status(400).json({ error: "residentId and password are required" });
    }

    const result = await pool.query(
      `SELECT 
          ra."Password" AS "PasswordHash",
          ra."Role",
          COALESCE(r."FirstName", ba."AdminName", 'Super Admin') AS "DisplayName"
       FROM residentaccount ra
       LEFT JOIN resident r ON ra."ResidentID" = r."ResidentID"
       LEFT JOIN barangayadmin ba ON ra."BarangayAdminID" = ba."BarangayAdminID"
       LEFT JOIN superadmin sa ON ra."SuperAdminID" = sa."SuperAdminID"
       WHERE ra."ResidentID" = $1
          OR ra."BarangayAdminID" = $1
          OR ra."SuperAdminID" = $1
       LIMIT 1`,
      [residentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    const user = result.rows[0];

    // ✅ bcrypt compare (only works if DB has hashed passwords)
    const isMatch = await bcrypt.compare(password, user.PasswordHash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    return res.json({
      message: "Login Successful",
      role: user.Role,
      firstName: user.DisplayName,
    });

  } catch (err) {
    console.error("Login Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
