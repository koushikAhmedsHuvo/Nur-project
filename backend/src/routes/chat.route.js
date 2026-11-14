
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getStreamToken, uploadFile, uploadMultipleFiles } from '../controller/chat.controller.js';
import { uploadChatFile, uploadMultipleChatFiles } from '../middleware/upload.js';

const router = express.Router();

// Get Stream token for video calls
router.get("/token", protectRoute, getStreamToken);

// Upload single file (images, PDFs, documents)
router.post("/upload", protectRoute, uploadChatFile.single("file"), uploadFile);

// Upload multiple files (max 5)
router.post("/upload-multiple", protectRoute, uploadMultipleChatFiles, uploadMultipleFiles);

export default router;