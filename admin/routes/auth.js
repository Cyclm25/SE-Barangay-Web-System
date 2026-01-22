const router = require("express").Router();
const pool = require("../db");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await pool.query("SELECT * FROM ResidentAccount WHERE Username = $1", [username]);

        if (user.rows.length === 0 || user.rows[0].password !== password) {
            return res.status(401).json("Invalid Username or Password");
        }

        res.json({ message: "Login Successful", user: user.rows[0] });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { username } = req.body; 

        const userCheck = await pool.query(
            "SELECT * FROM ResidentAccount WHERE Username = $1", 
            [username]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json("Account not found");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: username, 
            subject: "Barangay 160 - Reset OTP",
            text: `Your OTP code is: ${otp}. This will expire in 2 minutes.`
        });

        const maskedEmail = username.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c);
        res.json({ otp, maskedEmail }); 
    } catch (err) {
        res.status(500).send("Error sending OTP");
    }
});
router.put("/reset-password", async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const updatePassword = await pool.query(
            "UPDATE ResidentAccount SET Password = $1 WHERE Username = $2",
            [newPassword, username]
        );

        if (updatePassword.rowCount === 0) {
            return res.status(404).json("User not found");
        }

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).send("Server Error while resetting password");
    }
});

module.exports = router;