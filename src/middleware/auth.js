
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function readToken(req, res) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required"
    });
    return null;
  }

  try {
    return jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET
    );
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
    return null;
  }
}

function requireAdmin(req, res, next) {
  const decoded = readToken(req, res);

  if (!decoded) return;

  if (decoded.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }

  req.admin = decoded;
  return next();
}

async function authenticateCustomer(req, res) {
  const decoded = readToken(req, res);

  if (!decoded) return false;

  if (decoded.role !== "customer") {
    res.status(403).json({
      success: false,
      message: "Customer access required"
    });
    return false;
  }

  try {
    const user = await User.findById(decoded.id)
      .select("_id isActive");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Customer account is unavailable"
      });
      return false;
    }

    req.user = {
      id: user._id.toString(),
      role: "customer"
    };

    return true;
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
    return false;
  }
}

async function requireCustomer(req, res, next) {
  const authenticated = await authenticateCustomer(req, res);

  if (!authenticated) return;

  return next();
}

async function optionalCustomer(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return next();
  }

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization header"
    });
  }

  const authenticated = await authenticateCustomer(req, res);

  if (!authenticated) return;

  return next();
}

module.exports = {
  requireAdmin,
  requireCustomer,
  optionalCustomer
};
