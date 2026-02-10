const router = require("express").Router();
const pool = require("../db");

router.post("/login", async (req, res) => {
    try {
        const { residentId, password } = req.body; 

        // 1. Fetch the account and join with Resident/Admin names [cite: 462-466]
        const user = await pool.query(
            `SELECT 
                ra."Password", 
                ra."Role", 
                COALESCE(r."FirstName", ba."AdminName", 'Super Admin') AS "DisplayName"
             FROM residentaccount ra 
             LEFT JOIN resident r ON ra."ResidentID" = r."ResidentID"
             LEFT JOIN barangayadmin ba ON ra."BarangayAdminID" = ba."BarangayAdminID"
             LEFT JOIN superadmin sa ON ra."SuperAdminID" = sa."SuperAdminID"
             WHERE ra."ResidentID" = $1 
                OR ra."BarangayAdminID" = $1 
                OR ra."SuperAdminID" = $1`, 
            [residentId]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid ID or Password" });
        }

        const dbUser = user.rows[0];

        // 2. Case-sensitive password check [cite: 1108, 1131, 1167]
        if (password !== dbUser.Password) {
            return res.status(401).json({ error: "Invalid ID or Password" });
        }

        // 3. SUCCESS - Send the Role exactly as 'Super Admin' [cite: 315]
        res.json({ 
            message: "Login Successful", 
            role: dbUser.Role, 
            firstName: dbUser.DisplayName 
        });

    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;