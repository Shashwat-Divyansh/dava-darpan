import jwt from "jsonwebtoken";

/**
 * Auth guard middleware.
 *
 * Reads the "token" httpOnly cookie, verifies it with JWT_SECRET, and attaches
 * the decoded user (id, email) to req.user so downstream handlers know who is
 * making the request. Returns 401 if the token is missing, invalid, or expired.
 *
 * Use on any protected route, e.g. router.get("/me", requireAuth, handler).
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.token;

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
