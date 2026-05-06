const jwt = require("jsonwebtoken");

module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim().replace(/^"|"$/g, "")
    : null;

  if (!token) return res.status(401).json({ error: "Missing token" });
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET missing in env" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("verifyToken failed:", err?.name, err?.message);
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};
