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
      return res.status(400).json({ error: "residentId and password are required" });
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
        COALESCE(r."FirstName", ba."AdminName", 'Super Admin') AS "DisplayName",
        ba."Position" AS "Position"
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

    const ResidentAccountID = row.ResidentAccountID ?? row.residentaccountid ?? null;
    const PasswordValue = row.PasswordValue ?? row.passwordvalue ?? null;
    const Role = row.Role ?? row.role ?? null;

    const ResidentID = row.ResidentID ?? row.residentid ?? null;
    const BarangayAdminID = row.BarangayAdminID ?? row.barangayadminid ?? null;
    const SuperAdminID = row.SuperAdminID ?? row.superadminid ?? null;

    const ResidentStatus = row.ResidentStatus ?? row.residentstatus ?? null;
    const BarangayAdminStatus =
      row.BarangayAdminStatus ?? row.barangayadminstatus ?? null;
    const DisplayName = row.DisplayName ?? row.displayname ?? null;
    const Position = row.Position ?? row.position ?? null;

    // Block only inactive residents
    if (ResidentID != null && ResidentStatus === "Inactive") {
      return res.status(403).json({ error: "Account is inactive." });
    }

    // Block inactive barangay admin accounts
    if (BarangayAdminID != null && BarangayAdminStatus === false) {
      return res.status(403).json({ error: "Account is inactive." });
    }

    if (!PasswordValue) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    // Enforce bcrypt-only login (old plaintext passwords will NOT be accepted anymore)
    if (typeof PasswordValue !== "string" || !PasswordValue.startsWith("$2")) {
      return res.status(403).json({
        error: "Password must be reset. Please use 'Forgot Password' to set a new one.",
      });
    }

    const isMatch = await bcrypt.compare(password, PasswordValue);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }

    if (!ResidentAccountID) {
      return res.status(500).json({ error: "Login error: missing ResidentAccountID" });
    }

    const userType = SuperAdminID
      ? "superadmin"
      : BarangayAdminID
        ? "barangayadmin"
        : "resident";

    const tokenTtl = String(process.env.JWT_EXPIRES_IN || "7d").trim() || "7d";
    const token = jwt.sign(
      {
        accountId: ResidentAccountID,
        type: userType,
        role: Role,
        position: Position,
        residentId: ResidentID,
        barangayAdminId: BarangayAdminID,
        superAdminId: SuperAdminID,
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenTtl }
    );

    return res.json({
      message: "Login Successful",
      token,
      user: {
        id: ResidentAccountID,
        type: userType,
        role: Role,
        position: Position,
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
    const { email } = req.body;
    const e = String(email || "").trim().toLowerCase();

    if (!e) return res.status(400).json({ error: "Gmail address is required" });
    if (!/^[^\s@]+@gmail\.com$/i.test(e)) {
      return res.status(400).json({ error: "Only Gmail addresses are allowed" });
    }

    // Find the residentaccount row linked to this Gmail (Resident or BarangayAdmin).
    const q = await pool.query(
      `
      SELECT
        ra."ResidentAccountID" AS "ResidentAccountID",
        ra."ResidentID"        AS "ResidentID",
        ra."BarangayAdminID"   AS "BarangayAdminID",
        LOWER(COALESCE(r."Email", ba."Email")) AS "Email",
        COALESCE(r."FirstName", ba."AdminName") AS "DisplayName"
      FROM residentaccount ra
      LEFT JOIN resident r ON ra."ResidentID" = r."ResidentID"
      LEFT JOIN barangayadmin ba ON ra."BarangayAdminID" = ba."BarangayAdminID"
      WHERE LOWER(r."Email") = $1 OR LOWER(ba."Email") = $1
      LIMIT 1
      `,
      [e]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ error: "No Gmail address linked to it" });
    }

    const row = q.rows[0];

    const isResident = !!row.ResidentID;
    const isAdmin = !!row.BarangayAdminID;

    if (!isResident && !isAdmin) {
      return res.status(400).json({ error: "Account type not supported for password reset" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    //Store OTP in THIS residentaccount row
    await pool.query(
      `
      UPDATE residentaccount
      SET "OtpCode" = $1,
          "OtpExpiry" = $2
      WHERE "ResidentAccountID" = $3
      `,
      [otpCode, expiry, row.ResidentAccountID]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Barangay 160" <${process.env.EMAIL_USER}>`,
      to: row.Email,
      subject: "Barangay 160 Password Reset",
      text: `Your OTP code is ${otpCode}. Do not share this code with anyone.`,
    });

    // Identity for UI
    const identity = isResident
      ? {
        type: "resident",
        email: row.Email,
        firstName: row.DisplayName || "",
        username: row.ResidentID,
        residentAccountId: row.ResidentAccountID,
      }
      : isAdmin
      ? {
        type: "barangayadmin",
        email: row.Email,
        firstName: row.DisplayName || "",
        username: row.BarangayAdminID,
        residentAccountId: row.ResidentAccountID,
      }
      : null;

    if (!identity) {
      return res.status(400).json({ error: "Account type not supported for password reset" });
    }

    return res.json({ message: "OTP sent", identity });
  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =========================
   VERIFY OTP (GMAIL ONLY, NO residentId)
   POST /auth/verify-otp
   body: { email, otpCode }
========================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const e = String(email || "").trim().toLowerCase();
    const code = String(otpCode || "").trim();

    if (!e || !code) return res.status(400).json({ error: "Email and OTP are required" });
    if (!/^[^\s@]+@gmail\.com$/i.test(e)) return res.status(400).json({ error: "Only Gmail addresses are allowed" });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "OTP must be 6 digits" });

    const q = await pool.query(
      `
      SELECT
        ra."ResidentAccountID" AS "ResidentAccountID",
        ra."ResidentID"        AS "ResidentID",
        ra."BarangayAdminID"   AS "BarangayAdminID",
        ra."OtpCode"           AS "OtpCode",
        ra."OtpExpiry"         AS "OtpExpiry",
        LOWER(COALESCE(r."Email", ba."Email")) AS "Email",
        COALESCE(r."FirstName", ba."AdminName") AS "DisplayName"
      FROM residentaccount ra
      LEFT JOIN resident r ON ra."ResidentID" = r."ResidentID"
      LEFT JOIN barangayadmin ba ON ra."BarangayAdminID" = ba."BarangayAdminID"
      WHERE LOWER(r."Email") = $1 OR LOWER(ba."Email") = $1
      LIMIT 1
      `,
      [e]
    );

    if (q.rows.length === 0) return res.status(404).json({ error: "No Gmail address linked to it" });

    const row = q.rows[0];

    if (!row.OtpCode || String(row.OtpCode) !== code) return res.status(400).json({ error: "Invalid OTP" });
    if (!row.OtpExpiry || new Date() > new Date(row.OtpExpiry)) return res.status(400).json({ error: "OTP has expired" });

    const isResident = !!row.ResidentID;
    const isAdmin = !!row.BarangayAdminID;
    const identity = isResident
      ? { type: "resident", firstName: row.DisplayName || "", username: row.ResidentID, email: row.Email }
      : isAdmin
      ? { type: "barangayadmin", firstName: row.DisplayName || "", username: row.BarangayAdminID, email: row.Email }
      : null;

    if (!identity) {
      return res.status(400).json({ error: "Account type not supported for password reset" });
    }

    return res.json({
      message: "OTP verified successfully",
      residentAccountId: row.ResidentAccountID,
      identity,
    });
  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* =========================
   RESET PASSWORD (EMAIL + OTP)
   POST /auth/reset-password
   body: { email, otpCode, newPassword }
========================= */
router.post("/reset-password", async (req, res) => {
  const client = await pool.connect();
  try {
    const { residentAccountId, otpCode, newPassword } = req.body;

    const accId = Number(residentAccountId);
    const code = String(otpCode || "").trim();
    const pw = String(newPassword || "").trim();

    if (!Number.isInteger(accId) || accId <= 0 || !code || !pw) {
      return res.status(400).json({ error: "residentAccountId, otpCode, and newPassword are required" });
    }

    // keep your rule; change if you want stronger
    if (!/^[A-Za-z0-9]{8,}$/.test(pw)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and contain letters/numbers only" });
    }

    await client.query("BEGIN");

    const q = await client.query(
      `
      SELECT "ResidentAccountID","Password","OtpCode","OtpExpiry","SuperAdminID"
      FROM residentaccount
      WHERE "ResidentAccountID" = $1
      LIMIT 1
      FOR UPDATE
      `,
      [accId]
    );

    if (q.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Account not found" });
    }

    const row = q.rows[0];

    if (!row.OtpCode) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No OTP found. Request OTP again." });
    }
    if (String(row.OtpCode) !== code) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (!row.OtpExpiry || new Date() > new Date(row.OtpExpiry)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "OTP has expired" });
    }

    const hashed = await bcrypt.hash(pw, 10);

    const upd = await client.query(
      `
      UPDATE residentaccount
      SET "Password" = $1,
          "OtpCode" = NULL,
          "OtpExpiry" = NULL
      WHERE "ResidentAccountID" = $2
      RETURNING "ResidentAccountID","Password"
      `,
      [hashed, accId]
    );

    if (row.SuperAdminID) {
      await client.query(
        `
        UPDATE superadmin
        SET "Password" = $1
        WHERE "SuperAdminID" = $2
        `,
        [hashed, row.SuperAdminID]
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "Password updated successfully",
      residentAccountId: upd.rows[0]?.ResidentAccountID,
      newHashPrefix: String(upd.rows[0]?.Password || "").slice(0, 25),
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { }
    console.error("Reset Password Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

/* =========================
   ADMIN DIRECT RESET FOR BARANGAY OFFICIAL
   POST /auth/admin/reset-password
   body: { barangayAdminId, newPassword }
========================= */
router.post("/admin/reset-password", async (req, res) => {
  const client = await pool.connect();
  try {
    const barangayAdminId = String(req.body?.barangayAdminId || "").trim();
    const pw = String(req.body?.newPassword || "").trim();

    if (!barangayAdminId || !pw) {
      return res.status(400).json({ error: "barangayAdminId and newPassword are required" });
    }

    if (!/^[A-Za-z0-9]{8,}$/.test(pw)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and contain letters/numbers only",
      });
    }

    await client.query("BEGIN");

    const q = await client.query(
      `
      SELECT "ResidentAccountID"
      FROM residentaccount
      WHERE "BarangayAdminID" = $1
      LIMIT 1
      FOR UPDATE
      `,
      [barangayAdminId]
    );

    if (q.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Official account not found" });
    }

    const hashed = await bcrypt.hash(pw, 10);

    await client.query(
      `
      UPDATE residentaccount
      SET "Password" = $1,
          "OtpCode" = NULL,
          "OtpExpiry" = NULL
      WHERE "BarangayAdminID" = $2
      `,
      [hashed, barangayAdminId]
    );

    await client.query(
      `
      UPDATE barangayadmin
      SET "Password" = $1
      WHERE "BarangayAdminID" = $2
      `,
      [hashed, barangayAdminId]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Password updated successfully",
      barangayAdminId,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { }
    console.error("Admin Direct Reset Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});
module.exports = router;
