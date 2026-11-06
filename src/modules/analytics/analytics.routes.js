
const express = require("express");
const controller = require("./analytics.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.post("/track", controller.track);
router.get("/summary", requireAdmin, controller.summary);
router.get("/dashboard", requireAdmin, controller.dashboard);

module.exports = router;
