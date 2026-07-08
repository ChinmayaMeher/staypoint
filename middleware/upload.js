const multer = require("multer");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for listing images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "staypoint/listings",
    allowed_formats: ["jpeg", "jpg", "png", "gif", "webp"],
  },
});

// Multer configuration for listing images
const uploadListingImages = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5, // Maximum 5 files per request
  },
});

// Storage configuration for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "staypoint/avatars",
      allowed_formats: ["jpeg", "jpg", "png", "gif", "webp"],
      public_id: req.user ? `${req.user._id}-${Date.now()}` : undefined
    };
  },
});

// Multer configuration for user avatars
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
    files: 1,
  },
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      req.flash("error", "File size too large. Maximum size is 5MB.");
    } else if (err.code === "LIMIT_FILE_COUNT") {
      req.flash("error", "Too many files. Maximum 5 images allowed.");
    } else {
      req.flash("error", err.message);
    }
    return res.redirect("back");
  } else if (err) {
    req.flash("error", err.message);
    return res.redirect("back");
  }
  next();
};

module.exports = {
  uploadListingImages,
  uploadAvatar,
  handleMulterError,
};