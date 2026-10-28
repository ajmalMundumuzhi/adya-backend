const express = require("express");
const controller = require("./settings.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/", controller.list);
router.get("/:key", controller.getByKey);
router.post("/", requireAdmin, controller.create);
router.put("/:key", requireAdmin, controller.update);
router.delete("/:key", requireAdmin, controller.remove);

module.exports = router;
