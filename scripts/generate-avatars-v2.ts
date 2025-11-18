import fs from "fs";
import path from "path";
import axios from "axios";
import { config } from "dotenv";

// Load .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.FASHN_API_KEY; // Correct variable name
if (!API_KEY) {
  console.error("❌ Error: FASHN_API_KEY is not set in .env.local");
  process.exit(1);
}

const RUN_URL = "https://api.fashn.ai/v1/run";
const STATUS_URL = "https://api.fashn.ai/v1/status";

const genders = ["female", "male"] as const;
const femaleBodyTypes = ["slim", "curvy", "athletic", "plus-size"] as const;
const maleBodyTypes = ["slim", "athletic", "dad-bod", "plus-size"] as const;

const bodyTypePrompts: Record<string, string> = {
  slim: "lean figure, graceful lines, elegant posture",
  curvy: "hourglass curves, soft silhouette, confident stance",
  athletic: "toned physique, defined muscle lines, strong balanced posture",
  "plus-size": "fuller figure, soft curves, confident pose",
  "dad-bod": "natural masculine build, soft midsection, relaxed proportions",
};

const skinTones = {
  "SL-01": "fair skin with cool undertone, soft natural texture",
  "SL-02": "medium-light skin with neutral undertone, smooth complexion",
  "SL-03": "medium brown skin with warm undertone, radiant glow",
  "SL-04": "deep rich skin tone with warm undertone, even smooth texture",
} as const;

const pose =
  "standing front, symmetrical pose, neutral relaxed expression, natural arm position";
const background =
  "studio white seamless backdrop, commercial fashion lighting, soft shadows";
const aspect_ratio = "3:4";

function buildPrompt(gender: string, body: string, skin: string) {
  const genderPrompt =
    gender === "female"
      ? "beautiful female model, photogenic face, soft natural makeup, smooth skin, expressive eyes, elegant presence"
      : "handsome male model, strong jawline, neat hairstyle, photogenic features, balanced masculine proportions";

  return `
${genderPrompt},
${bodyTypePrompts[body]},
${skin},
${pose},
${background},
ultra-realistic fashion photography, 4K quality, crisp details, commercial catalog style
`.trim();
}

async function pollStatus(predictionId: string) {
  const maxRetries = 60;
  for (let i = 0; i < maxRetries; i++) {
    const res = await axios.get(`${STATUS_URL}/${predictionId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const data = res.data;

    if (data.status === "completed" && data.output?.length > 0) {
      return data.output[0]; // image URL
    }

    if (data.status === "failed") {
      throw new Error(`Generation failed: ${JSON.stringify(data)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Polling timed out");
}

async function generateAll() {
  const avatarMap: Record<string, any> = {};

  for (const gender of genders) {
    avatarMap[gender] = {};
    const bodyTypes = gender === "female" ? femaleBodyTypes : maleBodyTypes;

    for (const bodyType of bodyTypes) {
      avatarMap[gender][bodyType] = {};

      for (const toneLabel of Object.keys(skinTones)) {
        console.log(`🔄 Generating ${gender} / ${bodyType} / ${toneLabel}...`);

        const prompt = buildPrompt(gender, bodyType, skinTones[toneLabel as keyof typeof skinTones]);

        try {
          // Start run
          const runRes = await axios.post(
            RUN_URL,
            {
              model_name: "model-create",
              inputs: { prompt, aspect_ratio, output_format: "jpeg" },
            },
            {
              headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            }
          );

          const predictionId = runRes.data.id;
          if (!predictionId) throw new Error("No prediction ID returned");

          // Poll for completion
          const imageUrl = await pollStatus(predictionId);

          // Download image
          const outputDir = path.join(process.cwd(), "public", "avatars", gender, bodyType);
          fs.mkdirSync(outputDir, { recursive: true });
          const imgPath = path.join(outputDir, `${toneLabel}.jpg`);

          const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
          fs.writeFileSync(imgPath, imgRes.data);

          avatarMap[gender][bodyType][toneLabel] = `/avatars/${gender}/${bodyType}/${toneLabel}.jpg`;

          console.log(`✅ Saved → ${imgPath}`);
        } catch (err: any) {
          console.error(`❌ Error generating ${gender}/${bodyType}/${toneLabel}`);
          console.error(err.response?.data || err.message);
        }
      }
    }
  }

  // Save avatarMap.json
  const mapPath = path.join(process.cwd(), "public", "avatars", "avatarMap.json");
  fs.writeFileSync(mapPath, JSON.stringify(avatarMap, null, 2));

  console.log(`🎉 avatarMap.json generated at ${mapPath}`);
}

generateAll();
