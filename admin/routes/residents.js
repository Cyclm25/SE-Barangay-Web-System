const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");


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

router.post("/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      residentNo, firstName, middleName, lastName, age, birthday,
      gender, civilStatus, residentType, voterStatus, houseNo,
      streetAddress, contactNumber, email, fatherName, motherName,
      spouseName, numberOfChildren, emergencyContactName,
      emergencyContactNumber, emergencyContactAddress,

      // ✅ add this from your system (frontend)
      password
    } = req.body;

    // Basic guard
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    await client.query("BEGIN");

    // 1) Insert into resident
    const residentInsert = await client.query(
      `
      INSERT INTO resident (
        "ResidentID", "FirstName", "MiddleName", "LastName", "Age", "Birthday",
        "Gender", "CivilStatus", "ResidentType", "VoterStatus", "HouseNumber",
        "StreetAddress", "ContactNumber", "Email", "FatherName", "MotherName",
        "SpouseName", "NoOfChildren", "ContactPerson", "ContactPersonNo",
        "ContactPersonAddress", "BarangayCard", "status"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'Active')
      RETURNING *
      `,
      [
        residentNo, firstName, middleName, lastName, parseInt(age) || 0, birthday,
        gender, civilStatus, residentType, voterStatus, houseNo,
        streetAddress, contactNumber, email, fatherName, motherName,
        spouseName, parseInt(numberOfChildren) || 0, emergencyContactName,
        emergencyContactNumber, emergencyContactAddress, "N/A"
      ]
    );

    // 2) Hash password + insert into residentaccount
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await client.query(
      `
      INSERT INTO residentaccount ("ResidentID", "Password", "Role")
      VALUES ($1, $2, $3)
      `,
      [residentNo, passwordHash, "Resident"]
    );

    await client.query("COMMIT");

    // Return resident info (do NOT return hash)
    res.status(201).json(residentInsert.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SQL ERROR:", err.message);
    res.status(500).json("Database failed to save record.");
  } finally {
    client.release();
  }
});

module.exports = router;