function normalizePosition(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = function requireNonSkWriteAccess(req, res, next) {
  const userType = String(req.user?.type || "").trim().toLowerCase();
  const position = normalizePosition(req.user?.position);

  if (userType === "barangayadmin" && position === "sk kagawad") {
    return res.status(403).json({
      error: "SK Kagawad accounts are view-only and cannot modify records.",
    });
  }

  next();
};
