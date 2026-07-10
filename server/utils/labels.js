/**
 * Turn a canonical composition key back into a human-readable label, used when
 * no curated brand supplies a nicer composition string.
 *   "paracetamol|650mg"                       -> "Paracetamol 650mg"
 *   "ibuprofen|400mg+paracetamol|325mg"       -> "Ibuprofen 400mg + Paracetamol 325mg"
 * (Keys strip spaces from multi-word names, so this is a best-effort fallback —
 * curated brand.composition text is always preferred where available.)
 */
export function prettifyCompositionKey(key) {
  if (!key || typeof key !== "string") return "";
  return key
    .split("+")
    .map((part) => {
      const [name, strength] = part.split("|");
      const pretty = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
      return strength ? `${pretty} ${strength}` : pretty;
    })
    .join(" + ");
}

/**
 * True when every ingredient in the key carries an explicit strength.
 * Suggestions must always be strength-specific ("Paracetamol 650mg", never bare
 * "Paracetamol") because different strengths are different products.
 */
export function isStrengthSpecific(key) {
  if (!key) return false;
  return key.split("+").every((part) => part.includes("|"));
}
