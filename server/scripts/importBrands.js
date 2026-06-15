import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import mongoose from "mongoose";
import dotenv from "dotenv";

import Brand from "../models/Brand.js";
import { normalizeComposition } from "../utils/composition.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "..", "data", "brand-medicines.json");

/**
 * Read the curated brand list, compute a composition key for each brand, and
 * upsert into the Brand collection (keyed by brandName so it's re-runnable).
 * Assumes an open Mongoose connection. Returns { imported }.
 */
export async function importBrands() {
  const brands = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

  const ops = brands.map((b) => ({
    updateOne: {
      filter: { brandName: b.brandName },
      update: {
        $set: {
          brandName: b.brandName,
          manufacturer: b.manufacturer || "",
          composition: b.composition,
          // Same normalizer as the generics, so keys line up and match.
          compositionKey: normalizeComposition(b.composition),
          mrp: Number(b.mrp) || 0,
          packSize: b.packSize || "",
        },
      },
      upsert: true,
    },
  }));

  if (ops.length) await Brand.bulkWrite(ops, { ordered: false });

  console.log(`🏷️  Brands: imported/updated ${ops.length}.`);
  return { imported: ops.length };
}

// ----- Allow running this file on its own: `node scripts/importBrands.js` -----
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: join(__dirname, "..", ".env") });
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    await importBrands();
  } catch (err) {
    console.error("❌ Brand import failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
