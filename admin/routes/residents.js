const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

/* =========================
   GET ALL RESIDENTS
========================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        *,
        to_char("Birthday", 'YYYY-MM-DD') AS "Birthday"
      FROM resident
      ORDER BY "ResidentID" DESC
      `
    );

    return res.json({ residents: result.rows });
  } catch (err) {
    console.error("GET /residents Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


/* =========================
   GET RESIDENT STATUS
   IMPORTANT: must come BEFORE /:id
========================= */
router.get("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT "status" FROM resident WHERE "ResidentID" = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    return res.json({
      ResidentID: id,
      status: result.rows[0].status,
    });
  } catch (err) {
    console.error("GET /residents/:id/status Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET RESIDENT BY ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        "ResidentID",
        "FirstName",
        "MiddleName",
        "LastName",
        "Age",
        to_char("Birthday", 'YYYY-MM-DD') AS "Birthday", -- ✅ return plain date string
        "Gender",
        "CivilStatus",
        "ResidentType",
        "VoterStatus",
        "HouseNumber",
        "StreetAddress",
        "ContactNumber",
        "Email",
        "FatherName",
        "MotherName",
        "SpouseName",
        "NoOfChildren",
        "ContactPerson",
        "ContactPersonNo",
        "ContactPersonAddress",
        "BarangayCard",
        "status"
      FROM resident
      WHERE "ResidentID" = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /residents/:id Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   REGISTER RESIDENT + ACCOUNT
========================= */
router.post("/register", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      residentNo, firstName, middleName, lastName, age, birthday,
      gender, civilStatus, residentType, voterStatus, houseNo,
      streetAddress, contactNumber, email, fatherName, motherName,
      spouseName, numberOfChildren, emergencyContactName,
      emergencyContactNumber, emergencyContactAddress,
      password
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    await client.query("BEGIN");

    const residentInsert = await client.query(
      `
      INSERT INTO resident (
        "ResidentID", "FirstName", "MiddleName", "LastName", "Age", "Birthday",
        "Gender", "CivilStatus", "ResidentType", "VoterStatus", "HouseNumber",
        "StreetAddress", "ContactNumber", "Email", "FatherName", "MotherName",
        "SpouseName", "NoOfChildren", "ContactPerson", "ContactPersonNo",
        "ContactPersonAddress", "BarangayCard", "status"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'Active')
      RETURNING *
      `,
      [
        residentNo,
        firstName,
        middleName,
        lastName,
        parseInt(age) || 0,
        birthday,
        gender,
        civilStatus,
        residentType,
        voterStatus,
        houseNo,
        streetAddress,
        contactNumber,
        email,
        fatherName,
        motherName,
        spouseName,
        parseInt(numberOfChildren) || 0,
        emergencyContactName,
        emergencyContactNumber,
        emergencyContactAddress,
        "N/A",
      ]
    );

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await client.query(
      `INSERT INTO residentaccount ("ResidentID", "Password", "Role")
       VALUES ($1, $2, $3)`,
      [residentNo, passwordHash, "Resident"]
    );

    await client.query("COMMIT");
    return res.status(201).json(residentInsert.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("REGISTER ERROR:", err.message);
    return res.status(500).json({ error: "Database failed to save record." });
  } finally {
    client.release();
  }
});

/* =========================
   UPDATE RESIDENT STATUS
========================= */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        error: "Status must be Active or Inactive"
      });
    }

    const result = await pool.query(
      `
      UPDATE resident
      SET "status" = $1
      WHERE "ResidentID" = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Resident not found",
        idSent: id
      });
    }

    return res.json({
      message: "Status updated",
      updated: result.rows[0]
    });

  } catch (err) {
    console.error("PATCH /residents/:id/status error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
