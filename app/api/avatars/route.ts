import { connectDB } from "@/lib/db";
import Avatar from "@/models/avatar";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/avatars
 * Fetch available avatars with optional filtering
 * 
 * Query parameters:
 * - gender: "male" | "female"
 * - bodyType: body type string
 * - skinTone: skin tone label (SL-01, SL-02, etc.)
 * - photoFraming: full-body | half-body | three-quarter | upper-body | lower-body | back-view
 * - aspectRatio: "2:3" | "1:1" | "4:5" | "16:9"
 * - skinToneCategory: "light" | "medium" | "deep"
 * - background: "indoor" | "outdoor"
 */
const ASPECT_RATIOS = ["2:3", "1:1", "4:5", "16:9"] as const;
const FRAMING_VALUES = ["full-body", "half-body", "three-quarter", "upper-body", "lower-body", "back-view"] as const;
const SKIN_TONE_CATEGORIES = ["light", "medium", "deep"] as const;
const BACKGROUND_VALUES = ["indoor", "outdoor"] as const;

export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const gender = searchParams.get("gender");
    const bodyType = searchParams.get("bodyType");
    const skinTone = searchParams.get("skinTone");
    const photoFraming = searchParams.get("photoFraming");
    const aspectRatio = searchParams.get("aspectRatio");
    const skinToneCategory = searchParams.get("skinToneCategory");
    const background = searchParams.get("background");

    // Build query
    const query: {
      gender?: string;
      bodyType?: string;
      skinTone?: string;
      photoFraming?: string;
      aspectRatio?: string;
      skinToneCategory?: string;
      background?: string;
    } = {};

    if (gender && (gender === "male" || gender === "female")) {
      query.gender = gender;
    }

    if (bodyType) {
      query.bodyType = bodyType;
    }

    if (skinTone) {
      query.skinTone = skinTone;
    }

    if (photoFraming && FRAMING_VALUES.includes(photoFraming as any)) {
      query.photoFraming = photoFraming;
    }

    if (aspectRatio && ASPECT_RATIOS.includes(aspectRatio as any)) {
      query.aspectRatio = aspectRatio;
    }

    if (skinToneCategory && SKIN_TONE_CATEGORIES.includes(skinToneCategory as any)) {
      query.skinToneCategory = skinToneCategory;
    }

    if (background && BACKGROUND_VALUES.includes(background as any)) {
      query.background = background;
    }

    // Fetch avatars
    const avatars = await Avatar.find(query).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        status: "success",
        data: avatars,
        count: avatars.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching avatars:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch avatars",
        code: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
});

