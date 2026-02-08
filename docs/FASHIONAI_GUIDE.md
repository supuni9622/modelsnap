# FashnAI Documentation - ModelSnapper.ai Hackathon Guide

## Introduction
Your hackathon timeframe is **2–3 days**.  

FASHN - *Create realistic images of your clothes, worn by anyone* literally has:

```
http
POST /api/v1/virtual-try-on
{
  "garment_image": <file>,
  "model_image": <file or avatar>
}
```
No prompt design

No masking

No rejection loops

No tuning

⚡ Recommended MVP Flow Using FASHN
User uploads clothing photo

User selects model (Sri Lankan preset avatars)

Call FashnAI Try-On API

h
Copy code
POST /api/v1/virtual-try-on
{
  "garment_image": "<uploaded clothing>",
  "model_image": "<selected avatar>"
}
Show watermarked preview + download button + purchase flow

Done.

This is 95% less engineering than other options.

How to Create Male + Female AI Avatar Galleries
Do not generate one giant gallery manually.
Generate programmatically with templates + a few API calls + a naming system.
FashnAI provides pose-controlled and appearance-controlled endpoints, so you can mass-generate avatars with consistent poses, lighting, angle, and style.

✅ Fastest MVP Method: Auto-Generate Avatar Gallery
1. Pick Avatar Blueprints (Male + Female)
MVP Base Avatars:

Male

Slim – Neutral pose

Athletic – Neutral pose

Plus-size – Neutral pose

Female

Slim – Neutral pose

Curvy – Neutral pose

Plus-size – Neutral pose

Optional later: skin tone variety, age variety

2. Generate Base Models Using FashnAI "Model Generation" API
http
Copy code
POST /v1/model/generate
{
  "gender": "female",
  "ethnicity": "South Asian",
  "body_type": "curvy",
  "style": "studio portrait, white background",
  "poses": ["front"], 
  "resolution": "1024"
}
Returns a consistent avatar identity.

3. Use Pose-Controlled Try-On API to Generate Multiple Poses
h
Copy code
POST /v1/model/pose
{
  "model_id": "abc123",
  "pose_type": "standing-front-hands-down",
  "background": "studio"
}
Repeat for 4–6 poses: front, 3/4, side, close-up upper body, full body

Stores automatic photo gallery per avatar

4. Store Images → Avatar Gallery
Folder structure example:

markdown
Copy code
avatars/
   male/
      model1/
         front.jpg
         side.jpg
         full.jpg
      model2/
   female/
      model1/
      model2/
No UI uploads

No manual photos

No stable diffusion training

5. Try-On Step → Replace Clothing Using API
http
Copy code
POST /v1/tryon
{
  "model_id": "female_curvy_01",
  "model_image": "front",
  "garment_image": "<your product URL>",
  "prompt": "photo-realistic fit, natural shadows"
}
No custom diffusion model needed

Handles masking, draping, edge blending, lighting correction, pose matching

🧠 Additional Optimizations
Gallery resolution: 1024px

Try-on resolution: 768px → faster & cheaper

MVP: 8 avatars (4 male, 4 female)

Users can filter by gender, body type, skin tone, pose

Sri Lankan Skin Tone Guidelines
Not all Sri Lankans have same skin tone → reflect diversity

Standardize 4–6 tones for consistent API output

Skin Palette (MVP):

Label	Description
SL-01	Medium brown, warm undertone
SL-02	Medium-deep brown, golden undertone
SL-03	Deep tan, warm undertone
SL-04	Deep brown, neutral undertone
SL-05	Dark brown, warm undertone
SL-06	Very deep brown, neutral undertone

Example Model Generation Prompt:

json
Copy code
POST /v1/model/generate
{
  "gender": "female",
  "ethnicity": "South Asian",
  "skin_tone": "deep tan, warm undertone",
  "body_type": "curvy",
  "hair": "black straight hair",
  "pose": "standing front, neutral expression",
  "background": "studio white",
  "resolution": "1024"
}
Sri Lankan MVP Avatars
Female Body Types: slim, curvy, athletic, plus-size
Male Body Types: slim, athletic, dad-bod, plus-size

Each in 4 skin tones → 32 total avatars

Store in backend (MongoDB + S3/Firebase)

Use avatarMap.json for frontend gallery mapping

Frontend Usage:

Dropdowns: gender → body type → skin tone

Select avatar + clothing → call Try-On API

Render final product instantly

✅ Node.js Script Example
javascript
Copy code
// Generate Sri Lankan Avatar Gallery using FashnAI API
import axios from "axios";
import fs from "fs";
import path from "path";

const outputDir = "./avatars";
const apiKey = process.env.FASHN_API_KEY;
const genders = ["female","male"];
const femaleBodyTypes = ["slim","curvy","athletic","plus-size"];
const maleBodyTypes = ["slim","athletic","dad-bod","plus-size"];
const skinTones = {
  "SL-01":"medium brown, warm undertone",
  "SL-02":"medium-deep brown, golden undertone",
  "SL-03":"deep tan, warm undertone",
  "SL-04":"deep brown, neutral undertone"
};
const pose = "standing front, neutral expression";
const background = "studio white";
const resolution = 1024;
const avatarMap = {};

const ensureDir = dirPath => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const generateAvatars = async () => {
  for (const gender of genders) {
    const bodyTypes = gender==="female"?femaleBodyTypes:maleBodyTypes;
    avatarMap[gender] = {};
    for (const bodyType of bodyTypes) {
      avatarMap[gender][bodyType] = {};
      for (const [toneLabel, toneValue] of Object.entries(skinTones)) {
        console.log(`Generating ${gender} | ${bodyType} | ${toneLabel} ...`);
        try {
          const response = await axios.post(
            "https://api.fashn.ai/v1/model/generate",
            {
              gender,
              ethnicity:"South Asian",
              skin_tone:toneValue,
              body_type:bodyType,
              hair:gender==="female"?"black straight hair":"black short hair",
              eyes:"dark brown",
              pose,
              background,
              resolution
            },
            { headers: { Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" } }
          );
          const avatarUrl = response.data.image_url;
          const saveDir = path.join(outputDir, gender, bodyType);
          ensureDir(saveDir);
          const filePath = path.join(saveDir, `${toneLabel}.jpg`);
          const imgResp = await axios.get(avatarUrl,{responseType:"arraybuffer"});
          fs.writeFileSync(filePath,imgResp.data);
          avatarMap[gender][bodyType][toneLabel] = filePath;
          console.log(`Saved ${filePath}`);
        } catch(err){ console.error(err.response?.data||err.message); }
      }
    }
  }
  fs.writeFileSync(path.join(outputDir,"avatarMap.json"), JSON.stringify(avatarMap,null,2));
  console.log("✅ Avatar generation complete! Mapping saved to avatarMap.json");
};

generateAvatars();
✅ Summary
Loops through genders → body types → skin tones

Calls /model/generate for each combination

Stores images in avatars/{gender}/{bodyType}/{tone}.jpg

Generates 32 MVP avatars quickly

avatarMap.json used in frontend

Try-On API generates final clothing renders

Next Steps for MVP
Hook avatarMap.json into frontend gallery (dropdowns: gender → body type → skin tone)

User selects avatar + clothing → call Try-On API

Render final product instantly

Optionally add pose variants later (front/side/back)