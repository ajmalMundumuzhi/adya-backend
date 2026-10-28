const express = require("express");
const controller = require("./categories.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", requireAdmin, controller.create);
router.patch("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.deactivate);

module.exports = router;