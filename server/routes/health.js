import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/health
 *
 * Simple health-check endpoint. Confirms the API is up and reports whether the
 * MongoDB connection is currently ready (readyState 1 === connected).
 * Useful for verifying the skeleton works before we build any real features.
 */
router.get("/", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: "ok",
    message: "Dava Darpan API is running",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
