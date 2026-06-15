import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Medicine from "../models/Medicine.js";
import { normalizeComposition } from "../utils/composition.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "data", "jan-aushadhi-products.csv");

/**
 * Read the Jan Aushadhi CSV, compute a composition key for each row, and upsert
 * every valid product into the Medicine collection (keyed by Drug Code so the
 * script is safe to re-run). Assumes an open Mongoose connection.
 *
 * Returns { imported, skipped, emptyKeys } for reporting.
 */
export async function importMedicines() {
  // 1. Read all CSV rows into memory (the file is small — a few thousand rows).
  const rows = await new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => out.push(row))
      .on("end", () => resolve(out))
      .on("error", reject);
  });

  // 2. Turn each row into a Medicine document, skipping unusable rows.
  const ops = [];
  let skipped = 0;
  let emptyKeys = 0;

  for (const row of rows) {
    // Column names come straight from the CSV header.
    const drugCode = (row["Drug Code"] || "").trim();
    const genericName = (row["Generic Name"] || "").trim();
    const mrp = parseFloat(row["MRP"]);

    // Skip rows with no name, no drug code, or no usable price (0 / blank).
    if (!drugCode || !genericName || !mrp || Number.isNaN(mrp)) {
      skipped++;
      continue;
    }

    const compositionKey = normalizeComposition(genericName);
    if (!compositionKey) emptyKeys++; // kept, but won't match any brand

    ops.push({
      updateOne: {
        filter: { drugCode },
        update: {
          $set: {
            drugCode,
            genericName,
            compositionKey,
            unitSize: (row["Unit Size"] || "").trim(),
            mrp,
            group: (row["Group Name"] || "").trim(),
          },
        },
        upsert: true,
      },
    });
  }

  // 3. Bulk upsert in one round-trip.
  if (ops.length) await Medicine.bulkWrite(ops, { ordered: false });

  const imported = ops.length;
  console.log(`💊 Medicines: imported/updated ${imported}, skipped ${skipped} (no name/code/price), ${emptyKeys} had an unparseable composition.`);
  return { imported, skipped, emptyKeys };
}

// ----- Allow running this file on its own: `node scripts/importMedicines.js` -----
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: join(__dirname, "..", ".env") });
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    await importMedicines();
  } catch (err) {
    console.error("❌ Medicine import failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
