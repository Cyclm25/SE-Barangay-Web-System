const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

function generateOtp() {
    // 6-digit OTP
    return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/otp/send
router.post("/send", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const trimmedEmail = email.trim();

    // Enforce your DB limit
    if (trimmedEmail.length > 40) {
        return res.status(400).json({ message: "Email too long (max 40 characters)" });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    try {
        // 1️⃣ Check if email exists (admin or resident)
        const exists = await pool.query(
            `
      SELECT 1 FROM barangayadmin WHERE "Email" = $1
      UNION
      SELECT 1 FROM resident WHERE "Email" = $1
      LIMIT 1
      `,
            [trimmedEmail]
        );

        if (exists.rowCount === 0) {
            return res.status(404).json({ message: "Email not found" });
        }

        // 2️⃣ Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // 3️⃣ Hash OTP (bcrypt produces 60 chars)
        const otpHash = await bcrypt.hash(otp, 10);

        // 4️⃣ Expiry (5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // 5️⃣ Remove old OTP for this email
        await pool.query(
            `DELETE FROM password_reset_otp WHERE email = $1`,
            [trimmedEmail]
        );

        // 6️⃣ Insert new OTP
        await pool.query(
            `
      INSERT INTO password_reset_otp (email, otp_hash, expires_at)
      VALUES ($1, $2, $3)
      `,
            [trimmedEmail, otpHash, expiresAt]
        );

        // 7️ Send email
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: trimmedEmail,
            subject: "Barangay 160 Password Reset",
            text: `Your OTP is ${otp}. Do not share this code with anyone. If you didn’t request this, please ignore this message.`,
        });

        return res.json({ message: "OTP sent successfully" });

    } catch (err) {
        console.error("OTP SEND ERROR:", err);

        return res.status(500).json({
            message: "Failed to send OTP",
            error: err?.message,
            code: err?.code,
        });
    }
});

module.exports = router;

// POST /api/otp/verify-reset
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "email and otp are required" });
  }

  const trimmedEmail = String(email).trim();
  const trimmedOtp = String(otp).trim(); // keep as string

  try {
    const r = await pool.query(
      `SELECT otp_hash, expires_at, attempts
       FROM password_reset_otp
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [trimmedEmail]
    );

    if (r.rowCount === 0) {
      return res.status(400).json({ message: "No OTP request found for this email" });
    }

    const row = r.rows[0];

    // expired?
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query(`DELETE FROM password_reset_otp WHERE email=$1`, [trimmedEmail]);
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    // attempt limit
    if (row.attempts >= 5) {
      await pool.query(`DELETE FROM password_reset_otp WHERE email=$1`, [trimmedEmail]);
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }

    // bcrypt compare
    const ok = await bcrypt.compare(trimmedOtp, row.otp_hash);

    if (!ok) {
      await pool.query(
        `UPDATE password_reset_otp SET attempts = attempts + 1 WHERE email=$1`,
        [trimmedEmail]
      );
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP correct — (optional) keep it for reset step, or delete it now
    // If your next page resets password, keep it; otherwise delete it.
    return res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("OTP VERIFY ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});
