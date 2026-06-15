/**
 * pricing.js — per-unit price math.
 *
 * Brand MRP and generic MRP are quoted for whole packs of different sizes
 * (e.g. a brand pack of "20 tablets" vs a generic "10's"). Comparing pack prices
 * directly is misleading, so we reduce both to a per-unit (per-tablet) price and
 * compute savings from that.
 */

/**
 * Extract the unit count from a pack/size string.
 *   "10's" -> 10, "15 Tablets" -> 15, "1 Vial" -> 1, "100 ml" -> 100,
 *   "10 ml Vial" -> 10, "15 g" -> 15. Defaults to 1 when no number is found.
 */
export function parsePackSize(packStr) {
  if (!packStr || typeof packStr !== "string") return 1;
  const match = packStr.match(/\d+/); // first run of digits
  const count = match ? parseInt(match[0], 10) : 1;
  return count > 0 ? count : 1;
}

/** Round to 2 decimal places (money). */
export function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Per-unit price = pack MRP / units in the pack. */
export function perUnitPrice(mrp, packStr) {
  return round2(mrp / parsePackSize(packStr));
}

/**
 * Build a full priced comparison between a brand and its matching generics.
 * Generics are priced per-unit and sorted cheapest-first; savings are computed
 * against the cheapest generic.
 *
 * Returns everything the UI needs to show the math transparently.
 */
export function buildComparison(brand, generics) {
  const brandPackCount = parsePackSize(brand.packSize);
  const brandPerUnit = round2(brand.mrp / brandPackCount);

  // Price each generic per-unit, then sort by that (not by pack price).
  const pricedGenerics = generics
    .map((g) => {
      const packCount = parsePackSize(g.unitSize);
      return {
        genericName: g.genericName,
        mrp: g.mrp,
        unitSize: g.unitSize,
        group: g.group,
        packCount,
        perUnitPrice: round2(g.mrp / packCount),
      };
    })
    .sort((a, b) => a.perUnitPrice - b.perUnitPrice);

  const cheapest = pricedGenerics[0] || null;

  let savingsPerUnit = null;
  let savingsPercent = null;
  if (cheapest) {
    savingsPerUnit = round2(brandPerUnit - cheapest.perUnitPrice);
    savingsPercent = brandPerUnit > 0 ? Math.round((savingsPerUnit / brandPerUnit) * 100) : null;
  }

  return {
    brandPackCount,
    brandPerUnit,
    pricedGenerics,
    cheapest,
    savingsPerUnit,
    savingsPercent,
  };
}
