import { Router } from "express";
import mongoose from "mongoose";

import Favorite from "../models/Favorite.js";
import Brand from "../models/Brand.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { buildBrandComparison } from "../services/comparison.js";

const router = Router();

// Every favorites route requires a logged-in user.
router.use(requireAuth);

/**
 * GET /api/favorites
 * Returns the user's favorites, each enriched with full comparison data so the
 * basket can render rows and compute totals without extra requests.
 */
router.get("/", async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .sort({ createdAt: 1 })
      .populate("brand")
      .lean();

    // A favorite could be orphaned if its brand was removed — filter those out.
    const items = await Promise.all(
      favorites
        .filter((f) => f.brand)
        .map(async (f) => ({
          favoritedAt: f.createdAt,
          ...(await buildBrandComparison(f.brand)),
        }))
    );

    res.json({ favorites: items });
  } catch (err) {
    console.error("favorites list error:", err);
    res.status(500).json({ error: "Failed to load favorites" });
  }
});

/**
 * POST /api/favorites   body: { brandId }
 * Adds a brand to the user's basket. 409 if already present.
 */
router.post("/", async (req, res) => {
  try {
    const { brandId } = req.body || {};
    if (!mongoose.isValidObjectId(brandId)) {
      return res.status(400).json({ error: "Invalid brand id" });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) return res.status(404).json({ error: "Brand not found" });

    try {
      await Favorite.create({ user: req.user.id, brand: brandId });
    } catch (err) {
      // Duplicate key => already favorited.
      if (err.code === 11000) {
        return res.status(409).json({ error: "Already in your basket" });
      }
      throw err;
    }

    return res.status(201).json(await buildBrandComparison(brand));
  } catch (err) {
    console.error("favorite add error:", err);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

/**
 * DELETE /api/favorites/:brandId
 * Removes a brand from the user's basket.
 */
router.delete("/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!mongoose.isValidObjectId(brandId)) {
      return res.status(400).json({ error: "Invalid brand id" });
    }

    await Favorite.deleteOne({ user: req.user.id, brand: brandId });
    return res.status(200).json({ message: "Removed from basket" });
  } catch (err) {
    console.error("favorite remove error:", err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
