const express = require("express");
const controller = require("./users.controller");
const { requireAdmin, requireCustomer } = require("../../middleware/auth");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);

router.get("/me", requireCustomer, controller.getMe);
router.patch("/me", requireCustomer, controller.updateMe);

router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.patch("/:id/status", requireAdmin, controller.updateStatus);

module.exports = router;
