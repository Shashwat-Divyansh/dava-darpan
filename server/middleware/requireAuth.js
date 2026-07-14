import jwt from "jsonwebtoken";

/**
 * Auth guard middleware.
 *
 * Accepts the JWT from either place, in this order:
 *  1. "Authorization: Bearer <token>" header — the primary path. Works
 *     cross-domain (Vercel frontend ↔ Render API), where browsers block
 *     third-party cookies.
 *  2. The "token" httpOnly cookie — fallback so local/cookie sessions keep
 *     working unchanged.
 *
 * The token itself is identical either way (same signing, secret, expiry).
 * On success attaches req.user = { id, email }; otherwise responds 401.
 */
export function requireAuth(req, res, next) {
  let token = null;

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  }
  if (!token) {
    token = req.cookies?.token || null;
  }

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
