"use client";

import { useAppContext } from "@/context/app";
import { Button } from "@/components/ui/button";
import { CoinsIcon } from "lucide-react";
import { useState } from "react";
import { CreditTopUpDialog } from "@/components/credit-top-up-dialog";
import { useAuth } from "@clerk/nextjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

export default function MyCreditsButton() {
  const { isSignedIn } = useAuth();
  const { billing } = useAppContext();

  const [showDialog, setShowDialog] = useState(false);
  const credits = billing?.credits ?? 0;
  const isFreePlan = billing?.plan === "free";

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {/* Desktop: Always show credits prominently */}
      <div className="hidden md:flex items-center gap-2">
        <Badge className="gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#356DFF] to-[#5B8AFF] text-white border-0 shadow-md shadow-[#356DFF]/20 hover:shadow-lg hover:shadow-[#356DFF]/30 transition-all duration-300 hover:scale-105">
          <CoinsIcon className="h-4 w-4" />
          <span className="font-semibold">{credits}</span>
          <span className="text-white/90">Credits</span>
        </Badge>
        {isFreePlan ? (
          <Link href="/dashboard/business/billing">
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-[#4BE4C1] to-[#5BFFD9] text-[#015064] hover:from-[#5BFFD9] hover:to-[#4BE4C1] border-0 shadow-md shadow-[#4BE4C1]/20 hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Upgrade Plan
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#4BE4C1] to-[#5BFFD9] text-[#015064] hover:from-[#5BFFD9] hover:to-[#4BE4C1] border-0 shadow-md shadow-[#4BE4C1]/20 hover:shadow-lg transition-all duration-300 font-semibold"
            onClick={() => setShowDialog(true)}
          >
            Top Up
          </Button>
        )}
      </div>

      {/* Mobile: Show credits in popover */}
      <Popover>
        <PopoverTrigger className="flex md:hidden">
          <Badge className="gap-1.5 px-2 py-1 bg-gradient-to-r from-[#356DFF] to-[#5B8AFF] text-white border-0 shadow-md shadow-[#356DFF]/20 hover:shadow-lg transition-all duration-300">
            <CoinsIcon className="h-4 w-4" />
            <span className="font-semibold">{credits}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Available Credits</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-[#356DFF] to-[#5B8AFF] bg-clip-text text-transparent">
                {credits}
              </p>
            </div>
            {isFreePlan ? (
              <Link href="/dashboard/business/billing" className="block">
                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-[#4BE4C1] to-[#5BFFD9] text-[#015064] hover:from-[#5BFFD9] hover:to-[#4BE4C1] border-0 shadow-md shadow-[#4BE4C1]/20 hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Upgrade Plan
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-[#4BE4C1] to-[#5BFFD9] text-[#015064] hover:from-[#5BFFD9] hover:to-[#4BE4C1] border-0 shadow-md shadow-[#4BE4C1]/20 hover:shadow-lg transition-all duration-300 font-semibold"
                onClick={() => {
                  setShowDialog(true);
                }}
              >
                <CoinsIcon className="h-4 w-4 mr-2" />
                Top Up Credits
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Credit Top Up Dialog */}
      {showDialog && (
        <CreditTopUpDialog open={showDialog} setOpen={setShowDialog} />
      )}
    </>
  );
}
