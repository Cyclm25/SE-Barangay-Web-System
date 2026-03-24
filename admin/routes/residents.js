const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/verifyToken");


function calculateAge(birthday) {
  const today = new Date();
  const birth = new Date(birthday);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

async function hasResidentReligionColumn(client) {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resident'
      AND column_name = 'religion'
    LIMIT 1
    `
  );

  return result.rows.length > 0;
}

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

router.get("/check-email/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const result = await pool.query(
      `
      SELECT 1
      FROM (
        SELECT LOWER("Email") AS email FROM resident
        UNION
        SELECT LOWER("Email") AS email FROM barangayadmin
      ) existing_emails
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    return res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error("GET /residents/check-email/:email Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/check-contact/:contactNumber", async (req, res) => {
  try {
    const contactNumber = String(req.params.contactNumber || "").trim();

    if (!contactNumber) {
      return res.status(400).json({ error: "Contact number is required." });
    }

    const result = await pool.query(
      `
      SELECT 1
      FROM (
        SELECT "ContactNumber" AS contact_number FROM resident
        UNION
        SELECT "ContactNumber" AS contact_number FROM barangayadmin
      ) existing_contacts
      WHERE contact_number = $1
      LIMIT 1
      `,
      [contactNumber]
    );

    return res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error("GET /residents/check-contact/:contactNumber Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
    GET RESIDENT STATUS
    IMPORTANT: must come BEFORE /:id
========================= */
router.get("/:id", async (req, res) => {
  console.log("HIT /residents/:id =", req.params.id);
  try {
    const { id } = req.params;
    const includeReligion = await hasResidentReligionColumn();

    const selectFields = [
      `"ResidentID"`,
      `"FirstName"`,
      `"MiddleName"`,
      `"LastName"`,
      `"Age"`,
      `to_char("Birthday", 'YYYY-MM-DD') AS "Birthday"`,
      `"Gender"`,
      `"CivilStatus"`,
      `"ResidentType"`,
      `"VoterStatus"`,
      `"HouseNumber"`,
      `"StreetAddress"`,
      `"ContactNumber"`,
      `"Email"`,
      `"FatherName"`,
      `"MotherName"`,
      `"SpouseName"`,
      `"NoOfChildren"`,
      `"ContactPerson"`,
      `"ContactPersonNo"`,
      `"ContactPersonAddress"`,
      `"BarangayCard"`,
      `"ProfileImage"`,
      `"ResidentAccountID"`,
      `"status"`,
    ];

    if (includeReligion) {
      selectFields.push(`religion AS "Religion"`);
    }

    const result = await pool.query(
      `
      SELECT
        ${selectFields.join(",\n        ")}
      FROM resident
      WHERE TRIM("ResidentID") = TRIM($1)
      LIMIT 1
      `,
      [id]

      
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    // Matches frontend usage: data.FirstName, data.MiddleName, data.LastName, etc.
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /residents/:id Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   REGISTER RESIDENT (Admin/SuperAdmin)
   POST /residents/register
   Requires Authorization: Bearer <token>
========================= */
router.post("/register", verifyToken, async (req, res) => {
  const client = await pool.connect();

  const toBool = (v) => {
    if (v === true || v === false) return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "1") return true;
      if (s === "false" || s === "no" || s === "0") return false;
    }
    if (typeof v === "number") return v === 1;
    return false;
  };

  try {
    // Only admins should create residents
    const isAdminActor = req.user?.type === "superadmin" || req.user?.type === "barangayadmin";
const actorId = req.user?.superAdminId || req.user?.barangayAdminId || null;

if (!isAdminActor || !actorId) {
  return res.status(403).json({ error: "Only admin/superadmin can register residents." });
}

    const {
      firstName,
      middleName,
      lastName,
      age,
      birthday,
      gender,
      civilStatus,
      religion,
      residentType,
      voterStatus,
      houseNo,
      streetAddress,
      contactNumber,
      email,
      fatherName,
      motherName,
      spouseName,
      numberOfChildren,
      emergencyContactName,
      emergencyContactNumber,
      emergencyContactAddress,
      password,
    } = req.body;

    if (computedAge < 12) {
  return res.status(400).json({
    error: "Resident must be at least 12 years old.",
  });
}

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (!firstName || !lastName || !age || !birthday || !gender || !civilStatus || !residentType || !contactNumber || !email) {
      return res.status(400).json({ error: "Missing required resident fields." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedContactNumber = String(contactNumber).trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(normalizedEmail)) {
      return res.status(400).json({ error: "Only valid Gmail addresses are allowed." });
    }
    if (!/^\d{11}$/.test(normalizedContactNumber)) {
      return res.status(400).json({ error: "Contact number must be exactly 11 digits." });
    }

    await client.query("BEGIN");

    const existingEmail = await client.query(
      `
      SELECT 1
      FROM (
        SELECT LOWER("Email") AS email FROM resident
        UNION
        SELECT LOWER("Email") AS email FROM barangayadmin
      ) existing_emails
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingEmail.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already exists." });
    }

    const existingContactNumber = await client.query(
      `
      SELECT 1
      FROM (
        SELECT "ContactNumber" AS contact_number FROM resident
        UNION
        SELECT "ContactNumber" AS contact_number FROM barangayadmin
      ) existing_contacts
      WHERE contact_number = $1
      LIMIT 1
      `,
      [normalizedContactNumber]
    );

    if (existingContactNumber.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Contact number already exists." });
    }

    const profileImage = req.body.profileImage || null;
    const residentReligion = req.body.religion || null;
    const includeReligion = await hasResidentReligionColumn(client);
    const residentColumns = [
      `"FirstName"`,
      `"MiddleName"`,
      `"LastName"`,
      `"Age"`,
      `"Birthday"`,
      `"Gender"`,
      `"CivilStatus"`,
      `"ResidentType"`,
      `"VoterStatus"`,
      `"HouseNumber"`,
      `"StreetAddress"`,
      `"ContactNumber"`,
      `"Email"`,
      `"FatherName"`,
      `"MotherName"`,
      `"SpouseName"`,
      `"NoOfChildren"`,
      `"ContactPerson"`,
      `"ContactPersonNo"`,
      `"ContactPersonAddress"`,
      `"BarangayCard"`,
      `"ProfileImage"`,
      `"status"`,
    ];
    const residentValues = [
      firstName,
      middleName,
      lastName,
    computedAge,
      birthday,
      gender,
      civilStatus,
      residentType,
      toBool(voterStatus),
      houseNo || null,
      streetAddress || null,
      normalizedContactNumber,
      normalizedEmail,
      fatherName || null,
      motherName || null,
      spouseName || null,
      parseInt(numberOfChildren, 10) || 0,
      emergencyContactName || null,
      emergencyContactNumber || null,
      emergencyContactAddress || null,
      "N/A",
      profileImage,
      "Active",
    ];

    if (includeReligion) {
      residentColumns.push(`religion`);
      residentValues.push(residentReligion);
    }

    const residentInsert = await client.query(
      `
      INSERT INTO resident (
        ${residentColumns.join(", ")}
      )
      VALUES (${residentValues.map((_, index) => `$${index + 1}`).join(", ")})
      RETURNING *
      `,
      residentValues
    );

    const newResidentId = residentInsert.rows[0]?.ResidentID || residentInsert.rows[0]?.residentid;

    if (!newResidentId) {
      throw new Error("Failed to get newly generated ResidentID.");
    }

    // 2) Insert residentaccount
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await client.query(
      `INSERT INTO residentaccount ("ResidentID", "Password", "Role")
       VALUES ($1, $2, $3)`,
      [newResidentId, passwordHash, "Resident"]
    );

    // 3) Log transaction BEFORE COMMIT (same DB transaction)
    await client.query(
      `
      INSERT INTO transaction_history
        ("RequestID","ResidentID","Action","RequestStatus","RequestType","RequestPurpose","CreatedAt")
      VALUES
        ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [
        null,
        actorId,
        "Created Resident Account",
        "Success",
        "Resident Records",
        `Created resident: ${newResidentId}`,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json(residentInsert.rows[0]);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch { }
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: err.message || "Database failed to save record." });
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
      return res.status(400).json({ error: "Status must be Active or Inactive" });
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
      return res.status(404).json({ error: "Resident not found", idSent: id });
    }

    return res.json({ message: "Status updated", updated: result.rows[0] });
  } catch (err) {
    console.error("PATCH /residents/:id/status error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


/* =========================
   UPDATE RESIDENT PROFILE
   PUT /residents/:id
   Only allows fields the resident can self-edit.
   Admin can also call this to update any resident.
========================= */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      civilStatus,
      contactNumber,
      email,
      contactPerson,
      contactPersonNo,
      contactPersonAddress,
    } = req.body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
      return res.status(400).json({ error: "Only Gmail addresses are allowed." });
    }

    // Check email uniqueness (exclude current resident)
    if (email) {
      const emailCheck = await pool.query(
        `
        SELECT 1
        FROM resident
        WHERE LOWER("Email") = LOWER($1)
          AND "ResidentID"::text != $2::text
        UNION
        SELECT 1
        FROM barangayadmin
        WHERE LOWER("Email") = LOWER($1)
        LIMIT 1
        `,
        [email.trim(), id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: "Email is already in use by another account." });
      }
    }

    const result = await pool.query(
      `
      UPDATE resident
      SET
        "CivilStatus"          = COALESCE($1, "CivilStatus"),
        "ContactNumber"        = COALESCE($2, "ContactNumber"),
        "Email"                = COALESCE($3, "Email"),
        "ContactPerson"        = COALESCE($4, "ContactPerson"),
        "ContactPersonNo"      = COALESCE($5, "ContactPersonNo"),
        "ContactPersonAddress" = COALESCE($6, "ContactPersonAddress")
      WHERE "ResidentID" = $7
      RETURNING *
      `,
      [
        civilStatus        || null,
        contactNumber      || null,
        email              ? email.trim().toLowerCase() : null,
        contactPerson      || null,
        contactPersonNo    || null,
        contactPersonAddress || null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Resident not found." });
    }

    return res.json({ message: "Profile updated successfully.", resident: result.rows[0] });
  } catch (err) {
    console.error("PUT /residents/:id Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;