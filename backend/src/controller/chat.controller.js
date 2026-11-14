// backend/src/controller/chat.controller.js
import { generateStreamToken } from "../lib/stream.js";

export const getStreamToken = async (req, res) => {
  try {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Stream is not configured on the server",
      });
    }

    const token = generateStreamToken(req.user._id);

    res.status(200).json({
      token,
      success: true,
      message: "Token generated successfully",
    });
  } catch (error) {
    console.error("❌ Error in getStreamToken:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate stream token",
    });
  }
};

// ============ FILE UPLOAD CONTROLLERS ============

// Upload single file (images, PDFs, documents)
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("📤 File uploaded:", req.file.originalname);

    const fileData = {
      url: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      publicId: req.file.filename,
    };

    res.status(200).json({
      success: true,
      file: fileData,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
};

// Upload multiple files (max 5)
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    console.log(`📤 ${req.files.length} files uploaded`);

    const filesData = req.files.map((file) => ({
      url: file.path,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      publicId: file.filename,
    }));

    res.status(200).json({
      success: true,
      files: filesData,
      message: "Files uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "Failed to upload files" });
  }
};