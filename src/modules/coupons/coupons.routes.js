const express = require("express");
const controller = require("./coupons.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.post("/validate", controller.validate);
router.get("/", controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.post("/", requireAdmin, controller.create);
router.patch("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.remove);

module.exports = router;
