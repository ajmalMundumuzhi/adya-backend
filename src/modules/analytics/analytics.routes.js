const express = require("express");
const controller = require("./analytics.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.post("/track", controller.track);
router.get("/summary", requireAdmin, controller.summary);

module.exports = router;
