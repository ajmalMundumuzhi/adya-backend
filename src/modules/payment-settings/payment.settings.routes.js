
const express = require("express");
const controller = require("./payment.settings.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/public", controller.getPublicSettings);
router.get("/", requireAdmin, controller.getAdminSettings);
router.put("/", requireAdmin, controller.update);

module.exports = router;
