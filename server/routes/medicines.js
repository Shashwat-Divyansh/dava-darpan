import { Router } from "express";
import mongoose from "mongoose";

import Medicine from "../models/Medicine.js";
import Brand from "../models/Brand.js";

const router = Router();

/** Round to a whole rupee for clean display. */
const r = (n) => Math.round(n);

/**
 * Build the savings view for a brand given its matching generics (already sorted
 * cheapest-first). Returns null pieces gracefully when there are no matches.
 * NOTE: brand MRP and generic MRP can be for different pack sizes, so savings is
 * an approximate per-pack comparison — good enough to prove the concept.
 */
function buildSavings(brand, generics) {
  if (!generics.length) {
    return { cheapestGeneric: null, savings: null, savingsPercent: null };
  }
  const cheapest = generics[0];
  const savings = brand.mrp - cheapest.mrp;
  const savingsPercent = brand.mrp > 0 ? r((savings / brand.mrp) * 100) : null;
  return {
    cheapestGeneric: {
      genericName: cheapest.genericName,
      mrp: cheapest.mrp,
      unitSize: cheapest.unitSize,
    },
    savings: r(savings),
    savingsPercent,
  };
}

/**
 * GET /api/medicines/stats
 * Proves the data is loaded AND that brand→generic matching works.
 * Returns counts, which brands have no generic match (and why we'd care),
 * and a handful of concrete sample matches with computed savings.
 */
router.get("/stats", async (req, res) => {
  try {
    const [genericCount, brandCount, brands, medicineKeys] = await Promise.all([
      Medicine.countDocuments(),
      Brand.countDocuments(),
      Brand.find().lean(),
      Medicine.distinct("compositionKey"),
    ]);

    // Set of composition keys that actually exist among the generics.
    const keySet = new Set(medicineKeys.filter(Boolean));

    const matchedBrands = [];
    const unmatchedBrands = [];
    for (const b of brands) {
      if (b.compositionKey && keySet.has(b.compositionKey)) matchedBrands.push(b);
      else unmatchedBrands.push({ brandName: b.brandName, composition: b.composition, compositionKey: b.compositionKey });
    }

    // Build 5 concrete sample matches (brand + its cheapest generic + savings).
    const sampleMatches = [];
    for (const b of matchedBrands.slice(0, 5)) {
      const generics = await Medicine.find({ compositionKey: b.compositionKey })
        .sort({ mrp: 1 })
        .lean();
      sampleMatches.push({
        brand: { brandName: b.brandName, composition: b.composition, mrp: b.mrp },
        compositionKey: b.compositionKey,
        matchedGenericCount: generics.length,
        ...buildSavings(b, generics),
      });
    }

    res.json({
      genericCount,
      brandCount,
      matchedBrandCount: matchedBrands.length,
      unmatchedBrandCount: unmatchedBrands.length,
      unmatchedBrands,
      sampleMatches,
    });
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

/**
 * GET /api/medicines/match/:brandId
 * Given a brand, return the brand plus every Jan Aushadhi generic that shares its
 * composition key, sorted cheapest-first, with computed savings.
 */
router.get("/match/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!mongoose.isValidObjectId(brandId)) {
      return res.status(400).json({ error: "Invalid brand id" });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // No key (couldn't parse composition) → no possible matches.
    const generics = brand.compositionKey
      ? await Medicine.find({ compositionKey: brand.compositionKey }).sort({ mrp: 1 }).lean()
      : [];

    res.json({
      brand: {
        id: brand._id,
        brandName: brand.brandName,
        manufacturer: brand.manufacturer,
        composition: brand.composition,
        mrp: brand.mrp,
        packSize: brand.packSize,
      },
      compositionKey: brand.compositionKey,
      matchCount: generics.length,
      ...buildSavings(brand, generics),
      generics: generics.map((g) => ({
        genericName: g.genericName,
        mrp: g.mrp,
        unitSize: g.unitSize,
        group: g.group,
      })),
    });
  } catch (err) {
    console.error("match error:", err);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

export default router;
