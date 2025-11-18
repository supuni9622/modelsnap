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
 */
export const GET = withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const gender = searchParams.get("gender");
    const bodyType = searchParams.get("bodyType");
    const skinTone = searchParams.get("skinTone");

    // Build query
    const query: {
      gender?: string;
      bodyType?: string;
      skinTone?: string;
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

