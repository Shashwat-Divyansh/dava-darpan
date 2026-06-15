/** Format a number as Indian Rupees with up to 2 decimals, e.g. 2.2 -> "₹2.20". */
export function formatINR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return (
    "₹" +
    Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Derive a human unit noun from a pack/size string so we can say "per tablet"
 * vs "per capsule" instead of a generic "per unit".
 */
export function unitLabel(packSize) {
  const s = (packSize || "").toLowerCase();
  if (s.includes("cap")) return "capsule";
  if (s.includes("tab")) return "tablet";
  if (s.includes("ml")) return "ml";
  return "unit";
}
