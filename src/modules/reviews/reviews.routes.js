const express = require("express");
const multer = require("multer");

const controller = require("./reviews.controller");

const {
  requireAdmin,
  requireCustomer
} = require("../../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(
        new Error("Only image files are allowed")
      );
    }

    callback(null, true);
  }
});

function uploadReviewImages(req, res, next) {
  upload.array("images", 5)(req, res, error => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each review image must be 5 MB or smaller"
          : error.code === "LIMIT_FILE_COUNT"
            ? "You can upload a maximum of 5 images"
            : error.code === "LIMIT_UNEXPECTED_FILE"
              ? "Use the images field to upload review photos"
              : error.message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed"
    });
  });
}

router.get("/", controller.list);

router.get("/admin", requireAdmin, controller.adminList);

router.get(
  "/admin/:id",
  requireAdmin,
  controller.adminGetById
);

router.patch(
  "/admin/:id",
  requireAdmin,
  controller.update
);

router.delete(
  "/admin/:id",
  requireAdmin,
  controller.remove
);

router.get("/mine", requireCustomer, controller.getMyReviews);

router.get("/:id", controller.getById);

router.post(
  "/",
  requireCustomer,
  uploadReviewImages,
  controller.create
);

module.exports = router;