/**
 * Upload Avatars to S3 Script
 * 
 * Uploads all avatar images from /public/avatars to S3 and updates the database
 * with the S3 URLs. This makes avatars publicly accessible for FASHN API.
 * 
 * Usage: npx tsx scripts/upload-avatars-to-s3.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import * as path from "path";

// Load .env.local file
config({ path: path.resolve(process.cwd(), ".env.local") });

import { connectDB } from "@/lib/db";
import Avatar from "@/models/avatar";
import { generateS3Key, getS3PublicUrl } from "@/lib/s3";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import * as fs from "fs";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "upload-avatars-s3" });

const avatarsDir = path.join(process.cwd(), "public", "avatars");

/**
 * Upload a single avatar image to S3
 * Uses environment variables directly (loaded from .env.local)
 */
async function uploadAvatarToS3(
  filePath: string,
  gender: string,
  bodyType: string,
  skinTone: string,
  s3Config: {
    bucketName: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  
  // Generate S3 key for avatar (using "system" as userId for system avatars)
  const s3Key = generateS3Key("avatar", "system", `${gender}/${bodyType}/${filename}`);
  
  // Create S3 client with provided credentials
  const s3Client = new S3Client({
    region: s3Config.region || "us-east-1",
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });
  
  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: "image/jpeg",
    CacheControl: "public, max-age=31536000, immutable",
  });
  
  await s3Client.send(command);
  
  // Generate public URL using the bucket name from config
  const publicUrl = getS3PublicUrlFromConfig(s3Key, s3Config.bucketName, s3Config.region);
  
  logger.debug("Uploaded avatar to S3", { s3Key, publicUrl });
  
  return publicUrl;
}

/**
 * Generate S3 public URL from config (bypasses module-level constants)
 */
function getS3PublicUrlFromConfig(key: string, bucketName: string, region: string): string {
  // Use CloudFront CDN URL if configured
  if (process.env.AWS_CLOUDFRONT_DOMAIN) {
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    return `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${cleanKey}`;
  }
  
  // Otherwise use S3 public URL
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
}

/**
 * Upload all avatars to S3 and update database
 */
async function uploadAvatarsToS3(): Promise<void> {
  console.log("🚀 Starting avatar upload to S3...");
  
  // Check S3 configuration directly (lib/s3.ts reads env vars at module load time,
  // so we check directly here after dotenv has loaded)
  const s3BucketName = process.env.AWS_S3_BUCKET_NAME || "";
  const s3AccessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const s3SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const s3Region = process.env.AWS_REGION || "us-east-1";
  
  const isConfigured = !!(s3BucketName && s3AccessKeyId && s3SecretAccessKey && s3Region);
  
  // Debug: Check environment variables
  console.log("\n📋 Environment variables check:");
  console.log(`   AWS_S3_BUCKET_NAME: ${s3BucketName ? "✓ Set" : "✗ Missing"}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${s3AccessKeyId ? "✓ Set" : "✗ Missing"}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${s3SecretAccessKey ? "✓ Set" : "✗ Missing"}`);
  console.log(`   AWS_REGION: ${s3Region ? `✓ Set (${s3Region})` : "✗ Missing"}`);
  console.log("");
  
  if (!isConfigured) {
    console.error("❌ S3 is not configured. Please set AWS environment variables:");
    console.error("   - AWS_S3_BUCKET_NAME");
    console.error("   - AWS_ACCESS_KEY_ID");
    console.error("   - AWS_SECRET_ACCESS_KEY");
    console.error("   - AWS_REGION");
    console.error("\n💡 Make sure these are set in your .env.local file");
    process.exit(1);
  }
  
  console.log("✅ S3 configuration verified");
  
  // Store S3 config to pass to upload function
  const s3Config = {
    bucketName: s3BucketName,
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
    region: s3Region,
  };
  
  await connectDB();
  console.log("✅ Connected to database");
  
  // Get all avatars from database
  const avatars = await Avatar.find({});
  console.log(`📊 Found ${avatars.length} avatars in database`);
  
  let uploaded = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const avatar of avatars) {
    try {
      // Check if avatar already has S3 URL
      if (avatar.imageUrl && avatar.imageUrl.startsWith("http")) {
        console.log(`  ⏭️  Skipping ${avatar.gender}/${avatar.bodyType}/${avatar.skinTone} (already has S3 URL)`);
        skipped++;
        continue;
      }
      
      // Construct local file path
      const relativePath = avatar.imageUrl.startsWith("/") 
        ? avatar.imageUrl.substring(1) 
        : avatar.imageUrl;
      const filePath = path.join(process.cwd(), "public", relativePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  File not found: ${filePath}`);
        errors++;
        continue;
      }
      
      // Upload to S3
      console.log(`  📤 Uploading ${avatar.gender}/${avatar.bodyType}/${avatar.skinTone}...`);
      const s3Url = await uploadAvatarToS3(
        filePath,
        avatar.gender,
        avatar.bodyType,
        avatar.skinTone,
        s3Config
      );
      
      // Update database with S3 URL
      avatar.imageUrl = s3Url;
      await avatar.save();
      
      uploaded++;
      updated++;
      console.log(`  ✅ Uploaded and updated: ${s3Url.substring(0, 80)}...`);
      
    } catch (error) {
      errors++;
      console.error(`  ❌ Error uploading ${avatar.gender}/${avatar.bodyType}/${avatar.skinTone}:`, error);
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Avatar upload to S3 complete!");
  console.log(`   Uploaded: ${uploaded} avatars`);
  console.log(`   Updated: ${updated} avatars`);
  console.log(`   Skipped: ${skipped} avatars (already have S3 URLs)`);
  console.log(`   Errors: ${errors} avatars`);
  console.log("=".repeat(50));
  
  // Verify
  const avatarsWithS3 = await Avatar.countDocuments({
    imageUrl: { $regex: /^https?:\/\// }
  });
  console.log(`\n📊 Avatars with S3 URLs: ${avatarsWithS3}/${avatars.length}`);
  
  // Disconnect
  try {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

// Run if called directly
if (require.main === module) {
  uploadAvatarsToS3()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { uploadAvatarsToS3 };

