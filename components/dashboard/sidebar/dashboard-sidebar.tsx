"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import SidebarButton from "@/components/platform/sidebar/sidebar-button";
import { usePathname } from "@/i18n/navigation";
import type { UserRole } from "@/lib/auth-utils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  role: UserRole;
}

const businessNavItems = [
  {
    label: "Generate",
    emoji: "✨",
    path: "/dashboard/business/generate",
  },
  {
    label: "Models",
    emoji: "👥",
    path: "/dashboard/business/models",
  },
  {
    label: "History",
    emoji: "📜",
    path: "/dashboard/business/history",
  },
  {
    label: "Billing",
    emoji: "💳",
    path: "/dashboard/business/billing",
  },
  {
    label: "Profile",
    emoji: "👤",
    path: "/dashboard/business/profile",
  },
];

const modelNavItems = [
  {
    label: "Profile",
    emoji: "👤",
    path: "/dashboard/model/profile",
  },
  {
    label: "Requests",
    emoji: "📋",
    path: "/dashboard/model/requests",
  },
  {
    label: "Earnings",
    emoji: "💰",
    path: "/dashboard/model/earnings",
  },
];

const adminNavItems = [
  {
    label: "Analytics",
    emoji: "📊",
    path: "/dashboard/admin/analytics",
  },
  {
    label: "Consent",
    emoji: "✅",
    path: "/dashboard/admin/consent",
  },
  {
    label: "Credits",
    emoji: "🪙",
    path: "/dashboard/admin/credits",
  },
  {
    label: "Subscriptions",
    emoji: "💳",
    path: "/dashboard/admin/subscriptions",
  },
  {
    label: "Users",
    emoji: "👥",
    path: "/dashboard/admin/users",
  },
];

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();

  const getNavItems = () => {
    switch (role) {
      case "BUSINESS":
        return businessNavItems;
      case "MODEL":
        return modelNavItems;
      case "ADMIN":
        return adminNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="bg-background border-r" collapsible="icon">
      <SidebarHeader className="bg-background border-b">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "py-3 flex items-center transition-all duration-200",
            isCollapsed ? "px-2 justify-center" : "px-3"
          )}
        >
          <div className={cn("shrink-0", isCollapsed ? "" : "-mr-2")}>
            <Logo className={cn(isCollapsed ? "!w-[40px] !h-[40px]" : "!w-[120px] !h-[45px]")} />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent whitespace-nowrap overflow-hidden"
              >
                ModelSnap
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup className={cn("space-y-1 pt-4", isCollapsed ? "px-1" : "px-2")} data-collapsible={isCollapsed ? "icon" : ""}>
          {navItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
            >
              <SidebarButton path={item.path} onClick={() => {}}>
                <span 
                  className={cn(
                    isCollapsed ? "text-xl" : "text-lg"
                  )}
                  role="img"
                  aria-label={item.label}
                >
                  {item.emoji}
                </span>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </SidebarButton>
            </motion.div>
          ))}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

