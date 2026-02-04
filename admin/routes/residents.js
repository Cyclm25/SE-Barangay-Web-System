const router = require("express").Router();
const pool = require("../db");

// 1. GET ALL RESIDENTS
router.get("/", async (req, res) => {
    try {
        const allResidents = await pool.query('SELECT * FROM resident ORDER BY "ResidentID" DESC');
        res.json(allResidents.rows);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        res.status(500).json("Server Error");
    }
});

// 2. REGISTER NEW RESIDENT
router.post("/register", async (req, res) => {
    try {
        const {
            residentNo, firstName, middleName, lastName, age, birthday,
            gender, civilStatus, residentType, voterStatus, houseNo,
            streetAddress, contactNumber, email, fatherName, motherName,
            spouseName, numberOfChildren, emergencyContactName, 
            emergencyContactNumber, emergencyContactAddress
        } = req.body;

        const queryText = `
            INSERT INTO resident (
                "ResidentID", "FirstName", "MiddleName", "LastName", "Age", "Birthday",
                "Gender", "CivilStatus", "ResidentType", "VoterStatus", "HouseNumber",
                "StreetAddress", "ContactNumber", "Email", "FatherName", "MotherName",
                "SpouseName", "NoOfChildren", "ContactPerson", "ContactPersonNo",
                "ContactPersonAddress", "BarangayCard", "status"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'Active') 
            RETURNING *`;

        const values = [
            residentNo, firstName, middleName, lastName, parseInt(age) || 0, birthday,
            gender, civilStatus, residentType, voterStatus, houseNo,
            streetAddress, contactNumber, email, fatherName, motherName,
            spouseName, parseInt(numberOfChildren) || 0, emergencyContactName, 
            emergencyContactNumber, emergencyContactAddress, 'N/A'
        ];

        const newResident = await pool.query(queryText, values);
        res.status(201).json(newResident.rows[0]);
    } catch (err) {
        console.error("SQL ERROR:", err.message);
        res.status(500).json("Database failed to save record.");
    }
});

// 3. UPDATE STATUS
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.query('UPDATE resident SET "status" = $1 WHERE "ResidentID" = $2', [status, id]);
        res.json({ message: "Status updated" });
    } catch (err) {
        console.error("Update Error:", err.message);
        res.status(500).json("Update failed.");
    }
});

module.exports = router;