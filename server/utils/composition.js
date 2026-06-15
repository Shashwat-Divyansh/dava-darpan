/**
 * composition.js — the heart of Dava Darpan's matching.
 *
 * Jan Aushadhi generic names in the official CSV are messy free-text, e.g.
 *   "Paracetamol Tablets IP 650 mg"
 *   "Ibuprofen 400mg and Paracetamol 325mg Tablets IP"
 *   "Montelukast Sodium 10mg and Levocetirizine 5mg Tablets IP"
 *
 * Branded medicines (Dolo 650, Combiflam, Montair-LC) must be matched to these
 * by COMPOSITION, not by name. normalizeComposition() turns any of these strings
 * into a canonical "composition key" so that two products with the same active
 * ingredients + strengths produce the SAME key regardless of wording or order.
 *
 *   "Ibuprofen 400mg and Paracetamol 325mg Tablets IP"  ─┐
 *   "Paracetamol 325 mg + Ibuprofen 400 mg"             ─┴─►  "ibuprofen|400mg+paracetamol|325mg"
 *
 * Key format:  ingredient|strength  (multiple ingredients joined by "+", sorted)
 */

// ---------------------------------------------------------------------------
// Noise words to remove. These are dosage forms, pharmacopoeia tags, release
// descriptors, and salt forms — none of which affect what the medicine *is*.
// NOTE: "acid" is deliberately NOT here (clavulanic/mefenamic/ascorbic acid are
// real ingredient names), and minerals like "calcium" are kept as actives.
// ---------------------------------------------------------------------------
const NOISE_WORDS = new Set([
  // dosage forms
  "tablet", "tablets", "tab", "tabs", "tabelts", // "tabelts" = a real typo in the CSV
  "capsule", "capsules", "cap", "caps",
  "syrup", "suspension", "injection", "infusion", "solution", "drops", "drop",
  "gel", "cream", "ointment", "lotion", "spray", "sachet", "powder", "granules",
  "inhalation", "inhaler", "mdi", "respules", "vial", "ampoule", "bottle",
  // pharmacopoeia / quality tags
  "ip", "bp", "usp", "ep",
  // release / coating descriptors
  "gastro", "gastroresistant", "resistant", "enteric", "coated",
  "prolonged", "sustained", "modified", "extended", "release",
  "er", "sr", "xr", "mr", "od", "dispersible", "dt", "chewable", "soluble",
  "film", "plain", "oral", "dry", "per",
  // miscellaneous descriptors seen in the data
  "origin", "rdna", "spore", "spores", "million",
  // salt / ester forms (drop so "Diclofenac Sodium" == "Diclofenac")
  "sodium", "potassium", "hydrochloride", "hydrochloric", "hcl",
  "dihydrochloride", "hydrobromide", "bromide", "sulphate", "sulfate",
  "phosphate", "maleate", "besylate", "mesylate", "citrate", "fumarate",
  "succinate", "tartrate", "acetate", "gluconate", "orotate", "diethylamine",
  "dipropionate", "propionate", "valerate", "furoate", "xinafoate",
  "dihydrate", "monohydrate", "trihydrate", "hemihydrate", "anhydrous",
]);

// Matches a strength: number (optional decimal) + unit. Order matters: longer
// units (mcg) are listed before shorter ones (mg, g) so they win the match.
// The (?![a-z]) lookahead ends the unit cleanly without requiring a word
// boundary — important for "%" (e.g. "1%"), where \b would fail before a space.
const STRENGTH_RE = /(\d+\.?\d*)\s*(mcg|µg|mg|iu|ml|%|g)(?![a-z])/i;
// Global version for stripping every strength out of a fragment.
const STRENGTH_RE_G = new RegExp(STRENGTH_RE.source, "gi");

/**
 * Extract and normalize the first strength found in a fragment.
 * "650 mg" -> "650mg", "200mcg" -> "200mcg", "1.16%w/w" -> "1.16%", "40 IU" -> "40iu"
 * Returns "" when the fragment has no recognisable strength.
 */
function extractStrength(fragment) {
  const m = fragment.match(STRENGTH_RE);
  if (!m) return "";
  const amount = m[1];
  const unit = m[2].toLowerCase().replace("µg", "mcg");
  return `${amount}${unit}`;
}

/**
 * Reduce a single ingredient fragment (e.g. "Diclofenac Sodium 50 mg") to its
 * canonical "name|strength" form (e.g. "diclofenac|50mg").
 */
function normalizeIngredient(fragment) {
  const strength = extractStrength(fragment);

  // Remove every strength token, then keep only the real ingredient words:
  // split into words, drop noise/salt words and anything that isn't letters.
  const name = fragment
    .replace(STRENGTH_RE_G, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, "").toLowerCase()) // strip punctuation
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join("");

  if (!name) return ""; // fragment was pure noise (e.g. a stray descriptor)
  return strength ? `${name}|${strength}` : name;
}

/**
 * normalizeComposition(rawString) -> canonical composition key.
 *
 * Steps:
 *  1. Lowercase.
 *  2. Handle parentheses: keep the contents of dose parens like "(200mg)",
 *     but drop descriptive parens like "(Gastro-resistant)" / "(R-DNA Origin)".
 *  3. Remove concentration noise ("per 5 ml", "w/w", "w/v").
 *  4. Unify all ingredient separators (comma, "and", "&", "+", "/") into "+".
 *  5. Split into ingredient fragments and normalize each (name + strength).
 *  6. Drop empties, de-duplicate, and SORT alphabetically so order never matters.
 *  7. Join with "+".
 */
export function normalizeComposition(rawString) {
  if (!rawString || typeof rawString !== "string") return "";

  let s = rawString.toLowerCase();

  // 1b. Turn hyphens/dashes into spaces so hyphenated descriptors split into
  //     individual words ("prolonged-release" -> "prolonged release", both of
  //     which are noise words). Joining names later reassembles real hyphenated
  //     ingredient names unchanged.
  s = s.replace(/[-–—]/g, " ");

  // 2. Parentheses: unwrap "(...123...)" (a dose) but delete note-only parens.
  s = s.replace(/\(([^()]*)\)/g, (_full, inner) => (/\d/.test(inner) ? ` ${inner} ` : " "));

  // 3. Strip concentration descriptors that would confuse strength parsing.
  s = s.replace(/per\s*\d*\s*(ml|l|tablet|cap(sule)?)\b/g, " "); // "per 5 ml", "per ml"
  s = s.replace(/w\s*\/\s*[wv]/g, " "); // "w/w", "w/v"

  // 4. Normalize separators to a single "+". (\band\b avoids hitting words that
  //    merely contain "and".)
  s = s.replace(/\band\b/g, "+").replace(/&/g, "+").replace(/[,/]/g, "+");

  // 5 & 6. Normalize each fragment, drop blanks, de-dupe, sort.
  const ingredients = s
    .split("+")
    .map(normalizeIngredient)
    .filter(Boolean);

  const unique = [...new Set(ingredients)].sort();

  // 7. Canonical key.
  return unique.join("+");
}
