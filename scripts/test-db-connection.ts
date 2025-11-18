// test-mongo-connection.ts
import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file explicitly
config({ path: resolve(process.cwd(), ".env.local") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in your .env.local file");
  process.exit(1);
}

// Debug: Show connection string (masked for security)
const maskedUri = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
console.log("🔍 Connection string (masked):", maskedUri.substring(0, 80) + "...");

async function testConnection() {
  try {
    console.log("🔗 Attempting MongoDB connection...");
    await mongoose.connect(MONGO_URI!, {
      dbName: "model_snap_local", // your DB name
      tls: true,
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connection successful!");
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log("Collections in DB:", collections.map(c => c.name));
    } else {
      console.log("⚠️  Database object not available");
    }
  } catch (err: any) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error message:", err.message);
    console.error("Error full:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
