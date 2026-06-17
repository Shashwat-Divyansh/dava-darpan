import { Router } from "express";
import mongoose from "mongoose";

import Medicine from "../models/Medicine.js";
import Brand from "../models/Brand.js";
import Kendra from "../models/Kendra.js";
import { buildComparison } from "../utils/pricing.js";
import { buildBrandComparison } from "../services/comparison.js";

const router = Router();

/** Escape a user string so it can be used safely inside a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/medicines/search?q=...   (public — guests can browse)
 * Powers the autocomplete. Matches brands by name OR composition, ranks
 * name-starts-with first, then name-contains, then composition matches.
 * Returns a lean payload of up to 10 results.
 */
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const safe = escapeRegex(q);
    const contains = new RegExp(safe, "i");
    const startsWith = new RegExp("^" + safe, "i");

    // One DB query: any brand whose name OR composition contains the query.
    const brands = await Brand.find({
      $or: [{ brandName: contains }, { composition: contains }],
    })
      .limit(30)
      .lean();

    // Rank: name starts-with (0) < name contains (1) < composition-only (2),
    // then alphabetical within each tier.
    const rank = (b) => {
      if (startsWith.test(b.brandName)) return 0;
      if (contains.test(b.brandName)) return 1;
      return 2;
    };
    brands.sort((a, b) => rank(a) - rank(b) || a.brandName.localeCompare(b.brandName));

    const results = brands.slice(0, 10).map((b) => ({
      id: b._id,
      brandName: b.brandName,
      composition: b.composition,
      manufacturer: b.manufacturer,
    }));

    res.json({ results });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /api/medicines/match/:brandId   (public — guests can browse)
 * Returns the brand plus every Jan Aushadhi generic sharing its composition key,
 * priced per-unit and sorted cheapest-first, with savings vs the cheapest.
 * hasGenericEquivalent tells the UI whether to show a comparison or an honest
 * "no equivalent" state.
 */
router.get("/match/:brandId", async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!mongoose.isValidObjectId(brandId)) {
      return res.status(400).json({ error: "Invalid brand id" });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) return res.status(404).json({ error: "Brand not found" });

    // Shared comparison logic (also used by the favorites route).
    res.json(await buildBrandComparison(brand));
  } catch (err) {
    console.error("match error:", err);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

/**
 * GET /api/medicines/stats
 * Verification endpoint (left open): data counts, which brands have no generic
 * match, and a few sample matches with per-unit savings.
 */
router.get("/stats", async (req, res) => {
  try {
    const [genericCount, brandCount, kendraCount, brands, medicineKeys] = await Promise.all([
      Medicine.countDocuments(),
      Brand.countDocuments(),
      Kendra.countDocuments(),
      Brand.find().lean(),
      Medicine.distinct("compositionKey"),
    ]);

    const keySet = new Set(medicineKeys.filter(Boolean));

    const matchedBrands = [];
    const unmatchedBrands = [];
    for (const b of brands) {
      if (b.compositionKey && keySet.has(b.compositionKey)) matchedBrands.push(b);
      else unmatchedBrands.push({ brandName: b.brandName, composition: b.composition, compositionKey: b.compositionKey });
    }

    const sampleMatches = [];
    for (const b of matchedBrands.slice(0, 5)) {
      const generics = await Medicine.find({ compositionKey: b.compositionKey }).lean();
      const cmp = buildComparison(b, generics);
      sampleMatches.push({
        brand: { brandName: b.brandName, composition: b.composition, mrp: b.mrp, packSize: b.packSize, perUnitPrice: cmp.brandPerUnit },
        compositionKey: b.compositionKey,
        matchedGenericCount: cmp.pricedGenerics.length,
        cheapestGeneric: cmp.cheapest && { genericName: cmp.cheapest.genericName, mrp: cmp.cheapest.mrp, unitSize: cmp.cheapest.unitSize, perUnitPrice: cmp.cheapest.perUnitPrice },
        savingsPerUnit: cmp.savingsPerUnit,
        savingsPercent: cmp.savingsPercent,
      });
    }

    res.json({
      genericCount,
      brandCount,
      kendraCount,
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

export default router;
