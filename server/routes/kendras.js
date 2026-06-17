import { Router } from "express";

import Kendra from "../models/Kendra.js";

const router = Router();

// Public routes — guests can use the kendra finder without an account.
const RESULT_CAP = 100; // keep payloads reasonable for broad searches

/** Shape a kendra document for the API response. */
function publicKendra(k) {
  return {
    kendraCode: k.kendraCode,
    name: k.name,
    district: k.district,
    state: k.state,
    pinCode: k.pinCode,
    address: k.address,
  };
}

/**
 * GET /api/kendras/search?pin=XXXXXX
 * GET /api/kendras/search?state=...&district=...   (district optional)
 * If a pin is given it takes priority; otherwise search by state (+district).
 */
router.get("/search", async (req, res) => {
  try {
    const pin = (req.query.pin || "").trim();
    const state = (req.query.state || "").trim();
    const district = (req.query.district || "").trim();

    let query;
    if (pin) {
      query = { pinCode: pin };
    } else if (state) {
      query = { state };
      if (district) query.district = district;
    } else {
      return res.status(400).json({ error: "Provide a PIN code, or a state (with optional district)." });
    }

    const [kendras, total] = await Promise.all([
      Kendra.find(query).limit(RESULT_CAP).lean(),
      Kendra.countDocuments(query),
    ]);

    res.json({
      count: kendras.length,
      total,
      capped: total > RESULT_CAP, // true if more exist than we returned
      kendras: kendras.map(publicKendra),
    });
  } catch (err) {
    console.error("kendra search error:", err);
    res.status(500).json({ error: "Kendra search failed" });
  }
});

/**
 * GET /api/kendras/states — distinct list of states (for the dropdown).
 */
router.get("/states", async (req, res) => {
  try {
    const states = await Kendra.distinct("state");
    res.json({ states: states.filter(Boolean).sort() });
  } catch (err) {
    console.error("kendra states error:", err);
    res.status(500).json({ error: "Failed to load states" });
  }
});

/**
 * GET /api/kendras/districts?state=... — distinct districts in a state.
 */
router.get("/districts", async (req, res) => {
  try {
    const state = (req.query.state || "").trim();
    if (!state) return res.status(400).json({ error: "state is required" });

    const districts = await Kendra.distinct("district", { state });
    res.json({ districts: districts.filter(Boolean).sort() });
  } catch (err) {
    console.error("kendra districts error:", err);
    res.status(500).json({ error: "Failed to load districts" });
  }
});

export default router;
