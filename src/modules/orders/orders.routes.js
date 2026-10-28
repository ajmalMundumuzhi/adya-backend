const express = require("express");
const controller = require("./orders.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.post("/", controller.create);
router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.patch("/:id", requireAdmin, controller.update);

module.exports = router;
