import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

/**
 * Wraps any route that requires a logged-in user.
 * - While the initial session check runs, show a lightweight loading state
 *   (so we don't redirect a logged-in user before /auth/me resolves).
 * - If there's no user once loading finishes, redirect to /login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
