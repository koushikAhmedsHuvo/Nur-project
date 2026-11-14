// backend/src/middleware/upload.js
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============ PROFILE PICTURE STORAGE ============
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile-pictures",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// ============ CHAT FILE STORAGE ============
// `allowed_formats` alongside `resource_type: "auto"` made Cloudinary reject
// every non-image ("An unknown file format not allowed"), so .txt/.zip/.docx
// uploads failed. The fileFilter below is what gates types; here we only pick
// the right resource_type per file.
const resourceTypeFor = (file) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "raw";
};

const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: "chat-files",
    resource_type: resourceTypeFor(file),
  }),
});

// ============ FILE FILTERS ============
// Matching only against the mimetype rejected valid files whose mimetype does
// not spell out the extension (.doc is "application/msword", .txt is
// "text/plain"), so the extension is checked as well.
const makeFilter = (extensions, mimePrefixes, message) => (req, file, cb) => {
  const ext = path.extname(file.originalname || "").slice(1).toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  const okByExt = extensions.includes(ext);
  const okByMime = mimePrefixes.some((prefix) => mime.startsWith(prefix));

  if (okByExt || okByMime) return cb(null, true);
  cb(new Error(message));
};

// Profile picture filter (images only)
const profileFilter = makeFilter(
  ["jpg", "jpeg", "png", "webp"],
  ["image/jpeg", "image/png", "image/webp"],
  "Only image files are allowed for profile pictures"
);

// Chat file filter (images, documents, etc.)
const chatFileFilter = makeFilter(
  ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "txt", "mp4", "mp3", "zip", "rar"],
  [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "video/mp4",
    "audio/mpeg",
    "application/zip",
    "application/x-rar",
  ],
  "File type not supported. Please upload images, PDFs, or documents."
);

// ============ EXPORT UPLOAD MIDDLEWARES ============

// For profile pictures (single file)
export const upload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: profileFilter,
});

// For chat files (single file - images, PDFs, docs)
export const uploadChatFile = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: chatFileFilter,
});

// For multiple chat files (max 5 files)
export const uploadMultipleChatFiles = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: chatFileFilter,
}).array("files", 5);

// For profile pictures (kept for backward compatibility)
export const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: profileFilter,
});