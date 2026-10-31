const express = require("express");
const controller = require("./addresses.controller");
const { requireCustomer } = require("../../middleware/auth");

const router = express.Router();

router.use(requireCustomer);

router.get("/", controller.getAddresses);
router.post("/", controller.addAddress);
router.put("/:id", controller.updateAddress);
router.delete("/:id", controller.deleteAddress);
router.patch("/:id/default", controller.setDefaultAddress);

module.exports = router;