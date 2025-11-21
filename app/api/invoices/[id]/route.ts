import { connectDB } from "@/lib/db";
import Invoice from "@/models/invoice";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * GET /api/invoices/[id]
 * Get a specific invoice by ID
 * Requires authentication
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.PUBLIC)(async (req: NextRequest) => {
    try {
      await connectDB();

      const { id } = await params;

      // Get authenticated user
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          {
            status: "error",
            message: "Unauthorized",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      // Get user
      const user = await User.findOne({ id: userId });
      if (!user) {
        return NextResponse.json(
          {
            status: "error",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Get invoice
      const invoice = await Invoice.findOne({
        _id: id,
        userId: user._id,
      }).lean();

      if (!invoice) {
        return NextResponse.json(
          {
            status: "error",
            message: "Invoice not found",
            code: "INVOICE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          status: "success",
          data: invoice,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to fetch invoice",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

