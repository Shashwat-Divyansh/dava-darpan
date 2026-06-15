import { createContext, useContext, useEffect, useState } from "react";

import api from "@/lib/api";

/**
 * AuthContext holds the logged-in user and the auth actions, so any component
 * can read the current user or call signup/login/logout without prop-drilling.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `loading` is true only while we check for an existing session on first load.
  // It prevents protected routes from redirecting before we know who the user is.
  const [loading, setLoading] = useState(true);

  // On mount, ask the server whether the cookie corresponds to a valid session.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        // A 401 here just means "not logged in" — not an error worth surfacing.
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
    setUser(data.user);
    return data.user;
  }

  async function login({ email, password }) {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
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
