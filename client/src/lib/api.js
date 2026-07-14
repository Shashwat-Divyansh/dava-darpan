import axios from "axios";

/** localStorage key for the auth JWT. */
const TOKEN_KEY = "dd_token";

/** Read/store/clear the auth token. Storing null clears it. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Shared axios instance for all API calls.
 * - In production, VITE_API_URL points at the deployed backend
 *   (e.g. https://dava-darpan-api.onrender.com/api).
 * - Locally it falls back to "/api", which the Vite dev proxy forwards to the
 *   Express server (see vite.config.js).
 * - Auth travels as "Authorization: Bearer <jwt>" (attached below) because the
 *   deployed frontend and API are on different domains, where browsers block
 *   third-party cookies. withCredentials stays on so local cookie sessions
 *   keep working as a fallback.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://dava-darpan-api.onrender.com/api",
  withCredentials: true,
});

// Attach the stored token to every request. (localStorage JWTs are readable by
// page JS — an accepted trade-off for a decoupled SPA of this scope.)
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
