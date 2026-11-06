const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

function uploadImage(buffer) {
  return uploadToCloudinary(buffer, {
    folder: "adya/products",
    resource_type: "image",
    transformation: [
      { quality: "auto", fetch_format: "auto" }
    ]
  });
}

function uploadReviewImage(buffer) {
  return uploadToCloudinary(buffer, {
    folder: "adya/reviews",
    resource_type: "image",
    transformation: [
      { quality: "auto", fetch_format: "auto" }
    ]
  });
}

function deleteReviewImage(publicId) {
  return deleteFromCloudinary(publicId);
}

function uploadSiteImage(buffer, assetType) {
  return uploadToCloudinary(buffer, {
    folder: "adya/site-settings",
    public_id: assetType,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    transformation: [
      { quality: "auto", fetch_format: "auto" }
    ]
  });
}

module.exports = {
  uploadImage,
  uploadReviewImage,
  deleteReviewImage,
  uploadSiteImage
};