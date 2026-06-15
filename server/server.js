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

// Load environment variables from server/.env, resolved relative to THIS file so
// it works no matter which directory the server is started from.
// override: true makes .env the source of truth for local dev, so a PORT that a
// dev tool may inject into the environment can't override our configured 5001.
// (In production there is no .env file, so real environment variables still win.)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env"), override: true });

const app = express();
// Port 5001 by default: on macOS, port 5000 is taken by the AirPlay Receiver.
const PORT = process.env.PORT || 5001;

// ----- Global middleware -----
// credentials: true + an explicit origin lets the browser send/receive the
// httpOnly auth cookie when the client calls the API directly (cross-port).
app.use(
  cors({
    origin: "http://localhost:5173",
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
