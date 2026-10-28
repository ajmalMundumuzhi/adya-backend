const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repository = require("./auth.repository");

async function login(email, password) {
  const admin = await repository.findByEmail(email);

  if (!admin || !admin.isActive) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const validPassword = await bcrypt.compare(password, admin.password);

  if (!validPassword) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const token = jwt.sign(
    { id: admin._id.toString(), role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email
    }
  };
}

module.exports = { login };
