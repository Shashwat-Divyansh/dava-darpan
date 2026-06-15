import mongoose from "mongoose";

/**
 * Kendra = a Pradhan Mantri Bhartiya Janaushadhi Kendra (generic-medicine store)
 * imported from the official CSV.
 *
 * pinCode is stored as a STRING to preserve any leading zeros.
 */
const kendraSchema = new mongoose.Schema(
  {
    kendraCode: { type: String, required: true, unique: true }, // upsert key
    name: { type: String, default: "" },
    state: { type: String, default: "" },
    district: { type: String, default: "" },
    pinCode: { type: String, default: "" }, // string — leading zeros matter
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes for the two lookup paths the finder uses.
kendraSchema.index({ pinCode: 1 });
kendraSchema.index({ state: 1, district: 1 });

const Kendra = mongoose.model("Kendra", kendraSchema);
export default Kendra;
