const express = require("express");
const controller = require("./users.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/me", controller.getMe);
router.patch("/me", controller.updateMe);
router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.patch("/:id/status", requireAdmin, controller.updateStatus);

module.exports = router;
