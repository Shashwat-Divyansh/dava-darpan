import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Kendra from "../models/Kendra.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "data", "kendras.csv");

/**
 * Read kendras.csv, map columns to fields, and upsert each kendra (keyed by
 * Kendra Code so the script is re-runnable). Rows missing BOTH a pin code and a
 * district are skipped (unsearchable). Assumes an open Mongoose connection.
 *
 * Returns { imported, skipped }.
 */
export async function importKendras() {
  const rows = await new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv()) // handles quoted Address fields that contain commas
      .on("data", (row) => out.push(row))
      .on("end", () => resolve(out))
      .on("error", reject);
  });

  const ops = [];
  let skipped = 0;

  for (const row of rows) {
    const kendraCode = (row["Kendra Code"] || "").trim();
    const pinCode = (row["Pin Code"] || "").trim();
    const district = (row["District Name"] || "").trim();

    // Skip rows we can't search (no pin AND no district), or with no code.
    if (!kendraCode || (!pinCode && !district)) {
      skipped++;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { kendraCode },
        update: {
          $set: {
            kendraCode,
            name: (row["Name"] || "").trim(),
            state: (row["State Name"] || "").trim(),
            district,
            pinCode,
            address: (row["Address"] || "").trim(),
          },
        },
        upsert: true,
      },
    });
  }

  // Upsert in batches to keep each bulkWrite a reasonable size.
  const BATCH = 2000;
  for (let i = 0; i < ops.length; i += BATCH) {
    await Kendra.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
  }

  console.log(`📍 Kendras: imported/updated ${ops.length}, skipped ${skipped} (no code, or no pin & no district).`);
  return { imported: ops.length, skipped };
}

// ----- Allow running this file on its own: `node scripts/importKendras.js` -----
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: join(__dirname, "..", ".env") });
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    await importKendras();
  } catch (err) {
    console.error("❌ Kendra import failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
