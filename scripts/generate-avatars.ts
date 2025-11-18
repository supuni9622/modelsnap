/**
 * Avatar Generation Script for ModelSnap.ai
 * 
 * Generates 32 Sri Lankan avatars using FASHN API
 * Based on FASHIONAI_GUIDE.md specifications
 * 
 * Usage: npx tsx scripts/generate-avatars.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Verify FASHN_API_KEY is loaded
if (!process.env.FASHN_API_KEY) {
  console.error("❌ Error: FASHN_API_KEY is not set in .env.local");
  console.error("Please add FASHN_API_KEY=your_api_key to your .env.local file");
  process.exit(1);
}

console.log("✅ FASHN_API_KEY loaded:", process.env.FASHN_API_KEY ? "Yes" : "No");

import { FashnClient } from "@/lib/fashn";
import * as fs from "fs";
import * as path from "path";

// Create client instance with the loaded API key (explicitly pass it)
const fashnClient = new FashnClient(process.env.FASHN_API_KEY);

const outputDir = path.join(process.cwd(), "public", "avatars");
const avatarMapPath = path.join(outputDir, "avatarMap.json");

// Avatar configuration
const genders = ["female", "male"] as const;
const femaleBodyTypes = ["slim", "curvy", "athletic", "plus-size"] as const;
const maleBodyTypes = ["slim", "athletic", "dad-bod", "plus-size"] as const;
const skinTones = {
  "SL-01": "medium brown, warm undertone",
  "SL-02": "medium-deep brown, golden undertone",
  "SL-03": "deep tan, warm undertone",
  "SL-04": "deep brown, neutral undertone",
} as const;

const pose = "standing front, neutral expression";
const background = "studio white";
const resolution = 1024;

interface AvatarMap {
  [gender: string]: {
    [bodyType: string]: {
      [skinTone: string]: string;
    };
  };
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Download image from URL and save to file
 * Retries up to 3 times with exponential backoff
 */
async function downloadImage(url: string, filePath: string, retries = 3): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Downloading (attempt ${attempt}/${retries}): ${url.substring(0, 80)}...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.warn(`  Warning: Unexpected content type: ${contentType}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length === 0) {
        throw new Error("Downloaded file is empty");
      }
      
      fs.writeFileSync(filePath, buffer);
      console.log(`  ✅ Saved: ${filePath} (${(buffer.length / 1024).toFixed(2)} KB)`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.warn(`  ⚠️  Download attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`  Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to download after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Generate all avatars
 */
async function generateAvatars(): Promise<void> {
  console.log("🚀 Starting avatar generation...");
  console.log(`Output directory: ${outputDir}`);
  
  // Ensure output directory exists
  ensureDir(outputDir);
  
  const avatarMap: AvatarMap = {};
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const gender of genders) {
    const bodyTypes = gender === "female" ? femaleBodyTypes : maleBodyTypes;
    avatarMap[gender] = {};

    for (const bodyType of bodyTypes) {
      avatarMap[gender][bodyType] = {};

      for (const [toneLabel, toneValue] of Object.entries(skinTones)) {
        const avatarKey = `${gender}_${bodyType}_${toneLabel}`;
        console.log(`\n📸 Generating: ${avatarKey}...`);

        try {
          // Generate model using FASHN API
          console.log(`  Calling FASHN API...`);
          const response = await fashnClient.generateModel({
            gender,
            ethnicity: "South Asian",
            body_type: bodyType,
            skin_tone: toneValue,
            hair: gender === "female" ? "black straight hair" : "black short hair",
            eyes: "dark brown",
            pose,
            background,
            resolution,
          });

          if (!response.image_url) {
            throw new Error("No image_url in response");
          }

          console.log(`  ✅ Got image URL: ${response.image_url.substring(0, 80)}...`);

          // Create directory structure
          const saveDir = path.join(outputDir, gender, bodyType);
          ensureDir(saveDir);

          // Save image
          const filePath = path.join(saveDir, `${toneLabel}.jpg`);
          await downloadImage(response.image_url, filePath);

          // Verify file was saved
          if (!fs.existsSync(filePath)) {
            throw new Error(`File was not saved: ${filePath}`);
          }

          const stats = fs.statSync(filePath);
          if (stats.size === 0) {
            throw new Error(`Saved file is empty: ${filePath}`);
          }

          // Store in map (relative path from public)
          avatarMap[gender][bodyType][toneLabel] = `/avatars/${gender}/${bodyType}/${toneLabel}.jpg`;

          totalGenerated++;
          console.log(`✅ Generated and saved: ${avatarKey}`);
        } catch (error) {
          totalFailed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to generate ${avatarKey}:`, errorMessage);
          
          // Save the error info to a log file for debugging
          const errorLogPath = path.join(outputDir, "errors.json");
          let errorLog: Array<{ avatarKey: string; error: string; timestamp: string }> = [];
          if (fs.existsSync(errorLogPath)) {
            try {
              errorLog = JSON.parse(fs.readFileSync(errorLogPath, "utf-8"));
            } catch {
              errorLog = [];
            }
          }
          errorLog.push({
            avatarKey,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
          fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
          
          // Continue with next avatar
        }

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Save avatar map (even if some failed)
  fs.writeFileSync(avatarMapPath, JSON.stringify(avatarMap, null, 2));
  console.log(`\n📝 Avatar map saved to: ${avatarMapPath}`);
  
  // Also save a backup with URLs for recovery
  const urlBackupPath = path.join(outputDir, "urls-backup.json");
  fs.writeFileSync(urlBackupPath, JSON.stringify(avatarMap, null, 2));
  console.log(`📝 URL backup saved to: ${urlBackupPath}`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Avatar generation complete!");
  console.log(`   Generated: ${totalGenerated} avatars`);
  console.log(`   Failed: ${totalFailed} avatars`);
  console.log(`   Total expected: ${genders.length * 4 * Object.keys(skinTones).length} avatars`);
  console.log("=".repeat(50));
}

// Run if executed directly
if (require.main === module) {
  generateAvatars()
    .then(() => {
      console.log("\n🎉 All done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { generateAvatars };

