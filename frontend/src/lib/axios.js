// frontend/src/lib/axios.js
import axios from "axios";
import { getToken, clearToken } from "./authToken";

// ✅ Use environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Send the bearer token as well as the cookie: browsers that block
// third-party cookies drop the cookie on cross-site API calls.
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // A rejected token is stale - drop it so the next request is a clean
    // unauthenticated one rather than a repeated 401.
    if (error.response?.status === 401) {
      clearToken();
    }
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);
