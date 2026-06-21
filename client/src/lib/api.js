import axios from "axios";

/**
 * Shared axios instance for all API calls.
 * - In production, VITE_API_URL points at the deployed backend
 *   (e.g. https://dava-darpan-api.onrender.com/api).
 * - Locally it falls back to "/api", which the Vite dev proxy forwards to the
 *   Express server (see vite.config.js).
 * - withCredentials: true makes the browser send & store the httpOnly auth cookie.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://dava-darpan-api.onrender.com/api",
  withCredentials: true,
});

export default api;
