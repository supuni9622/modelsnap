import { connectDB } from "@/lib/db";
import Invoice from "@/models/invoice";
import User from "@/models/user";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";
import { withTransaction } from "@/lib/transaction-utils";

/**
 * PUT /api/admin/invoices/[id]
 * Admin endpoint to mark invoice as paid (for bank transfers)
 * Requires ADMIN role
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRateLimit(RATE_LIMIT_CONFIGS.API)(async (req: NextRequest) => {
    const { id } = await params;
    try {
      await connectDB();

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

      // Get user and check admin role
      const user = await User.findOne({ id: userId });
      if (!user || user.role !== "ADMIN") {
        return NextResponse.json(
          {
            status: "error",
            message: "Forbidden - Admin access required",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Get invoice
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return NextResponse.json(
          {
            status: "error",
            message: "Invoice not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Parse request body
      const body = await req.json();
      const { markAsPaid, creditsToAdd, notes } = body;

      if (markAsPaid) {
        // Mark invoice as paid and optionally add credits
        await withTransaction(async (session) => {
          // Update invoice status
          await Invoice.findByIdAndUpdate(
            id,
            {
              $set: {
                status: "paid",
                paidAt: new Date(),
              },
            },
            { session }
          );

          // Add credits if specified
          if (creditsToAdd && creditsToAdd > 0) {
            await User.findByIdAndUpdate(
              invoice.userId,
              {
                $inc: { credits: creditsToAdd },
              },
              { session }
            );
          }
        });

        return NextResponse.json(
          {
            status: "success",
            message: "Invoice marked as paid successfully",
            data: {
              invoiceId: invoice._id,
              creditsAdded: creditsToAdd || 0,
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          status: "error",
          message: "Invalid request",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    } catch (err) {
      console.error("Error updating invoice:", err);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to update invoice",
          code: "SERVER_ERROR",
        },
        { status: 500 }
      );
    }
  })(req);
}

