import { Router } from "express";
import mongoose from "mongoose";

import Favorite from "../models/Favorite.js";
import Brand from "../models/Brand.js";
import Medicine from "../models/Medicine.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { buildBrandComparison, buildGenericComparison } from "../services/comparison.js";

const router = Router();

// Every favorites route requires a logged-in user.
router.use(requireAuth);

/** Shape one favorite document into a basket row (or null if unresolvable). */
async function toRow(fav) {
  const kind = fav.kind || "brand"; // docs created before "kind" existed are brand rows
  if (kind === "generic") {
    const cmp = await buildGenericComparison(fav.compositionKey);
    if (!cmp) return null;
    return { favoriteId: fav._id, kind: "generic", favoritedAt: fav.createdAt, ...cmp };
  }
  if (!fav.brand) return null; // orphaned (brand removed)
  return {
    favoriteId: fav._id,
    kind: "brand",
    favoritedAt: fav.createdAt,
    ...(await buildBrandComparison(fav.brand)),
  };
}

/**
 * GET /api/favorites
 * Returns the user's basket rows (both kinds), each enriched with the pricing
 * data the basket needs to render and total without extra requests.
 */
router.get("/", async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .sort({ createdAt: 1 })
      .populate("brand")
      .lean();

    const rows = (await Promise.all(favorites.map(toRow))).filter(Boolean);
    res.json({ favorites: rows });
  } catch (err) {
    console.error("favorites list error:", err);
    res.status(500).json({ error: "Failed to load favorites" });
  }
});

/**
 * POST /api/favorites
 * Body: { brandId } to save a specific brand, OR { compositionKey } to save
 * the Jan Aushadhi generic for a composition. 409 if already in the basket.
 */
router.post("/", async (req, res) => {
  try {
    const { brandId, compositionKey } = req.body || {};

    // ---- Save the Jan Aushadhi generic for a composition ----
    if (compositionKey) {
      const key = String(compositionKey).trim();
      const genericExists = await Medicine.exists({ compositionKey: key });
      if (!genericExists) {
        return res.status(404).json({ error: "No Jan Aushadhi generic listed for this composition" });
      }
      try {
        const fav = await Favorite.create({ user: req.user.id, kind: "generic", compositionKey: key });
        return res.status(201).json(await toRow(fav));
      } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: "Already in your basket" });
        throw err;
      }
    }

    // ---- Save a specific brand ----
    if (!mongoose.isValidObjectId(brandId)) {
      return res.status(400).json({ error: "Provide a brandId or a compositionKey" });
    }
    const brand = await Brand.findById(brandId).lean();
    if (!brand) return res.status(404).json({ error: "Brand not found" });

    try {
      const fav = await Favorite.create({ user: req.user.id, kind: "brand", brand: brandId });
      return res.status(201).json(await toRow({ ...fav.toObject(), brand }));
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "Already in your basket" });
      throw err;
    }
  } catch (err) {
    console.error("favorite add error:", err);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

/**
 * DELETE /api/favorites/:favoriteId
 * Removes one basket row (either kind) by its own id, scoped to the user.
 */
router.delete("/:favoriteId", async (req, res) => {
  try {
    const { favoriteId } = req.params;
    if (!mongoose.isValidObjectId(favoriteId)) {
      return res.status(400).json({ error: "Invalid favorite id" });
    }

    await Favorite.deleteOne({ _id: favoriteId, user: req.user.id });
    return res.status(200).json({ message: "Removed from basket" });
  } catch (err) {
    console.error("favorite remove error:", err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
