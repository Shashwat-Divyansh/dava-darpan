import { Router } from "express";
import mongoose from "mongoose";

import Medicine from "../models/Medicine.js";
import Brand from "../models/Brand.js";
import Kendra from "../models/Kendra.js";
import { buildComparison, parsePackSize, round2 } from "../utils/pricing.js";
import { buildBrandComparison } from "../services/comparison.js";
import { prettifyCompositionKey, isStrengthSpecific } from "../utils/labels.js";

const router = Router();

/** Escape a user string so it can be used safely inside a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/medicines/search?q=...   (public — guests can browse)
 *
 * COMPOSITION-FIRST autocomplete. Every suggestion is a composition at a
 * specific strength (never a bare "Paracetamol"). Brand names act as aliases:
 * typing "Dolo" surfaces "Paracetamol 650mg" with viaBrand: "Dolo 650".
 * Suggestions ranked: brand-name matches first, then composition-text matches,
 * then Jan Aushadhi generic-name matches. Up to 10 results.
 */
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const safe = escapeRegex(q);
    const contains = new RegExp(safe, "i");
    const startsWith = new RegExp("^" + safe, "i");

    // Candidates from three sources: brand names, brand composition text, and
    // raw Jan Aushadhi generic names (so generics without a curated brand are
    // still findable).
    const [matchedBrands, matchedMeds] = await Promise.all([
      Brand.find({ $or: [{ brandName: contains }, { composition: contains }] })
        .limit(40)
        .lean(),
      Medicine.find({ genericName: contains, compositionKey: { $ne: "" } })
        .limit(40)
        .lean(),
    ]);

    // Collect composition keys in ranked order; first source to add a key wins
    // (so a brand-name match keeps its viaBrand alias info).
    const ordered = [];
    const seen = new Set();
    const push = (key, viaBrand) => {
      if (!key || seen.has(key) || !isStrengthSpecific(key)) return;
      seen.add(key);
      ordered.push({ key, viaBrand });
    };

    const nameMatches = matchedBrands
      .filter((b) => contains.test(b.brandName))
      .sort(
        (a, b) =>
          (startsWith.test(b.brandName) ? 1 : 0) - (startsWith.test(a.brandName) ? 1 : 0) ||
          a.brandName.localeCompare(b.brandName)
      );
    for (const b of nameMatches) push(b.compositionKey, b.brandName);
    for (const b of matchedBrands) if (!contains.test(b.brandName)) push(b.compositionKey, null);
    for (const m of matchedMeds) push(m.compositionKey, null);

    const top = ordered.slice(0, 10);
    const keys = top.map((o) => o.key);

    // Enrich each suggestion: how many brands share the key, is a generic listed,
    // and a readable label (curated brand text preferred over the key fallback).
    const [brandsForKeys, genericKeys] = await Promise.all([
      Brand.find({ compositionKey: { $in: keys } }).lean(),
      Medicine.distinct("compositionKey", { compositionKey: { $in: keys } }),
    ]);
    const genericSet = new Set(genericKeys);
    const brandsByKey = {};
    for (const b of brandsForKeys) (brandsByKey[b.compositionKey] ||= []).push(b);

    const results = top.map(({ key, viaBrand }) => ({
      compositionKey: key,
      label: brandsByKey[key]?.[0]?.composition || prettifyCompositionKey(key),
      brandCount: brandsByKey[key]?.length || 0,
      hasGeneric: genericSet.has(key),
      viaBrand: viaBrand || undefined,
    }));

    res.json({ results });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /api/medicines/compare/:compositionKey   (public — guests can browse)
 *
 * The composition-first comparison: for ONE exact composition+strength, return
 * the Jan Aushadhi generic (cheapest per-unit if several are listed) and ALL
 * branded medicines sharing the key, sorted by per-pack price ascending.
 * Strengths are never merged — the key IS the product identity.
 */
router.get("/compare/:compositionKey", async (req, res) => {
  try {
    const key = (req.params.compositionKey || "").trim();
    if (!key) return res.status(400).json({ error: "Missing composition key" });

    const [generics, brands] = await Promise.all([
      Medicine.find({ compositionKey: key }).lean(),
      Brand.find({ compositionKey: key }).lean(),
    ]);

    if (generics.length === 0 && brands.length === 0) {
      return res.status(404).json({ error: "No medicines found for this composition" });
    }

    // Generics priced per-unit; the cheapest per-unit one is THE generic shown.
    const pricedGenerics = generics
      .map((g) => {
        const packCount = parsePackSize(g.unitSize);
        return {
          genericName: g.genericName,
          mrp: g.mrp,
          unitSize: g.unitSize,
          packCount,
          perUnitPrice: round2(g.mrp / packCount),
        };
      })
      .sort((a, b) => a.perUnitPrice - b.perUnitPrice);
    const generic = pricedGenerics[0] || null;

    // Brands ranked by PER-TABLET price — the true apples-to-apples figure
    // (pack sizes differ, so pack price alone can mislead). Pack price stays
    // the prominent DISPLAY figure on each row; only ranking uses per-unit.
    const pricedBrands = brands
      .map((b) => {
        const packCount = parsePackSize(b.packSize);
        return {
          id: b._id,
          brandName: b.brandName,
          manufacturer: b.manufacturer,
          mrp: b.mrp,
          packSize: b.packSize,
          packCount,
          perUnitPrice: round2(b.mrp / packCount),
        };
      })
      .sort((a, b) => a.perUnitPrice - b.perUnitPrice || a.mrp - b.mrp);
    const cheapestBrand = pricedBrands[0] || null;

    // Headline savings vs the cheapest branded option, in per-unit terms
    // (like-for-like). Per-pack diff is included for context but must never
    // contradict the per-unit truth in the UI.
    let savingsPerUnit = null;
    let savingsPercentUnit = null;
    let savingsPerPack = null;
    if (generic && cheapestBrand) {
      savingsPerUnit = round2(cheapestBrand.perUnitPrice - generic.perUnitPrice);
      savingsPercentUnit =
        cheapestBrand.perUnitPrice > 0
          ? Math.round((savingsPerUnit / cheapestBrand.perUnitPrice) * 100)
          : null;
      savingsPerPack = round2(cheapestBrand.mrp - generic.mrp);
    }

    res.json({
      compositionKey: key,
      label: brands[0]?.composition || prettifyCompositionKey(key),
      hasGeneric: generic !== null,
      generic,
      otherGenerics: pricedGenerics.slice(1),
      brandCount: pricedBrands.length,
      brands: pricedBrands,
      savingsPerUnit,
      savingsPercentUnit,
      savingsPerPack,
    });
  } catch (err) {
    console.error("compare error:", err);
    res.status(500).json({ error: "Failed to build comparison" });
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
