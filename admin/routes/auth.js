const router = require("express").Router();
const pool = require("../db");

router.post("/login", async (req, res) => {
    try {
        const { residentId, password } = req.body; 

        // Join 'residentaccount' to all three potential profile tables
        // COALESCE picks the first name that isn't empty
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

        // 1. Check if user exists
        if (user.rows.length === 0) {
            return res.status(401).json("User ID not found.");
        }

        const { Password, Role, DisplayName } = user.rows[0];

        // 2. Verify password match (Case Sensitive)
        if (password !== Password) {
            return res.status(401).json("Incorrect password.");
        }

        // 3. Return data for the frontend 3-way redirect
        res.json({ 
            message: "Login Successful", 
            role: Role, // 'Admin', 'Official', or 'Resident'
            firstName: DisplayName 
        });

    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
