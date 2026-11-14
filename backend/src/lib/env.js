// backend/src/lib/env.js
// Loaded as the FIRST import of server.js.
//
// ESM evaluates every `import` before any module body runs, so calling
// dotenv.config() inside server.js happens AFTER controllers/middleware have
// already read process.env. Isolating the load into its own module and
// importing it first guarantees the variables exist for everyone else.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../../.env");

dotenv.config({ path: envPath });

// Fail fast on anything the app cannot run without.
const REQUIRED = ["MONGO_URI", "JWT_SECRET_KEY"];
const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
  if (!process.env.VERCEL) process.exit(1);
}

// Optional integrations - warn but keep running with the feature disabled.
const OPTIONAL = {
  "Stream chat/video": ["STREAM_API_KEY", "STREAM_API_SECRET"],
  Cloudinary: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  "AI mentor": ["GEMINI_API_KEY", "GROQ_API_KEY"],
};

for (const [feature, keys] of Object.entries(OPTIONAL)) {
  const absent = keys.filter((key) => !process.env[key]);
  if (absent.length === keys.length) {
    console.warn(`⚠️  ${feature} disabled - none of ${keys.join(", ")} are set`);
  } else if (absent.length) {
    console.warn(`⚠️  ${feature} partially configured - missing ${absent.join(", ")}`);
  }
}

if (!process.env.CLIENT_URL) {
  console.warn("⚠️  CLIENT_URL is not set - CORS will only allow localhost and *.vercel.app");
}

export const isProduction = process.env.NODE_ENV === "production";
export const envPathUsed = envPath;
