import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import App from "./App.jsx";
import "./index.css";

// AuthProvider lives inside BrowserRouter so auth actions can use router hooks.
// FavoritesProvider sits inside AuthProvider because it loads the logged-in
// user's basket. App is wrapped by both so any component can use the contexts.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <App />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
