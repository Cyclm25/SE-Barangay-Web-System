const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const verifyToken = require("../middleware/verifyToken");
const requireNonSkWriteAccess = require("../middleware/requireNonSkWriteAccess");

/* ─────────────────────────────────────────────────────────────
   PROFILE PICTURES
───────────────────────────────────────────────────────────── */
const profileUploadDir = path.join(__dirname, "../uploads/profile-pictures");
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

/* ─────────────────────────────────────────────────────────────
   ANNOUNCEMENT IMAGES
───────────────────────────────────────────────────────────── */
const announcementUploadDir = path.join(__dirname, "../uploads/announcements");
if (!fs.existsSync(announcementUploadDir)) {
  fs.mkdirSync(announcementUploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

function makeFilename(originalname) {
  const ext = path.extname(originalname);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

// Profile picture storage
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => cb(null, makeFilename(file.originalname)),
});

// Announcement image storage
const announcementStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, announcementUploadDir),
  filename: (req, file, cb) => cb(null, makeFilename(file.originalname)),
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadAnnouncement = multer({
  storage: announcementStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
});

/* =========================
   POST /api/upload/profile-picture/:residentId
========================= */
router.post(
  "/profile-picture/:residentId",
  verifyToken,
  requireNonSkWriteAccess,
  uploadProfile.single("profileImage"),
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
        fs.unlinkSync(path.join(profileUploadDir, req.file.filename));
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
        try { fs.unlinkSync(path.join(profileUploadDir, req.file.filename)); } catch {}
      }
      return res.status(500).json({ error: err.message });
    }
  }
);

/* =========================
   POST /api/upload/profile-picture-new
========================= */
router.post(
  "/profile-picture-new",
  verifyToken,
  requireNonSkWriteAccess,
  uploadProfile.single("profileImage"),
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

/* =========================
   POST /api/upload/announcement-image
   Upload a single announcement image.
   Returns { imageUrl } — the URL to store in the Images array.
   Accepts field name: "image"
   Max: 5MB, JPEG/PNG/WebP only
========================= */
router.post("/announcement-image", verifyToken, (req, res) => {
  uploadAnnouncement.single("image")(req, res, (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Image must be 5MB or smaller." });
        }
        return res.status(400).json({ error: err.message });
      }

      if (err) {
        return res.status(400).json({
          error: err.message || "Only JPG, PNG, and WebP images are allowed.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }

      const imageUrl = `/uploads/announcements/${req.file.filename}`;
      return res.status(200).json({ imageUrl });
    } catch (uploadErr) {
      console.error("ANNOUNCEMENT UPLOAD ERROR:", uploadErr.message);
      if (req.file) {
        try {
          fs.unlinkSync(path.join(announcementUploadDir, req.file.filename));
        } catch {}
      }
      return res.status(500).json({ error: uploadErr.message });
    }
  });
});

module.exports = router;
