import mongoose from "mongoose";

/**
 * Brand = a curated, well-known branded medicine (e.g. "Dolo 650").
 * `composition` is human-readable ("Paracetamol 650mg"); `compositionKey` is the
 * canonical key (via normalizeComposition) used to find matching Jan Aushadhi
 * generics that share the same active ingredients + strengths.
 */
const brandSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    manufacturer: { type: String, default: "" },
    composition: { type: String, required: true }, // readable, e.g. "Ibuprofen 400mg + Paracetamol 325mg"
    compositionKey: { type: String, index: true, default: "" },
    mrp: { type: Number, default: 0 }, // typical market price in INR
    packSize: { type: String, default: "" }, // e.g. "15 tablets"
  },
  { timestamps: true }
);

// A brand is uniquely identified by its name (used for idempotent upserts).
brandSchema.index({ brandName: 1 }, { unique: true });

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
