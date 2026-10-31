
const express = require("express");
const controller = require("./products.controller");
const { requireAdmin } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

const router = express.Router();

router.get("/", controller.list);

router.post(
  "/upload-image",
  requireAdmin,
  upload.array("images", 10),
  controller.uploadProductImage
);

router.get("/:id", controller.getById);

router.post("/", requireAdmin, controller.create);

router.patch("/:id", requireAdmin, controller.update);

router.delete("/:id", requireAdmin, controller.deactivate);

module.exports = router;