import Medicine from "../models/Medicine.js";
import { buildComparison } from "../utils/pricing.js";

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
