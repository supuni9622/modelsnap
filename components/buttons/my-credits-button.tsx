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
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <CoinsIcon className="h-4 w-4" />
          <span className="font-semibold">{credits}</span>
          <span className="text-muted-foreground">Credits</span>
        </Badge>
        {isFreePlan ? (
          <Link href="/dashboard/business/billing">
            <Button size="sm" variant="default">
              Upgrade Plan
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDialog(true)}
          >
            Top Up
          </Button>
        )}
      </div>

      {/* Mobile: Show credits in popover */}
      <Popover>
        <PopoverTrigger className="flex md:hidden">
          <Badge variant="outline" className="gap-1.5 px-2 py-1">
            <CoinsIcon className="h-4 w-4" />
            <span className="font-semibold">{credits}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Available Credits</p>
              <p className="text-2xl font-bold">{credits}</p>
            </div>
            {isFreePlan ? (
              <Link href="/dashboard/business/billing" className="block">
                <Button size="sm" variant="default" className="w-full">
                  Upgrade Plan
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
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
