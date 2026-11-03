
const express = require("express");
const controller = require("./banner.controller");
const { requireAdmin } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

const router = express.Router();

router.get("/", controller.list);

router.get("/admin", requireAdmin, (req, res, next) => {
  req.query.includeInactive = "true";
  next();
}, controller.list);

router.post(
  "/upload-image",
  requireAdmin,
  upload.array("images", 2),
  controller.uploadBannerImages
);

router.get("/:id", requireAdmin, controller.getById);

router.post("/", requireAdmin, controller.create);

router.patch("/:id", requireAdmin, controller.update);

router.delete("/:id", requireAdmin, controller.deactivate);

module.exports = router;