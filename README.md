# Nur Project

## Deploy

Deploy the backend to Render and the frontend to Vercel. Render runs a persistent Node.js server for both the API and Socket.IO.

### Backend on Render

Create a new Render Blueprint from this repository; Render reads the root `render.yaml`. The service uses `backend` as its root directory, runs `npm ci` and `npm start`, and checks `/health`.

Set the prompted secret environment variables in Render:

- `MONGO_URI` — MongoDB connection string. Allow Render to connect in the database network settings.
- `JWT_SECRET_KEY` — a long, random secret.
- `CLIENT_URL` — the frontend's production origin, without a trailing slash.
- Add integration variables only when used: `STREAM_API_KEY`, `STREAM_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, and `GROQ_API_KEY`.

### Frontend on Vercel

Import the same repository as a Vercel project and set **Root Directory** to `frontend`. Once the Render service is deployed, set:

- `VITE_API_URL` — the Render service URL ending in `/api` (for example, `https://your-service.onrender.com/api`).
- `VITE_SOCKET_URL` — the Render service URL (for example, `https://your-service.onrender.com`).
- `VITE_STREAM_API_KEY` — Stream's public API key, if Stream features are used. Never put the Stream API secret in a `VITE_` variable.

After the Vercel frontend deploys, update the Render `CLIENT_URL` to its production origin and redeploy the backend. Local environment files are ignored by Git. Use `backend/.env.example` and `frontend/.env.example` as references; never commit real credentials.
