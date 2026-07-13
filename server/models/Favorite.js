import mongoose from "mongoose";

/**
 * Favorite = one row in the user's savings basket. Two kinds:
 *
 *  - kind "brand":   the user saved a SPECIFIC branded medicine (brand ref).
 *    The basket row compares that brand against its Jan Aushadhi generic.
 *  - kind "generic": the user saved THE JAN AUSHADHI GENERIC for a composition
 *    (stored by compositionKey). The basket row shows the generic, with the
 *    cheapest branded option as the "what you'd have paid" context.
 *
 * compositionKey (not a Medicine ref) is stored for generic rows because the
 * generic shown is derived data — "the cheapest listed pack for this
 * composition" — and resolving it at read time stays correct even if the
 * Jan Aushadhi product list is re-seeded with new prices or pack sizes.
 *
 * Uniqueness is per-kind (partial indexes): a user can save a brand once, and
 * a composition's generic once. Docs created before "kind" existed have no
 * kind field — readers treat missing kind as "brand".
 */
const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["brand", "generic"], default: "brand" },
    // kind "brand" rows:
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    // kind "generic" rows:
    compositionKey: { type: String },
    // Packs the user plans to buy — multiplies this row in the basket totals.
    // Persisted so the basket survives refresh/login (it's a saved plan).
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true } // gives us createdAt
);

// One brand per user (only enforced on rows that actually reference a brand).
favoriteSchema.index(
  { user: 1, brand: 1 },
  { unique: true, partialFilterExpression: { brand: { $exists: true } } }
);
// One generic-per-composition per user (only on rows carrying a compositionKey).
favoriteSchema.index(
  { user: 1, compositionKey: 1 },
  { unique: true, partialFilterExpression: { compositionKey: { $exists: true } } }
);

const Favorite = mongoose.model("Favorite", favoriteSchema);
export default Favorite;
