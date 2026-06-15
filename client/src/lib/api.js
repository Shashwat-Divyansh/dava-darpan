import axios from "axios";

/**
 * Shared axios instance for all API calls.
 * - baseURL "/api" is proxied to the Express server by Vite (see vite.config.js).
 * - withCredentials: true makes the browser send & store the httpOnly auth cookie.
 */
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default api;
