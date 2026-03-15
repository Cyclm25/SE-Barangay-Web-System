const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/profile-pictures");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/* =========================
   POST /api/upload/profile-picture/:residentId
   Upload or update profile picture for existing resident
========================= */
router.post(
  "/profile-picture/:residentId",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { residentId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }

      const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;

      const result = await pool.query(
        `UPDATE resident SET "ProfileImage" = $1 WHERE "ResidentID" = $2 RETURNING *`,
        [imageUrl, residentId]
      );

      if (result.rowCount === 0) {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
        return res.status(404).json({ error: "Resident not found." });
      }

      return res.status(200).json({
        message: "Profile picture updated successfully.",
        imageUrl,
        resident: result.rows[0],
      });
    } catch (err) {
      console.error("UPLOAD ERROR:", err.message);
      if (req.file) {
        try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch {}
      }
      return res.status(500).json({ error: err.message });
    }
  }
);

/* =========================
   POST /api/upload/profile-picture-new
   Upload picture for a NEW resident before registration
   Returns imageUrl to include in registration payload
========================= */
router.post(
  "/profile-picture-new",
  upload.single("profileImage"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }
      const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;
      return res.status(200).json({ imageUrl });
    } catch (err) {
      console.error("UPLOAD NEW ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
