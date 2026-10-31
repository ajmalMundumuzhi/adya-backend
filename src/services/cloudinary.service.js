const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "adya/products",
        resource_type: "image",
        transformation: [
          { quality: "auto", fetch_format: "auto" }
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

module.exports = { uploadImage };