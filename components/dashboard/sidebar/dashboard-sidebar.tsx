"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import SidebarButton from "@/components/platform/sidebar/sidebar-button";
import { usePathname } from "@/i18n/navigation";
import {
  Sparkles,
  History,
  Users,
  CreditCard,
  User,
  FileText,
  DollarSign,
  BarChart3,
  MailCheck,
  Coins,
  Settings,
  UserCheck,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-utils";

interface DashboardSidebarProps {
  role: UserRole;
}

const businessNavItems = [
  {
    label: "Generate",
    icon: <Sparkles className="w-4 h-4" />,
    path: "/dashboard/business/generate",
  },
  {
    label: "Models",
    icon: <Users className="w-4 h-4" />,
    path: "/dashboard/business/models",
  },
  {
    label: "History",
    icon: <History className="w-4 h-4" />,
    path: "/dashboard/business/history",
  },
  {
    label: "Billing",
    icon: <CreditCard className="w-4 h-4" />,
    path: "/dashboard/business/billing",
  },
  {
    label: "Profile",
    icon: <User className="w-4 h-4" />,
    path: "/dashboard/business/profile",
  },
];

const modelNavItems = [
  {
    label: "Profile",
    icon: <User className="w-4 h-4" />,
    path: "/dashboard/model/profile",
  },
  {
    label: "Requests",
    icon: <FileText className="w-4 h-4" />,
    path: "/dashboard/model/requests",
  },
  {
    label: "Earnings",
    icon: <DollarSign className="w-4 h-4" />,
    path: "/dashboard/model/earnings",
  },
];

const adminNavItems = [
  {
    label: "Analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    path: "/dashboard/admin/analytics",
  },
  {
    label: "Consent",
    icon: <UserCheck className="w-4 h-4" />,
    path: "/dashboard/admin/consent",
  },
  {
    label: "Credits",
    icon: <Coins className="w-4 h-4" />,
    path: "/dashboard/admin/credits",
  },
  {
    label: "Subscriptions",
    icon: <CreditCard className="w-4 h-4" />,
    path: "/dashboard/admin/subscriptions",
  },
  {
    label: "Users",
    icon: <Users className="w-4 h-4" />,
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

  return (
    <Sidebar className="bg-background border-r">
      <SidebarHeader className="bg-background">
        <div className="py-2 px-2">
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup className="space-y-1">
          <p className="text-xs pb-1 text-muted-foreground px-2">Navigation</p>
          {navItems.map((item, idx) => (
            <SidebarButton key={idx} path={item.path} onClick={() => {}}>
              {item.icon}
              <span>{item.label}</span>
            </SidebarButton>
          ))}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

