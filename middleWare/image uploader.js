// Configure Cloudinary
const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const streamifier = require("streamifier");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: "dzuwpvydm",
  api_key: "669714923474566",
  api_secret: "wTt4h4lidYWvHyH_qDPXDLrz-7E",
});

const uploadImageMiddleware = (req, res, next) => {
  if (!req.files || !req.files.poster) {
    return res.status(400).json({ message: "Poster file missing." });
  }

  const posterFile = req.files.poster[0];
  const stream = streamifier.createReadStream(posterFile.buffer);

  const cloudinaryUploadStream = cloudinary.uploader.upload_stream(
    { resource_type: "image", folder: "posters" },
    { timeout: 3600000 },
    (posterError, posterResult) => {
      if (posterError) {
        console.error("Cloudinary Poster Error:", posterError);
        return res
          .status(500)
          .json({ message: "Error uploading poster to Cloudinary." });
      }

      const posterData = {
        posterUrl: posterResult.secure_url,
      };

      req.posterData = posterData;
      next();
    }
  );

  stream.pipe(cloudinaryUploadStream);
};
module.exports = uploadImageMiddleware;
