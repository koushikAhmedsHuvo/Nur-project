# Nur Project

## Deploy to Vercel

Deploy this repository as two Vercel projects:

1. **Backend:** import the repository, set **Root Directory** to `backend`, and deploy. Its `vercel.json` installs from the lockfile and routes requests to the Express app.
2. **Frontend:** import the repository again as a second Vercel project, set **Root Directory** to `frontend`, and deploy.

After both projects have a domain, set the following Vercel environment variables and redeploy.

### Backend project

- `MONGO_URI` — MongoDB connection string. Allow Vercel to connect in the database network settings.
- `JWT_SECRET_KEY` — a long, random secret.
- `CLIENT_URL` — the frontend's production origin, without a trailing slash (for example, `https://your-frontend.vercel.app`).
- `NODE_ENV` — `production`.
- Add integration variables only when used: `STREAM_API_KEY`, `STREAM_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, and `GROQ_API_KEY`.

### Frontend project

- `VITE_API_URL` — the backend URL ending in `/api` (for example, `https://your-backend.vercel.app/api`).
- `VITE_STREAM_API_KEY` — Stream's public API key, if Stream features are used. Never put the Stream API secret in a `VITE_` variable.
- `VITE_SOCKET_URL` — optional URL for a persistent Socket.IO server. Vercel serverless functions do not support Socket.IO connections; deploy the socket server to a persistent Node.js host if real-time calling features are needed.

Local environment files are ignored by Git. Use `backend/.env.example` and `frontend/.env.example` as references; do not commit real credentials.
