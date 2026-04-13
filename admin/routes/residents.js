const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");
const nodemailer = require("nodemailer");

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function isValidGmail(value) {
  return /^[a-z0-9](\.?[a-z0-9]){5,29}@gmail\.com$/i.test(cleanString(value).toLowerCase());
}

function isLettersAndSpaces(value) {
  return /^[A-Za-z\s]+$/.test(cleanString(value));
}

function isPositiveWholeNumber(value) {
  return /^\d+$/.test(cleanString(value));
}

function isValidDateInput(value) {
  const raw = cleanString(value);
  if (!raw) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;

  const parsed = new Date(`${raw}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function validateResidentPayload(payload, { requirePassword = false } = {}) {
  const firstName = cleanString(payload.firstName);
  const middleName = cleanString(payload.middleName);
  const lastName = cleanString(payload.lastName);
  const birthday = cleanString(payload.birthday);
  const gender = cleanString(payload.gender);
  const civilStatus = cleanString(payload.civilStatus);
  const residentType = cleanString(payload.residentType);
  const houseNo = cleanString(payload.houseNo);
  const streetAddress = cleanString(payload.streetAddress);
  const contactNumber = normalizeDigits(payload.contactNumber);
  const email = cleanString(payload.email).toLowerCase();
  const emergencyContactName = cleanString(payload.emergencyContactName);
  const emergencyContactNumber = normalizeDigits(payload.emergencyContactNumber);
  const emergencyContactAddress = cleanString(payload.emergencyContactAddress);
  const postalCode = cleanString(payload.zipCode ?? payload.postalCode);
  const ageValue = cleanString(payload.age);
  const numberOfChildrenValue = cleanString(payload.numberOfChildren);
  const password = cleanString(payload.password);

  if (!firstName) return "First name is required.";
  if (!isLettersAndSpaces(firstName)) return "First name must contain letters and spaces only.";
  if (firstName.length > 50) return "First name must not exceed 50 characters.";

  if (middleName) {
    if (!isLettersAndSpaces(middleName)) return "Middle name must contain letters and spaces only.";
    if (middleName.length > 50) return "Middle name must not exceed 50 characters.";
  }

  if (!lastName) return "Last name is required.";
  if (!isLettersAndSpaces(lastName)) return "Last name must contain letters and spaces only.";
  if (lastName.length > 50) return "Last name must not exceed 50 characters.";

  if (!birthday) return "Birthday is required.";
  if (!isValidDateInput(birthday)) return "Birthday must be a valid date.";
  if (!gender) return "Gender is required.";
  if (!civilStatus) return "Civil status is required.";
  if (!residentType) return "Resident type is required.";

  if (!ageValue || !isPositiveWholeNumber(ageValue)) return "Age must be a valid whole number.";

  if (!houseNo) return "House number is required.";
  if (!streetAddress) return "Street address is required.";

  if (!/^\d{11}$/.test(contactNumber)) return "Contact number must be exactly 11 digits.";
  if (!email) return "Email is required.";
  if (!isValidGmail(email)) return "Only valid Gmail addresses are allowed.";

  if (!emergencyContactName) return "Emergency contact name is required.";
  if (!/^\d{11}$/.test(emergencyContactNumber)) return "Emergency contact number must be exactly 11 digits.";
  if (!emergencyContactAddress) return "Emergency contact address is required.";

  if (postalCode && !/^\d{4}$/.test(postalCode)) return "Postal code must be exactly 4 digits.";

  if (numberOfChildrenValue && !isPositiveWholeNumber(numberOfChildrenValue)) {
    return "Number of children must be a valid whole number.";
  }

  if (requirePassword && !password) return "Password is required.";

  return null;
}

function validateResidentSelfProfilePayload(payload) {
  const civilStatus = cleanString(payload.civilStatus);
  const contactNumber = normalizeDigits(payload.contactNumber);
  const email = cleanString(payload.email).toLowerCase();
  const contactPerson = cleanString(payload.contactPerson ?? payload.emergencyContactName);
  const contactPersonNo = normalizeDigits(payload.contactPersonNo ?? payload.emergencyContactNumber);
  const contactPersonAddress = cleanString(payload.contactPersonAddress ?? payload.emergencyContactAddress);

  if (!civilStatus) return "Civil status is required.";
  if (!/^\d{11}$/.test(contactNumber)) return "Contact number must be exactly 11 digits.";
  if (!email) return "Email is required.";
  if (!isValidGmail(email)) return "Only Gmail addresses are allowed.";
  if (!contactPerson) return "Emergency contact name is required.";
  if (!/^\d{11}$/.test(contactPersonNo)) return "Emergency contact number must be exactly 11 digits.";
  if (!contactPersonAddress) return "Emergency contact address is required.";

  return null;
}


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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendResidentAccountCreatedEmail({ to, firstName, lastName, residentId }) {
  if (!to) return;

  await transporter.sendMail({
    from: `"Barangay Office" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Resident Account Created Successfully",
    html: `
      <p>Good day, ${firstName || ""} ${lastName || ""},</p>
      <p>Your resident account has been successfully created.</p>
      <p><strong>Resident Number:</strong> ${residentId}</p>
      <p>Please keep this resident number for login and verification purposes.</p>
      <p>Thank you.</p>
      <p>Barangay Office</p>
    `,
  });
}

