import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import mongoose from "mongoose";
import dotenv from "dotenv";

import { importMedicines } from "./importMedicines.js";
import { importBrands } from "./importBrands.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

/**
 * Seed everything in one shot: connect once, import generics then brands,
 * disconnect. Run with: npm run seed
 */
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    await importMedicines();
    await importBrands();

    console.log("\n🌱 Seed complete.");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
