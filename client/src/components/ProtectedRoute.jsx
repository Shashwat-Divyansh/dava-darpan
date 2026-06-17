import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

/**
 * Wraps any route that requires a logged-in user.
 * - While the initial session check runs, show a lightweight loading state
 *   (so we don't redirect a logged-in user before /auth/me resolves).
 * - If there's no user once loading finishes, redirect to /login, preserving the
 *   attempted path as ?redirect= so login can send them back here afterwards.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}
