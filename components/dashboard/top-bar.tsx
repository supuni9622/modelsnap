"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import AccountButton from "@/components/buttons/account-button";
import MyCreditsButton from "@/components/buttons/my-credits-button";
import SubscriptionBadge from "@/components/buttons/subscription-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/auth-utils";
import { motion } from "framer-motion";

interface DashboardTopBarProps {
  role: UserRole;
}

export function DashboardTopBar({ role }: DashboardTopBarProps) {
  const getRoleLabel = () => {
    switch (role) {
      case "BUSINESS":
        return { label: "Business", emoji: "💼" };
      case "MODEL":
        return { label: "Model", emoji: "👤" };
      case "ADMIN":
        return { label: "Admin", emoji: "⚙️" };
      default:
        return { label: "", emoji: "" };
    }
  };

  const roleInfo = getRoleLabel();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-[60px] flex items-center px-3 md:px-6 sticky top-0 bg-background/80 backdrop-blur-lg z-50 border-b shadow-sm"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <SidebarTrigger />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="hidden sm:flex"
        >
          <Badge
            variant="outline"
            className="gap-1.5 px-2 py-1 font-semibold text-xs border-primary/30 text-primary bg-primary/5"
          >
            <span className="text-[10px]">BETA</span>
          </Badge>
        </motion.div>
      </div>
      <div className="flex justify-end w-full items-center gap-2 md:gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="hidden sm:flex"
        >
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 font-medium text-xs md:text-sm"
          >
            <span className="text-base">{roleInfo.emoji}</span>
            <span>{roleInfo.label}</span>
          </Badge>
        </motion.div>
        {role === "BUSINESS" && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="hidden md:flex"
            >
              <SubscriptionBadge />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MyCreditsButton />
            </motion.div>
          </>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <ThemeToggle />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AccountButton />
        </motion.div>
      </div>
    </motion.header>
  );
}

