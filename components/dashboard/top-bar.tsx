"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import AccountButton from "@/components/buttons/account-button";
import MyCreditsButton from "@/components/buttons/my-credits-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/auth-utils";

interface DashboardTopBarProps {
  role: UserRole;
}

export function DashboardTopBar({ role }: DashboardTopBarProps) {
  const getRoleLabel = () => {
    switch (role) {
      case "BUSINESS":
        return "Business";
      case "MODEL":
        return "Model";
      case "ADMIN":
        return "Admin";
      default:
        return "";
    }
  };

  return (
    <header className="w-full h-[55px] flex items-center px-4 md:px-6 sticky top-0 bg-background/70 backdrop-blur-md z-50 border-b">
      <SidebarTrigger />
      <div className="flex justify-end w-full items-center space-x-4">
        <Badge variant="secondary" className="hidden sm:flex">
          {getRoleLabel()}
        </Badge>
        {role === "BUSINESS" && <MyCreditsButton />}
        <ThemeToggle />
        <AccountButton />
      </div>
    </header>
  );
}

