const express = require("express");
const controller = require("./inventory.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAdmin);

router.patch(
  "/:variantId/:sizeOptionId/adjust",
  controller.adjustStock
);

router.get("/history", controller.getHistory);

module.exports = router;