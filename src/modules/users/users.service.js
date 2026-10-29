const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repository = require("./users.repository");

function makeError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw makeError("Authentication configuration error", 500);
  }

  return jwt.sign(
    { id: user._id.toString(), role: "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt
  };
}

async function register(data) {
  const existing = await repository.findByEmail(data.email);

  if (existing) {
    throw makeError("Email already registered", 409);
  }

  const password = await bcrypt.hash(data.password, 12);
  const user = await repository.create({
    name: data.name,
    email: data.email,
    password
  });

  return {
    token: createToken(user),
    user: safeUser(user)
  };
}

async function login(email, password) {
  const user = await repository.findByEmail(email);

  if (!user || !user.isActive) {
    throw makeError("Invalid email or password", 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw makeError("Invalid email or password", 401);
  }

  return {
    token: createToken(user),
    user: safeUser(user)
  };
}

async function listUsers() {
  return repository.findAll();
}

async function getUser(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid user ID", 400);
  }

  const user = await repository.findById(id);
  if (!user) throw makeError("User not found", 404);
  return user;
}

async function updateProfile(id, data) {
  const user = await getUser(id);

  if (data.email && data.email !== user.email) {
    const existing = await repository.findByEmail(data.email);
    if (existing) throw makeError("Email already registered", 409);
  }

  const updated = await repository.update(id, data);
  if (!updated) throw makeError("User not found", 404);
  return updated;
}

async function updateStatus(id, isActive) {
  await getUser(id);
  const updated = await repository.update(id, { isActive });
  if (!updated) throw makeError("User not found", 404);
  return updated;
}

module.exports = {
  register,
  login,
  listUsers,
  getUser,
  updateProfile,
  updateStatus
};
