import jwt from "jsonwebtoken";

/**
 * Convert a JWT-style duration string ("7d", "24h", "60m", "30s") into
 * milliseconds, so the auth cookie's maxAge matches the token's expiry.
 * Falls back to 7 days if the format isn't recognised.
 */
export function durationToMs(str) {
  const match = /^(\d+)([dhms])$/.exec(str || "");
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unitMs = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000 };
  return value * unitMs[match[2]];
}

/**
 * Sign a JWT carrying the user's id and email.
 * Expiry comes from JWT_EXPIRES_IN (defaults to 7 days).
 */
export function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Base options for the auth cookie — environment-aware. The SAME options must be
 * used to set and to clear the cookie, so both call this single helper.
 *
 * - httpOnly: JavaScript on the page can't read it (protects against XSS token theft).
 * - Production (NODE_ENV === "production"): sameSite "none" + secure true, which
 *   browsers require for a cookie sent cross-domain (Vercel frontend ↔ Render API)
 *   over HTTPS.
 * - Development: sameSite "lax" + secure false, so it works on local http where
 *   the Vite proxy makes things same-origin.
 */
export function getBaseCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
}

/** Full cookie options including maxAge, used when setting the cookie. */
export function getCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: durationToMs(process.env.JWT_EXPIRES_IN || "7d"),
  };
}
