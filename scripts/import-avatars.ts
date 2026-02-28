/**
 * Import Avatars Script for ModelSnapper.ai
 * 
 * Imports avatars from avatarMap.json into MongoDB
 * 
 * Usage: npx tsx scripts/import-avatars.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

import { connectDB, disconnectDB } from "@/lib/db";
import Avatar from "@/models/avatar";
import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

const avatarMapPath = path.join(process.cwd(), "public", "avatars", "avatarMap.json");

/** Aspect ratio options: 2:3 Portrait, 1:1 Square, 4:5 Vertical, 16:9 Landscape. Default "2:3". */
const DEFAULT_ASPECT_RATIO = "2:3" as const;
type AspectRatio = "2:3" | "1:1" | "4:5" | "16:9";

/** Framing: Full Body, Three-Quarter, Upper Body, Lower Body, Back View */
type Framing = "full-body" | "half-body" | "three-quarter" | "upper-body" | "lower-body" | "back-view";
type SkinToneCategory = "light" | "medium" | "deep";
type Background = "indoor" | "outdoor";

/** Value can be legacy path string or new format with optional photoFraming, aspectRatio, skinToneCategory, background */
type AvatarMapEntry = string | {
  url: string;
  photoFraming?: Framing;
  aspectRatio?: AspectRatio;
  skinToneCategory?: SkinToneCategory;
  background?: Background;
};

interface AvatarMap {
  [gender: string]: {
    [bodyType: string]: {
      [skinTone: string]: AvatarMapEntry;
    };
  };
}

function normalizeEntry(entry: AvatarMapEntry): {
  imageUrl: string;
  photoFraming?: Framing;
  aspectRatio?: AspectRatio;
  skinToneCategory?: SkinToneCategory;
  background?: Background;
} {
  if (typeof entry === "string") {
    return { imageUrl: entry };
  }
  return {
    imageUrl: entry.url,
    ...(entry.photoFraming && { photoFraming: entry.photoFraming }),
    aspectRatio: entry.aspectRatio ?? DEFAULT_ASPECT_RATIO,
    ...(entry.skinToneCategory && { skinToneCategory: entry.skinToneCategory }),
    ...(entry.background && { background: entry.background }),
  };
}

async function importAvatars(clearExisting = false): Promise<void> {
  console.log("🚀 Starting avatar import...");
  console.log(`Reading from: ${avatarMapPath}`);

  // Check if avatarMap.json exists
  if (!fs.existsSync(avatarMapPath)) {
    console.error(`❌ Error: avatarMap.json not found at ${avatarMapPath}`);
    console.error("Please run the avatar generation script first.");
    process.exit(1);
  }

  // Read avatarMap.json
  const avatarMapContent = fs.readFileSync(avatarMapPath, "utf-8");
  const avatarMap: AvatarMap = JSON.parse(avatarMapContent);

  // Connect to database
  try {
    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Connected to database");
    
    // Clear existing avatars if requested
    if (clearExisting) {
      const deletedCount = await Avatar.deleteMany({});
      console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing avatars`);
    }
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    console.error("\n💡 Troubleshooting tips:");
    console.error("   1. Check if MONGO_URI is set in .env.local");
    console.error("   2. Verify your IP address is whitelisted in MongoDB Atlas");
    console.error("   3. Check your internet connection");
    console.error("   4. Verify the MongoDB connection string is correct");
    throw error;
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Iterate through the avatar map
  for (const [gender, bodyTypes] of Object.entries(avatarMap)) {
    if (gender !== "male" && gender !== "female") {
      console.warn(`⚠️  Skipping invalid gender: ${gender}`);
      continue;
    }

    for (const [bodyType, skinTones] of Object.entries(bodyTypes)) {
      for (const [skinTone, entry] of Object.entries(skinTones)) {
        try {
          const { imageUrl, photoFraming, aspectRatio, skinToneCategory, background } = normalizeEntry(entry);
          // Check if avatar already exists (by unique combination)
          const existing = await Avatar.findOne({
            gender,
            bodyType,
            skinTone,
          });

          if (existing) {
            // Update existing avatar
            existing.imageUrl = imageUrl;
            if (photoFraming) (existing as any).photoFraming = photoFraming;
            if (aspectRatio) (existing as any).aspectRatio = aspectRatio;
            if (skinToneCategory) (existing as any).skinToneCategory = skinToneCategory;
            if (background) (existing as any).background = background;
            await existing.save();
            updated++;
            console.log(`  ↻ Updated: ${gender}/${bodyType}/${skinTone}`);
          } else {
            // Create new avatar with explicit unique ID
            const createPayload: Record<string, unknown> = {
              id: new mongoose.Types.ObjectId().toString(),
              gender,
              bodyType,
              skinTone,
              imageUrl,
            };
            if (photoFraming) createPayload.photoFraming = photoFraming;
            if (aspectRatio) createPayload.aspectRatio = aspectRatio;
            if (skinToneCategory) createPayload.skinToneCategory = skinToneCategory;
            if (background) createPayload.background = background;
            await Avatar.create(createPayload);
            imported++;
            console.log(`  ✓ Imported: ${gender}/${bodyType}/${skinTone}`);
          }
        } catch (error) {
          errors++;
          console.error(`  ✗ Error importing ${gender}/${bodyType}/${skinTone}:`, error);
        }
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Avatar import complete!");
  console.log(`   Imported: ${imported} avatars`);
  console.log(`   Updated: ${updated} avatars`);
  console.log(`   Skipped: ${skipped} avatars`);
  console.log(`   Errors: ${errors} avatars`);
  console.log("=".repeat(50));

  // Verify total count
  const totalInDB = await Avatar.countDocuments();
  console.log(`\n📊 Total avatars in database: ${totalInDB}`);
  
  // Disconnect from database
  try {
    await disconnectDB();
    console.log("🔌 Disconnected from database");
  } catch (error) {
    console.warn("⚠️  Error disconnecting from database:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  // Check for --clear flag to clear existing avatars first
  const clearExisting = process.argv.includes("--clear");
  if (clearExisting) {
    console.log("⚠️  --clear flag detected: Will delete all existing avatars before import\n");
  }
  
  importAvatars(clearExisting)
    .then(async () => {
      console.log("\n🎉 All done!");
      // Ensure we disconnect even if there was an error
      try {
        await disconnectDB();
      } catch {
        // Ignore disconnect errors on exit
      }
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("\n💥 Fatal error:", error);
      console.error("\nError details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Ensure we disconnect on error
      try {
        await disconnectDB();
      } catch {
        // Ignore disconnect errors on exit
      }
      process.exit(1);
    });
}

export { importAvatars };

