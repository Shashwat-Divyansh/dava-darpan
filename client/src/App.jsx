import { Routes, Route } from "react-router-dom";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Compare from "@/pages/Compare";
import Favorites from "@/pages/Favorites";
import Kendras from "@/pages/Kendras";
import ProtectedRoute from "@/components/ProtectedRoute";

/**
 * App routes.
 * - Public (guests welcome): "/" (search), "/compare/:brandId", "/kendras",
 *   plus "/login" and "/signup".
 * - Protected: "/favorites" (basket) — saving requires an account, so guests
 *   are redirected to login.
 */
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/compare/:brandId" element={<Compare />} />
      <Route path="/kendras" element={<Kendras />} />
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
