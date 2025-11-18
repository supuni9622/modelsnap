/**
 * Test script to verify image download functionality
 * 
 * Usage: npx tsx scripts/test-download.ts <image_url>
 */

import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function testDownload(url: string): Promise<void> {
  console.log(`Testing download from: ${url}\n`);

  try {
    console.log("1. Fetching URL...");
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length') || 'unknown'}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("\n2. Downloading content...");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`   Downloaded: ${(buffer.length / 1024).toFixed(2)} KB`);

    if (buffer.length === 0) {
      throw new Error("Downloaded file is empty");
    }

    // Save to test file
    const testPath = resolve(process.cwd(), "public", "test-download.jpg");
    fs.writeFileSync(testPath, buffer);
    console.log(`\n3. ✅ Successfully saved to: ${testPath}`);

    // Verify file
    const stats = fs.statSync(testPath);
    console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   File exists: ${fs.existsSync(testPath)}`);

  } catch (error) {
    console.error(`\n❌ Error:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Get URL from command line
const url = process.argv[2];

if (!url) {
  console.error("Usage: npx tsx scripts/test-download.ts <image_url>");
  process.exit(1);
}

testDownload(url)
  .then(() => {
    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });

