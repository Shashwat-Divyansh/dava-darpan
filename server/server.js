import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { connectDB } from "./config/db.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import medicineRoutes from "./routes/medicines.js";
import favoriteRoutes from "./routes/favorites.js";
import kendraRoutes from "./routes/kendras.js";

// Load environment variables from server/.env in development only. In production
// (Render), env vars come from the dashboard, not a file. override: true makes
// .env the source of truth locally, so a PORT a dev tool may inject can't override
// our configured 5001. dotenv.config() is a no-op (no throw) if the file is absent.
const __dirname = dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: join(__dirname, ".env"), override: true });
}

const app = express();

// Render (and most hosts) run the app behind a reverse proxy. Trusting the first
// proxy lets Express see the original HTTPS protocol, which "secure" cookies need.
app.set("trust proxy", 1);

// Port 5001 by default: on macOS, port 5000 is taken by the AirPlay Receiver.
// In production, Render injects its own PORT.
const PORT = process.env.PORT || 5001;

// The deployed frontend origin. Configurable so the same code works in prod
// (Vercel URL) and locally (Vite dev server). Must be a specific origin — not a
// wildcard — because credentialed (cookie) requests forbid "*".
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ----- Global middleware -----
// credentials: true + an explicit origin lets the browser send/receive the
// httpOnly auth cookie when the client calls the API cross-origin.
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());    // parse incoming JSON request bodies
app.use(cookieParser());    // parse the "token" cookie into req.cookies

// ----- Routes -----
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/kendras", kendraRoutes);

// Root route so hitting the base URL in a browser shows something friendly
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Dava Darpan API. Try GET /api/health" });
});

// ----- 404 handler for unknown routes -----
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// ----- Central error handler -----
// Any error passed to next(err) lands here and returns a clean JSON response.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ----- Start the server -----
// We start listening right away and connect to MongoDB in parallel, so the API
// is responsive immediately and a slow/missing database never blocks startup.
function start() {
  connectDB(); // logs its own success/failure; intentionally not awaited
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start();