async function getResidentColumnName(columnName, client) {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resident'
      AND LOWER(column_name) = LOWER($1)
    LIMIT 1
    `,
    [columnName]
  );

  return result.rows[0]?.column_name || null;
}

async function hasResidentReligionColumn(client) {
  return !!(await getResidentColumnName("religion", client));
}

async function generateNextResidentId(client) {
  const result = await client.query(
    `
    SELECT "ResidentID"
    FROM resident
    WHERE "ResidentID" ~ '^RS[0-9]{8}$'
    ORDER BY CAST(RIGHT("ResidentID", 4) AS INTEGER) DESC
    LIMIT 1
    `
  );

  const currentYear = new Date().getFullYear();
  const lastId = result.rows[0]?.ResidentID;
  const nextNumber = lastId
    ? (parseInt(String(lastId).slice(-4), 10) || 0) + 1
    : 1;

  return `RS${currentYear}${String(nextNumber).padStart(4, "0")}`;
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
    const religionColumn = await getResidentColumnName("religion");
    const nationalityColumn = await getResidentColumnName("nationality");
    const cityColumn = await getResidentColumnName("city");
    const provinceColumn = await getResidentColumnName("province");
    const zipCodeColumn = await getResidentColumnName("zipcode");

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

    if (religionColumn) {
      selectFields.push(`"${religionColumn}" AS "Religion"`);
    }
    if (nationalityColumn) {
      selectFields.push(`"${nationalityColumn}" AS "Nationality"`);
    }
    if (cityColumn) {
      selectFields.push(`"${cityColumn}" AS "City"`);
    }
    if (provinceColumn) {
      selectFields.push(`"${provinceColumn}" AS "Province"`);
    }
    if (zipCodeColumn) {
      selectFields.push(`"${zipCodeColumn}" AS "ZipCode"`);
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
router.post("/register", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  const client = await pool.connect();

  const toBool = (v) => {
    if (v === true || v === false) return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "1" || s === "voter" || s === "registered") return true;
      if (s === "false" || s === "no" || s === "0" || s === "non-voter" || s === "non voter" || s === "not registered") return false;
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
      zipCode,
      password,
    } = req.body;

    const computedAge = calculateAge(birthday);

    if (computedAge < 12) {
      return res.status(400).json({
        error: "Resident must be at least 12 years old.",
      });
    }

    const validationError = validateResidentPayload(req.body, { requirePassword: true });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const normalizedEmail = cleanString(email).toLowerCase();
    const normalizedContactNumber = normalizeDigits(contactNumber);
    const normalizedEmergencyContactNumber = normalizeDigits(emergencyContactNumber);
    const normalizedZipCode = cleanString(zipCode);
    const normalizedNumberOfChildren = cleanString(numberOfChildren)
      ? parseInt(cleanString(numberOfChildren), 10)
      : 0;

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
    const residentNationality = req.body.nationality || null;
    const residentCity = req.body.city || null;
    const residentProvince = req.body.province || null;
    const residentZipCode = req.body.zipCode || req.body.postalCode || null;
    const religionColumn = await getResidentColumnName("religion", client);
    const nationalityColumn = await getResidentColumnName("nationality", client);
    const cityColumn = await getResidentColumnName("city", client);
    const provinceColumn = await getResidentColumnName("province", client);
    const zipCodeColumn = await getResidentColumnName("zipcode", client);
    const newResidentId = await generateNextResidentId(client);

    const residentColumns = [
      `"ResidentID"`,
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
      newResidentId,
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
      normalizedNumberOfChildren,
      emergencyContactName || null,
      normalizedEmergencyContactNumber || null,
      emergencyContactAddress || null,
      "N/A",
      profileImage,
      "Active",
    ];

    if (religionColumn) {
      residentColumns.push(`"${religionColumn}"`);
      residentValues.push(residentReligion);
    }
    if (nationalityColumn) {
      residentColumns.push(`"${nationalityColumn}"`);
      residentValues.push(residentNationality);
    }
    if (cityColumn) {
      residentColumns.push(`"${cityColumn}"`);
      residentValues.push(residentCity);
    }
    if (provinceColumn) {
      residentColumns.push(`"${provinceColumn}"`);
      residentValues.push(residentProvince);
    }
    if (zipCodeColumn) {
      residentColumns.push(`"${zipCodeColumn}"`);
      residentValues.push(normalizedZipCode || residentZipCode || null);
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

    try {
      await sendResidentAccountCreatedEmail({
        to: normalizedEmail,
        firstName,
        lastName,
        residentId: newResidentId,
      });
    } catch (emailErr) {
      console.error("REGISTER EMAIL ERROR:", emailErr.message);
    }

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

router.put("/:id", verifyToken, requireNonSkWriteAccess, async (req, res) => {
  const client = await pool.connect();

  const toBool = (v) => {
    if (v === true || v === false) return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "1" || s === "voter" || s === "registered") return true;
      if (s === "false" || s === "no" || s === "0" || s === "non-voter" || s === "non voter" || s === "not registered") return false;
    }
    if (typeof v === "number") return v === 1;
    return false;
  };

  try {
    const { id } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      age,
      birthday,
      gender,
      civilStatus,
      religion,
      nationality,
      city,
      province,
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
      zipCode,
      profileImage,
    } = req.body;

    const validationError = validateResidentPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const normalizedEmail = cleanString(email).toLowerCase();
    const normalizedContactNumber = normalizeDigits(contactNumber);
    const normalizedEmergencyContactNumber = normalizeDigits(emergencyContactNumber);
    const normalizedZipCode = cleanString(zipCode);
    const normalizedNumberOfChildren = cleanString(numberOfChildren)
      ? parseInt(cleanString(numberOfChildren), 10)
      : 0;

    await client.query("BEGIN");

    const existingEmail = await client.query(
      `
      SELECT 1
      FROM resident
      WHERE LOWER("Email") = $1
        AND TRIM("ResidentID") <> TRIM($2)
      LIMIT 1
      `,
      [normalizedEmail, id]
    );

    if (existingEmail.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already exists." });
    }

    const existingContactNumber = await client.query(
      `
      SELECT 1
      FROM resident
      WHERE "ContactNumber" = $1
        AND TRIM("ResidentID") <> TRIM($2)
      LIMIT 1
      `,
      [normalizedContactNumber, id]
    );

    if (existingContactNumber.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Contact number already exists." });
    }

    const religionColumn = await getResidentColumnName("religion", client);
    const nationalityColumn = await getResidentColumnName("nationality", client);
    const cityColumn = await getResidentColumnName("city", client);
    const provinceColumn = await getResidentColumnName("province", client);
    const zipCodeColumn = await getResidentColumnName("zipcode", client);
    const updateFields = [
      `"FirstName" = $1`,
      `"MiddleName" = $2`,
      `"LastName" = $3`,
      `"Age" = $4`,
      `"Birthday" = $5`,
      `"Gender" = $6`,
      `"CivilStatus" = $7`,
      `"ResidentType" = $8`,
      `"VoterStatus" = $9`,
      `"HouseNumber" = $10`,
      `"StreetAddress" = $11`,
      `"ContactNumber" = $12`,
      `"Email" = $13`,
      `"FatherName" = $14`,
      `"MotherName" = $15`,
      `"SpouseName" = $16`,
      `"NoOfChildren" = $17`,
      `"ContactPerson" = $18`,
      `"ContactPersonNo" = $19`,
      `"ContactPersonAddress" = $20`,
      `"ProfileImage" = $21`,
    ];

    const updateValues = [
      firstName,
      middleName || null,
      lastName,
      parseInt(age, 10),
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
      normalizedNumberOfChildren,
      emergencyContactName || null,
      normalizedEmergencyContactNumber || null,
      emergencyContactAddress || null,
      profileImage || null,
    ];

    if (religionColumn) {
      updateFields.push(`"${religionColumn}" = $${updateValues.length + 1}`);
      updateValues.push(religion || null);
    }
    if (nationalityColumn) {
      updateFields.push(`"${nationalityColumn}" = $${updateValues.length + 1}`);
      updateValues.push(nationality || null);
    }
    if (cityColumn) {
      updateFields.push(`"${cityColumn}" = $${updateValues.length + 1}`);
      updateValues.push(city || null);
    }
    if (provinceColumn) {
      updateFields.push(`"${provinceColumn}" = $${updateValues.length + 1}`);
      updateValues.push(province || null);
    }
    if (zipCodeColumn) {
      updateFields.push(`"${zipCodeColumn}" = $${updateValues.length + 1}`);
      updateValues.push(normalizedZipCode || null);
    }

    updateValues.push(id);

    const updateResult = await client.query(
      `
      UPDATE resident
      SET ${updateFields.join(", ")}
      WHERE TRIM("ResidentID") = TRIM($${updateValues.length})
      RETURNING *
      `,
      updateValues
    );

    await client.query("COMMIT");

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found." });
    }

    return res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT /residents/:id Error:", err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================
   UPDATE RESIDENT STATUS
========================= */
router.patch("/:id/status", verifyToken, requireNonSkWriteAccess, async (req, res) => {
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
router.put("/:id/profile", verifyToken, async (req, res) => {
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

    if (!req.user?.residentId && req.user?.type !== "superadmin" && req.user?.type !== "barangayadmin") {
      return res.status(403).json({ error: "Unauthorized profile update." });
    }

    if (req.user?.residentId && String(req.user.residentId).trim() !== String(id).trim()) {
      return res.status(403).json({ error: "You can only update your own profile." });
    }

    const validationError = validateResidentSelfProfilePayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
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
        civilStatus.trim() || null,
        normalizeDigits(contactNumber) || null,
        email              ? email.trim().toLowerCase() : null,
        contactPerson      || null,
        normalizeDigits(contactPersonNo) || null,
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
