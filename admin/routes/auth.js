const router = require("express").Router();
const pool = require("../db");

router.post("/login", async (req, res) => {
    try {
        const { residentId, password } = req.body; 

        // Strictly follows ERD: Joins Account to Resident, BarangayAdmin, and SuperAdmin
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
            return res.status(401).json("User ID not found.");
        }

        const { Password, Role, DisplayName } = user.rows[0];

        // Security check for password
        if (password !== Password) {
            return res.status(401).json("Incorrect password.");
        }

        res.json({ 
            message: "Login Successful", 
            role: Role, 
            firstName: DisplayName 
        });

    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;