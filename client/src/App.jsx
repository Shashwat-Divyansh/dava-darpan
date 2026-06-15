import { Routes, Route } from "react-router-dom";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Compare from "@/pages/Compare";
import Favorites from "@/pages/Favorites";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * App routes.
 * - "/login" and "/signup" are public.
 * - "/" is wrapped in <ProtectedRoute>, so unauthenticated users are redirected
 *   to /login.
 */
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare/:brandId"
        element={
          <ProtectedRoute>
            <Compare />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
