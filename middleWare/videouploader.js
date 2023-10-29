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

const uploadVideoMiddleware = (req, res, next) => {
  if (!req.files || !req.files.video) {
    return res.status(400).json({ message: "Video file missing." });
  }

  const videoFile = req.files.video[0];
  const stream = streamifier.createReadStream(videoFile.buffer);

  const cloudinaryUploadStream = cloudinary.uploader.upload_stream(
    { resource_type: "video", folder: "uploads" },
    { timeout: 3600000 },
    (videoError, videoResult) => {
      if (videoError) {
        console.error("Cloudinary Video Error:", videoError);
        return res
          .status(500)
          .json({ message: "Error uploading video to Cloudinary." });
      }

      const videoData = {
        title: req.body.title,
        description: req.body.description,
        videoUrl: videoResult.secure_url,
        grade: req.body.grade,
      };

      req.videoData = videoData;
      next();
    }
  );

  stream.pipe(cloudinaryUploadStream);
};
module.exports = uploadVideoMiddleware;
