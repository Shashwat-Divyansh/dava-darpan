import mongoose from "mongoose";

/**
 * Medicine = a Jan Aushadhi (generic) product imported from the official CSV.
 * `genericName` is the raw, messy CSV text; `compositionKey` is the canonical
 * key produced by normalizeComposition() and is what we match brands against.
 */
const medicineSchema = new mongoose.Schema(
  {
    drugCode: {
      type: String,
      required: true,
      unique: true, // stable identifier from the CSV — used for idempotent upserts
    },
    genericName: { type: String, required: true }, // raw CSV "Generic Name"
    compositionKey: {
      type: String,
      index: true, // indexed because every brand→generic match queries on this
      default: "",
    },
    unitSize: { type: String, default: "" }, // e.g. "10's", "15 g"
    mrp: { type: Number, default: 0 }, // Jan Aushadhi price in INR
    group: { type: String, default: "" }, // therapeutic category
  },
  { timestamps: true }
);

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
