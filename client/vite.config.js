import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 is wired in as a Vite plugin (no separate config file needed)
  ],
  resolve: {
    alias: {
      // Lets us import with "@/..." e.g. import { Button } from "@/components/ui/button"
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to the Express backend during development so the frontend
    // can call "/api/..." without worrying about CORS or the backend's port.
    proxy: {
      "/api": "http://localhost:5001",
    },
  },
});
