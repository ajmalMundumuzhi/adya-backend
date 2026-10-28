const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAdmin };
