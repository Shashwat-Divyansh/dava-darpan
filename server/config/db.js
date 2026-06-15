import mongoose from "mongoose";

/**
 * Connect to MongoDB using the connection string in MONGO_URI.
 *
 * We keep the connection logic in its own module so server.js stays focused on
 * wiring up Express.
 *
 * Note: a failed connection is logged but does NOT crash the server. The API
 * still boots and the /api/health endpoint will report the database as
 * "disconnected". This makes the app easier to run and demo even before MongoDB
 * is up. (Feature routes added in later phases will return clear errors if the
 * database is unavailable.)
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("⚠️  MONGO_URI is not set. Add it to server/.env — running without a database.");
    return;
  }

  try {
    // serverSelectionTimeoutMS keeps startup snappy: if MongoDB isn't reachable
    // we find out in ~5s instead of the default 30s.
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB connection failed: ${error.message}`);
    console.warn("   The API will still run, but database features won't work until MongoDB is available.");
  }
}
