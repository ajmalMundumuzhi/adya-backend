const service = require("./auth.service");
const { loginSchema } = require("./auth.validation");

async function login(req, res) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await service.login(email, password);

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email and password"
      });
    }

    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Internal server error"
    });
  }
}

module.exports = { login };
