const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");


/* =========================
   LOGIN (USES ResidentAccountID as stable id)
========================= */
router.post("/login", async (req, res) => {
  try {
    const { residentId, password } = req.body;

    if (!residentId || !password) {
      return res
        .status(400)
        .json({ error: "residentId and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: "Server misconfigured: JWT_SECRET is missing in environment.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        ra."ResidentAccountID" AS "ResidentAccountID",
        ra."Password" AS "PasswordValue",
        ra."Role" AS "Role",
        ra."ResidentID" AS "ResidentID",
        ra."BarangayAdminID" AS "BarangayAdminID",
        ra."SuperAdminID" AS "SuperAdminID",
        r."status" AS "ResidentStatus",
        COALESCE(r."FirstName", ba."AdminName", 'Super Admin') AS "DisplayName"
      FROM residentaccount ra
      LEFT JOIN resident r ON ra."ResidentID" = r."ResidentID"
      LEFT JOIN barangayadmin ba ON ra."BarangayAdminID" = ba."BarangayAdminID"
      LEFT JOIN superadmin sa ON ra."SuperAdminID" = sa."SuperAdminID"
      WHERE ra."ResidentID" = $1
         OR ra."BarangayAdminID" = $1
         OR ra."SuperAdminID" = $1
      LIMIT 1
      `,
      [residentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    const row = result.rows[0];

    // pg can lowercase keys; normalize
    const ResidentAccountID =
      row.ResidentAccountID ?? row.residentaccountid ?? null;
    const PasswordValue = row.PasswordValue ?? row.passwordvalue ?? null;
    const Role = row.Role ?? row.role ?? null;

    const ResidentID = row.ResidentID ?? row.residentid ?? null;
    const BarangayAdminID = row.BarangayAdminID ?? row.barangayadminid ?? null;
    const SuperAdminID = row.SuperAdminID ?? row.superadminid ?? null;

    const ResidentStatus = row.ResidentStatus ?? row.residentstatus ?? null;
    const DisplayName = row.DisplayName ?? row.displayname ?? null;

    // Block only inactive residents
    if (ResidentID != null && ResidentStatus === "Inactive") {
      return res.status(403).json({ error: "Account is deactivated." });
    }

    const isResident = ResidentID != null;
    const isAdminOrSuper = BarangayAdminID != null || SuperAdminID != null;

    let isMatch = false;

    if (isResident) {
      isMatch = await bcrypt.compare(password, PasswordValue);
    } else if (isAdminOrSuper) {
      // NOTE: Your admin/super passwords are currently plaintext in DB based on your original logic.
      // If you later hash them too, change this to bcrypt.compare.
      isMatch = password === PasswordValue;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    if (!ResidentAccountID) {
      return res
        .status(500)
        .json({ error: "Login error: missing ResidentAccountID" });
    }

    const userType = SuperAdminID
      ? "superadmin"
      : BarangayAdminID
        ? "barangayadmin"
        : "resident";

    // ✅ Issue JWT token (used for autofill + secure request submission)
    const token = jwt.sign(
      {
        accountId: ResidentAccountID,
        type: userType,
        role: Role,
        residentId: ResidentID,
        barangayAdminId: BarangayAdminID,
        superAdminId: SuperAdminID,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login Successful",
      token,
      user: {
        id: ResidentAccountID, // stable PK for all accounts
        type: userType,
        role: Role,
        displayName: DisplayName,
        residentId: ResidentID,
        barangayAdminId: BarangayAdminID,
        superAdminId: SuperAdminID,
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =========================
   CURRENT USER PROFILE (AUTO-FILL)
   GET /auth/me
   Header: Authorization: Bearer <token>
========================= */
router.get("/me", verifyToken, async (req, res) => {
  try {
    if (!req.user?.residentId) {
      return res.status(403).json({ error: "Not a resident account" });
    }

    const result = await pool.query(
      `SELECT
     *,
     ("Birthday"::date)::text AS "Birthday"
   FROM resident
   WHERE "ResidentID" = $1
   LIMIT 1`,
      [req.user.residentId]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /auth/me Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =========================
   FORGOT PASSWORD (OTP)
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { residentId } = req.body;

    if (!residentId) {
      return res.status(400).json({ error: "Resident ID is required" });
    }

    const userResult = await pool.query(
      `
      SELECT r."Email"
      FROM residentaccount ra
      JOIN resident r ON ra."ResidentID" = r."ResidentID"
      WHERE ra."ResidentID" = $1
      LIMIT 1
      `,
      [residentId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    const email = userResult.rows[0].Email ?? userResult.rows[0].email;

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `
      UPDATE residentaccount
      SET "OtpCode" = $1,
          "OtpExpiry" = $2
      WHERE "ResidentID" = $3
      `,
      [otpCode, expiry, residentId]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Barangay 160" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset Code",
      text: `Your OTP code is ${otpCode}. It will expire in 10 minutes.`,
    });

    return res.json({ message: "OTP sent to registered email" });
  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =========================
   VERIFY OTP
========================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { residentId, otpCode } = req.body;

    if (!residentId || !otpCode) {
      return res
        .status(400)
        .json({ error: "Resident ID and OTP are required" });
    }

    const result = await pool.query(
      `
      SELECT "OtpCode", "OtpExpiry"
      FROM residentaccount
      WHERE "ResidentID" = $1
      LIMIT 1
      `,
      [residentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resident not found" });
    }

    const storedOtp = result.rows[0].OtpCode ?? result.rows[0].otpcode;
    const expiry = result.rows[0].OtpExpiry ?? result.rows[0].otpexpiry;

    if (!storedOtp || storedOtp !== otpCode) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > new Date(expiry)) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    return res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
