
const express = require("express");
const controller = require("./wishlist.controller");
const { requireCustomer } = require("../../middleware/auth");

const router = express.Router();

router.use(requireCustomer);

router.get("/", controller.getWishlist);
router.post("/", controller.addToWishlist);
router.delete("/:id", controller.removeFromWishlist);

module.exports = router;
