const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { validateParsedId, detectIdType, SUPPORTED_ID_TYPES } = require("../utils/idOcrValidation");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP ID images are allowed."));
    }
  },
});

function runPaddleOcr(imagePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../scripts/paddle_ocr_scan.py");
    const pythonCommand = process.env.PADDLE_OCR_PYTHON || "py";
    const pythonArgs = process.env.PADDLE_OCR_PYTHON
      ? [scriptPath, imagePath]
      : ["-3.12", scriptPath, imagePath];
    const child = spawn(pythonCommand, pythonArgs, {
      windowsHide: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `PaddleOCR process exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Invalid PaddleOCR response: ${stdout || err.message}`));
      }
    });
  });
}

router.get("/supported-types", (_req, res) => {
  return res.json({
    supportedTypes: Object.entries(SUPPORTED_ID_TYPES).map(([idType, rule]) => ({
      idType,
      label: rule.label,
      expiryPolicy: rule.expiryPolicy,
    })),
  });
});

router.post("/validate-text", (req, res) => {
  const { text, parsed } = req.body || {};
  const idType = parsed?.idType || detectIdType(text);
  const result = validateParsedId({ ...(parsed || {}), idType }, text);

  return res.status(result.ok ? 200 : 400).json(result);
});

router.post("/scan-image", upload.single("idImage"), async (req, res) => {
  let tempPath = "";
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No ID image provided." });
    }

    const extension = path.extname(req.file.originalname || "") || ".jpg";
    tempPath = path.join(os.tmpdir(), `barangay-id-ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    fs.writeFileSync(tempPath, req.file.buffer);

    const result = await runPaddleOcr(tempPath);
    const text = String(result.text || "").trim();

    if (!text) {
      return res.status(422).json({ error: "ID image is unreadable" });
    }

    return res.json({
      text,
      lines: result.lines || [],
      engine: "paddleocr",
    });
  } catch (err) {
    const message = String(err.message || err);
    const setupHint = message.includes("PaddleOCR is not installed") || message.includes("No module named")
      ? "PaddleOCR is not installed on the backend. Install Python dependencies from admin/requirements-ocr.txt."
      : message;
    return res.status(500).json({ error: setupHint });
  } finally {
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
});

module.exports = router;
