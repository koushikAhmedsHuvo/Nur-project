// backend/src/server.js

// Must be the first import: it loads .env before any other module reads
// process.env (ESM evaluates all imports before any module body runs).
import "./lib/env.js";

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

import { connectDB } from "./lib/db.js";
import { initializeSocket } from "./socket.js";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import groupRoutes from "./routes/group.route.js";
import searchRoutes from "./routes/search.route.js";
import aiRoutes from "./routes/ai.route.js";

const app = express();
const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
initializeSocket(server);

// Ensure DB connection for every request in serverless environment
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database middleware connection error:", err);
    next(err);
  }
});

// ============ CORS ============
const extraOrigins = (process.env.EXTRA_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL,
  "https://finalprojectfrontend-flax.vercel.app",
  "https://kyauchatbox.vercel.app",
  ...extraOrigins,
  /^https:\/\/[\w-]+\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
].filter(Boolean);

const isOriginAllowed = (origin) =>
  allowedOrigins.some((pattern) =>
    typeof pattern === "string" ? pattern === origin : pattern.test(origin)
  );

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and non-browser clients send no Origin header.
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin)) return callback(null, true);

      // Previously this logged "blocked" and then allowed the request anyway,
      // which meant any site could call the API with the user's cookies.
      console.warn("❌ CORS blocked origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cloudinary: {
      configured: !!process.env.CLOUDINARY_API_KEY,
    },
  });
});

// Unknown API routes should answer JSON, not Express' HTML error page.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  // Multer rejections (bad type, too large) are client errors, not 500s.
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large"
        : err.code === "LIMIT_FILE_COUNT"
        ? "Too many files"
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? `Unexpected field "${err.field}"`
        : err.message;
    console.warn("⚠️ Upload rejected:", err.code, message);
    return res.status(400).json({ success: false, message });
  }

  // fileFilter rejections arrive as plain Errors.
  if (err?.message?.includes("Only image files") || err?.message?.includes("File type not supported")) {
    console.warn("⚠️ Upload rejected:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  console.error("❌ Error:", message);
  res.status(statusCode).json({ success: false, message });
});

if (!process.env.VERCEL) {
  connectDB().then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  });
}

export default app;
