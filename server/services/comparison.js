import Medicine from "../models/Medicine.js";
import Brand from "../models/Brand.js";
import { buildComparison, parsePackSize, round2 } from "../utils/pricing.js";
import { prettifyCompositionKey } from "../utils/labels.js";

/**
 * Build the full brand→generic comparison payload for a single brand document.
 *
 * Shared by the /match route and the favorites route so the comparison shape and
 * pricing logic live in exactly one place.
 *
 * @param {object} brand - a lean Brand document
 * @returns the comparison object (brand info, savings, matched generics)
 */
export async function buildBrandComparison(brand) {
  const generics = brand.compositionKey
    ? await Medicine.find({ compositionKey: brand.compositionKey }).lean()
    : [];

  const cmp = buildComparison(brand, generics);

  return {
    brand: {
      id: brand._id,
      brandName: brand.brandName,
      manufacturer: brand.manufacturer,
      composition: brand.composition,
      mrp: brand.mrp,
      packSize: brand.packSize,
      packCount: cmp.brandPackCount,
      perUnitPrice: cmp.brandPerUnit,
    },
    compositionKey: brand.compositionKey,
    hasGenericEquivalent: cmp.cheapest !== null,
    matchCount: cmp.pricedGenerics.length,
    cheapestGeneric: cmp.cheapest,
    savingsPerUnit: cmp.savingsPerUnit,
    savingsPercent: cmp.savingsPercent,
    generics: cmp.pricedGenerics,
  };
}

/** Price a document that has { mrp } + a pack string, per-unit included. */
function priced(doc, packStr) {
  const packCount = parsePackSize(packStr);
  return { packCount, perUnitPrice: round2(doc.mrp / packCount) };
}

/**
 * Build the basket payload for a saved GENERIC (kind "generic" favorite):
 * the Jan Aushadhi generic for a composition, plus the cheapest branded option
 * (by per-unit price) as the "what you'd have paid" context.
 *
 * Returns null if no generic is currently listed for the key (e.g. the product
 * list changed since the favorite was saved) — callers should drop such rows.
 */
export async function buildGenericComparison(compositionKey) {
  const [generics, brands] = await Promise.all([
    Medicine.find({ compositionKey }).lean(),
    Brand.find({ compositionKey }).lean(),
  ]);

  const pricedGenerics = generics
    .map((g) => ({
      genericName: g.genericName,
      mrp: g.mrp,
      unitSize: g.unitSize,
      ...priced(g, g.unitSize),
    }))
    .sort((a, b) => a.perUnitPrice - b.perUnitPrice);
  const generic = pricedGenerics[0] || null;
  if (!generic) return null;

  // Cheapest brand by PER-UNIT price — consistent with the comparison page.
  const pricedBrands = brands
    .map((b) => ({
      id: b._id,
      brandName: b.brandName,
      manufacturer: b.manufacturer,
      mrp: b.mrp,
      packSize: b.packSize,
      ...priced(b, b.packSize),
    }))
    .sort((a, b) => a.perUnitPrice - b.perUnitPrice || a.mrp - b.mrp);
  const cheapestBrand = pricedBrands[0] || null;

  return {
    compositionKey,
    label: brands[0]?.composition || prettifyCompositionKey(compositionKey),
    generic,
    cheapestBrand, // null when no curated brand shares this composition
    savingsPerPack: cheapestBrand ? round2(cheapestBrand.mrp - generic.mrp) : null,
    savingsPerUnit: cheapestBrand ? round2(cheapestBrand.perUnitPrice - generic.perUnitPrice) : null,
  };
}
