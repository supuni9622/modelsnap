/**
 * Avatar Generation Script for ModelSnapper.ai
 *
 * Generates model images using FASHN API with manual prompts.
 * Per API doc: prompt describes desired fashion model, clothing, pose, and scene;
 * aspect_ratio controls output dimensions (e.g. 2:3 portrait, 1:1 square).
 *
 * Usage: npx tsx scripts/generate-avatars.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

if (!process.env.FASHN_API_KEY) {
  console.error("❌ Error: FASHN_API_KEY is not set in .env.local");
  process.exit(1);
}

import { FashnClient } from "@/lib/fashn";
import * as fs from "fs";
import * as path from "path";

const fashnClient = new FashnClient(process.env.FASHN_API_KEY);

const outputDir = path.join(process.cwd(), "public", "avatars");
const avatarMapPath = path.join(outputDir, "avatarMap.json");

/**
 * Manual prompts for model image generation (per FASHN API doc).
 * Each prompt describes the desired fashion model, clothing, pose, and scene.
 * One image is generated per prompt. Add your prompt strings below.
 */
const MANUAL_PROMPTS: string[] = [
  // e.g. "female model, athletic build, studio lighting, fashion model, professional photography",
  // e.g. "male model, slim, neutral pose, white background, fashion model",
];

/** Aspect ratio for generated images (per API: 1:1, 2:3, 3:4, 4:5, 5:4, 4:3, 3:2, 16:9, 9:16). Default 2:3 = portrait fashion. */
const ASPECT_RATIO: "1:1" | "2:3" | "3:4" | "4:5" | "5:4" | "4:3" | "3:2" | "16:9" | "9:16" = "2:3";

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
 * Generate model images from manual prompts (per FASHN API doc).
 */
async function generateAvatars(): Promise<void> {
  if (MANUAL_PROMPTS.length === 0) {
    console.error("❌ No prompts defined. Add prompt strings to MANUAL_PROMPTS in this script.");
    console.error("   Per API doc: each prompt describes the desired fashion model, clothing, pose, and scene.");
    process.exit(1);
  }

  console.log("🚀 Starting model generation from manual prompts...");
  console.log(`   Prompts: ${MANUAL_PROMPTS.length}`);
  console.log(`   Aspect ratio: ${ASPECT_RATIO}`);
  console.log(`   Output: ${outputDir}`);
  ensureDir(outputDir);

  const manualDir = path.join(outputDir, "manual");
  ensureDir(manualDir);

  let totalGenerated = 0;

  try {
    const results = await fashnClient.generateModel({
      prompts: MANUAL_PROMPTS,
      aspect_ratio: ASPECT_RATIO,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result?.image_url) continue;
      const filePath = path.join(manualDir, `model-${i}.jpg`);
      await downloadImage(result.image_url, filePath);
      console.log(`  ✅ Saved: ${filePath}`);
      totalGenerated++;
    }

    fs.writeFileSync(
      avatarMapPath,
      JSON.stringify(
        { manual: results.map((_, i) => `/avatars/manual/model-${i}.jpg`) },
        null,
        2
      )
    );
    console.log(`\n📝 Map saved to: ${avatarMapPath}`);
  } catch (error) {
    console.error("❌ Generation failed:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Done. Generated " + totalGenerated + " model(s).");
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

