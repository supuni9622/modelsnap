# AI Avatar Management & Fashn Integration Guide

This guide covers how to add AI model images to the marketplace (manually or via scripts), sync them to the database and S3, and how to get better results from the Fashn API (model generation and virtual try-on).

**Last updated:** February 2026

---

## Table of Contents

1. [Add model images from outside (manual flow)](#1-add-model-images-from-outside-manual-flow)
2. [Generate avatars from script and add to system (end-to-end)](#2-generate-avatars-from-script-and-add-to-system-end-to-end)
3. [Improvements you can make](#3-improvements-you-can-make)
4. [Where Fashn is used and how to get more accurate output](#4-where-fashn-is-used-and-how-to-get-more-accurate-output)

---

## 1. Add model images from outside (manual flow)

Use this when you have **existing image files** (e.g. from another tool or designer) and want them in the AI model marketplace **without** running the Fashn generation script.

### Overview

- **Files:** Images go under `public/avatars/` and are referenced in `public/avatars/avatarMap.json`.
- **Database:** MongoDB `avatars` collection is updated by `scripts/import-avatars.ts`.
- **S3/CloudFront:** Optional; use `scripts/upload-avatars-to-s3.ts` so avatars get public URLs (recommended for production and for Fashn API).

### Step 1: Place image files

Put each image in the expected folder structure:

```
public/avatars/{gender}/{bodyType}/{skinTone}.{jpg|png}
```

**Allowed values:**

| Field      | Allowed values |
|-----------|----------------|
| `gender`  | `female`, `male` |
| `bodyType` (female) | `slim`, `curvy`, `athletic`, `plus-size` |
| `bodyType` (male)   | `slim`, `athletic`, `dad-bod`, `plus-size` |
| `skinTone` | `SL-01`, `SL-02`, `SL-03`, `SL-04` (you can add e.g. `SL-05`, `SL-06` if the UI supports them) |

**Examples:**

- `public/avatars/female/slim/SL-01.jpg`
- `public/avatars/male/athletic/SL-05.png`

Use the correct extension (`.jpg` or `.png`) in the path. Do **not** remove or overwrite existing files if you want to keep current avatars.

### Step 2: Update the avatar map

Edit **`public/avatars/avatarMap.json`**.

- **Add** one entry per new image; **do not remove** existing entries if you want to keep current avatars.
- Structure: `gender` → `bodyType` → `skinTone` → **path from site root**.

**Path format:** `/avatars/{gender}/{bodyType}/{skinTone}.jpg` or `.png` (leading slash, no `public`).

For **new avatars from today**, you can optionally set framing, aspect ratio, skin tone category, and background. Use an object instead of a string: **photoFraming** `"full-body"`, `"half-body"`, `"three-quarter"`, `"upper-body"`, `"lower-body"`, or `"back-view"`; **aspectRatio** `"2:3"`, `"1:1"`, `"4:5"`, or `"16:9"` (default `"2:3"`); **skinToneCategory** `"light"`, `"medium"`, or `"deep"`; **background** `"indoor"` or `"outdoor"`. Legacy string paths still work (no extra filters).

**Example (add one new avatar):**

```json
{
  "female": {
    "slim": {
      "SL-01": "/avatars/female/slim/SL-01.jpg",
      "SL-05": "/avatars/female/slim/SL-05.png"
    }
  },
  "male": { ... }
}
```

### Step 3: Import into MongoDB

Run the import script **without** `--clear` so existing avatars are not deleted:

```bash
npx tsx scripts/import-avatars.ts
```

- New `gender` + `bodyType` + `skinTone` combinations → **new** documents in `avatars`.
- Existing combinations → only **`imageUrl`** is updated (so only change an entry if you intend to replace that image).
- **Do not** run with `--clear` unless you want to wipe all avatars and re-import from the map.

### Step 4: Upload to S3 and update database (optional but recommended for production)

If you use S3/CloudFront for avatar URLs (so Fashn and the app can load images via public URLs):

```bash
npx tsx scripts/upload-avatars-to-s3.ts
```

**Behavior:**

- Avatars whose `imageUrl` **already** starts with `http` (e.g. CloudFront) are **skipped**.
- Avatars with **relative** `imageUrl` (e.g. `/avatars/female/slim/SL-05.png`) are:
  1. Read from `public/avatars/...` (path derived from `imageUrl`).
  2. Uploaded to S3.
  3. Document updated so `imageUrl` becomes the S3/CloudFront URL.

**Prerequisites:** `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (and optionally `AWS_CLOUDFRONT_DOMAIN`) in `.env.local`.

**Summary (manual flow):**

| Step | Action | Result |
|------|--------|--------|
| 1 | Place images in `public/avatars/{gender}/{bodyType}/{skinTone}.ext` | Files on disk |
| 2 | Add entries to `public/avatars/avatarMap.json` | Map matches files |
| 3 | `npx tsx scripts/import-avatars.ts` | MongoDB has new/updated avatars (relative URLs) |
| 4 | `npx tsx scripts/upload-avatars-to-s3.ts` | New avatars get S3/CloudFront URLs in MongoDB |

You do **not** need to upload to S3 **before** the import script; run import first, then S3 upload.

---

## 2. Generate avatars from script and add to system (end-to-end)

Use this when you want to **generate** new AI model images via the Fashn API and then add them to the app (files → map → database → S3).

### Overview

1. **Generate:** Script calls Fashn “model create” API and saves images under `public/avatars/` and updates `avatarMap.json`.
2. **Import:** Sync `avatarMap.json` into MongoDB.
3. **Upload to S3:** Upload new avatars to S3 and set CloudFront/S3 URLs in MongoDB.

### Step 1: Generate avatars with Fashn

**Option A – Main script (recommended):**

```bash
npx tsx scripts/generate-avatars.ts
```

- Uses `lib/fashn.ts` → `FashnClient.generateModel()`.
- Reads config from the script: `genders`, `bodyTypes`, `skinTones`, pose, background, etc.
- Saves images to `public/avatars/{gender}/{bodyType}/{skinTone}.jpg`.
- Writes **`public/avatars/avatarMap.json`** (and a backup).
- Does **not** write to MongoDB.

**Option B – Alternative script:**

```bash
npx tsx scripts/generate-avatars-v2.ts
```

- Uses Fashn `/v1/run` and `/v1/status` directly with a different prompt builder.
- Also writes files and `avatarMap.json` under `public/avatars/`.

**Prerequisites:** `FASHN_API_KEY` in `.env.local`.  
**Note:** The script generates a fixed grid (e.g. 2 genders × 4 body types × 4 skin tones). To add more variants, extend the config in the script (e.g. new `skinTone` keys or body types) and re-run.

### Step 2: Import into MongoDB

```bash
npx tsx scripts/import-avatars.ts
```

- Reads `public/avatars/avatarMap.json`.
- Creates or updates documents in the `avatars` collection (`gender`, `bodyType`, `skinTone`, `imageUrl`).
- New combinations → new documents; existing ones → `imageUrl` updated. Use `--clear` only if you want to replace all avatars from the map.

### Step 3: Upload to S3 and update database

```bash
npx tsx scripts/upload-avatars-to-s3.ts
```

- Finds avatars with relative `imageUrl`.
- Uploads from `public/avatars/` to S3 and updates `imageUrl` to the S3/CloudFront URL.
- Avatars that already have `http` URLs are skipped.

**End-to-end summary (script flow):**

| Step | Command | Result |
|------|---------|--------|
| 1 | `npx tsx scripts/generate-avatars.ts` | Images in `public/avatars/`, `avatarMap.json` updated |
| 2 | `npx tsx scripts/import-avatars.ts` | MongoDB has all avatars (relative URLs) |
| 3 | `npx tsx scripts/upload-avatars-to-s3.ts` | All avatars with relative URLs get S3/CloudFront URLs in MongoDB |

---

## 3. Improvements you can make

- **Manual flow:** Add new body types or skin tones in the UI/filters if you use labels beyond the default set (e.g. `SL-05`, `SL-06`). Keep `avatarMap.json` and file paths in sync; run import then S3 upload so new avatars get CDN URLs.
- **Script flow:** In `scripts/generate-avatars.ts`, extend `skinTones`, `femaleBodyTypes`, or `maleBodyTypes` to generate more variants; then run import + S3 upload. Optionally add a `--dry-run` or `--only-new` to avoid re-generating existing files.
- **Validation:** Add a small script or test that checks every entry in `avatarMap.json` has a corresponding file under `public/avatars/` and that MongoDB avatars with relative URLs have that file (to catch missing files before S3 upload).
- **Try-on accuracy:** See [Section 4](#4-where-fashn-is-used-and-how-to-get-more-accurate-output) for passing `category` and `garment_photo_type` to the Fashn try-on API and for improving model-generation prompts.

---

## 4. Where Fashn is used and how to get more accurate output

Fashn is used in two different ways: **model generation** (text prompts) and **virtual try-on** (image-in, image-out; no prompt).

### 4.1 Model generation (creating AI model images) – prompts

**Used in:** `scripts/generate-avatars.ts` (and `scripts/generate-avatars-v2.ts` with its own prompt).

**Implementation:** `lib/fashn.ts` — `FashnClient.generateModel()` and private `buildPrompt()` (around lines 242–278).

**Current prompt** is built from:

- `gender`, `body_type`, `ethnicity`, `skin_tone`, `hair`, `eyes`, `pose`, `background`, optional `style`
- Plus fixed: `"fashion model"`, `"studio photography"`, `"professional lighting"`

**Ways to get more accurate or consistent AI model images:**

1. **Adjust `buildPrompt()` in `lib/fashn.ts`**
   - Clearer body/pose/lighting wording.
   - More specific “South Asian” / Sri Lankan descriptors if desired.
   - Keep terms compatible with [Fashn model-create API](https://docs.fashn.ai/api-reference/model-create).

2. **In `scripts/generate-avatars-v2.ts`**
   - Change `buildPrompt()` and the `bodyTypePrompts` / `skinTones` text to match the look you want (e.g. more natural, more editorial).

3. **In `scripts/generate-avatars.ts`**
   - Tweak the params passed to `generateModel()`: `pose`, `background`, `hair`, `skin_tone` strings (and any new fields the API supports) so the prompt reflects the desired style.

---

### 4.2 Virtual try-on (garment on model) – no prompt

**Used in:** `app/api/render/route.ts` (and batch/retry routes) when the user clicks “Generate”.

**Implementation:** `lib/fashn.ts` — `virtualTryOn()`.

**Inputs:**

- **Model:** From DB by `avatarId` (or human model’s reference image) → `model_image` URL.
- **Garment:** User upload → `garmentImageUrl` → `garment_image` URL.

No text prompt is sent; Fashn try-on is image-in, image-out.

**What you can optimize for try-on accuracy:**

1. **Image quality**
   - **Model:** High-res, front-facing, full-body (or at least upper body). Avatars from the generation scripts are already consistent; keep the same standards for any manually added images.
   - **Garment:** Flat-lay or clean product shot works best. Fashn can use a hint via `garment_photo_type`.

2. **Optional Fashn parameters** (supported in `lib/fashn.ts` but not yet passed from the render route)
   - **`category`:** `"auto" | "tops" | "bottoms" | "one-pieces"` — can improve fit. The render route currently only passes `mode: "balanced"`.
   - **`garment_photo_type`:** `"auto" | "flat-lay" | "model"` — tells Fashn how the garment image was shot.

**How to improve try-on from your code:**

1. **In `app/api/render/route.ts`** (and any other place that calls `fashnClient.virtualTryOn()`):
   - Add an optional request body field (e.g. `garmentCategory`) and pass it as **`category`** (or use `"auto"`).
   - Optionally add **`garment_photo_type`** (e.g. from user selection or default `"auto"`).

2. **In the generate form (or upload step):**
   - Add a dropdown: “Garment type: Tops / Bottoms / One-piece / Auto” and send it to **`POST /api/render`**.
   - In the render route, pass it into `virtualTryOn({ ..., category, garment_photo_type })`.

**Summary:** For try-on, only **image URLs** (model + garment) are sent; “prompts” apply only to **generating new AI model images** in the scripts. For better try-on results, use good image quality and the optional Fashn try-on params: **`category`**, **`garment_photo_type`**, and **`mode`** (already set to `"balanced"`).

---

## Related documentation

- **[INTEGRATIONS/FASHIONAI_GUIDE.md](../INTEGRATIONS/FASHIONAI_GUIDE.md)** — Fashn.ai API overview and hackathon-style flow.
- **[SETUP/ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** — `FASHN_API_KEY`, AWS, and `NEXT_PUBLIC_APP_URL`.
- **Scripts:** `scripts/generate-avatars.ts`, `scripts/import-avatars.ts`, `scripts/upload-avatars-to-s3.ts`.
