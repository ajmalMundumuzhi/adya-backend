
const express = require("express");
const controller = require("./payment.transactions.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);

module.exports = router;
