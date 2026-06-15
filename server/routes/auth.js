import { Router } from "express";

import User, { EMAIL_REGEX } from "../models/User.js";
import { signToken, getCookieOptions, baseCookieOptions } from "../utils/token.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

/**
 * Shape a User document into a safe object for API responses.
 * Crucially, this NEVER includes the password hash.
 */
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 * Creates a user, issues a JWT cookie, returns the public user.
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // ---- Manual input validation (clear messages, no validation library) ----
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // ---- Reject duplicate emails ----
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // ---- Create the user (password is hashed by the model's pre-save hook) ----
    const user = await User.create({ name, email: normalizedEmail, password });

    // ---- Issue JWT as an httpOnly cookie ----
    res.cookie("token", signToken(user), getCookieOptions());

    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    // Handle a duplicate-key race (two signups at once) and schema validation errors.
    if (err.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    if (err.name === "ValidationError") {
      const firstMessage = Object.values(err.errors)[0]?.message || "Invalid input";
      return res.status(400).json({ error: firstMessage });
    }
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * On success issues a JWT cookie. On failure returns a GENERIC 401 so we don't
 * reveal whether the email exists.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.cookie("token", signToken(user), getCookieOptions());
    return res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token", baseCookieOptions);
  return res.status(200).json({ message: "Logged out" });
});

/**
 * GET /api/auth/me  (protected)
 * Returns the currently logged-in user. The frontend calls this on load to
 * restore the session from the cookie.
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error("Auth /me error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
