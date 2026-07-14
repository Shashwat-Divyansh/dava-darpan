import { createContext, useContext, useEffect, useState } from "react";

import api, { getToken, setToken } from "@/lib/api";

/**
 * AuthContext holds the logged-in user and the auth actions, so any component
 * can read the current user or call signup/login/logout without prop-drilling.
 *
 * The session token is a JWT stored in localStorage ("dd_token") and sent as an
 * Authorization: Bearer header (see lib/api.js) — cookies don't survive the
 * cross-domain deployment. Locally, an httpOnly cookie still works as fallback.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `loading` is true only while we check for an existing session on first load.
  // It prevents protected routes from redirecting before we know who the user is.
  const [loading, setLoading] = useState(true);

  // On mount, restore the session: the stored token (or local cookie) is
  // validated by /auth/me. A 401 means expired/invalid — discard the token.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        if (getToken()) setToken(null); // stale/expired token — clear it
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Each action updates `user` so the UI reacts immediately. They throw on
  // failure (axios rejects non-2xx) so the calling form can show the error.
  async function signup({ name, email, password }) {
    const { data } = await api.post("/auth/signup", { name, email, password });
    setToken(data.token); // store BEFORE any follow-up requests need the header
    setUser(data.user);
    return data.user;
  }

  async function login({ email, password }) {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    // The real logout is discarding the client-side token; the endpoint call
    // just clears any cookie session and is best-effort.
    setToken(null);
    setUser(null);
    try {
      await api.post("/auth/logout");
    } catch {
      /* already logged out locally */
    }
  }

  const value = { user, loading, signup, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook: const { user, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
