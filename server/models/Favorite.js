import mongoose from "mongoose";

/**
 * Favorite = a brand a user has added to their savings basket.
 * The unique compound index on (user, brand) prevents adding the same medicine
 * twice for the same user.
 */
const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
  },
  { timestamps: true } // gives us createdAt
);

favoriteSchema.index({ user: 1, brand: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);
export default Favorite;
