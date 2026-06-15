import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import App from "./App.jsx";
import "./index.css";

// AuthProvider lives inside BrowserRouter so auth actions can use router hooks,
// and wraps App so every route/component can read the current user via useAuth().
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
