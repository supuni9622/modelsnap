"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";

type SidebarButtonTypes = {
  children: ReactNode;
  path: string;
  onClick: () => void;
};

export default function SidebarButton({
  path,
  children,
  onClick,
}: SidebarButtonTypes) {
  const pathname = usePathname();
  const isActive = pathname === path;
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Link href={path} onClick={onClick} className="block">
      <motion.div
        whileHover={{ scale: 1.02, x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "text-left hover:opacity-100 duration-300 opacity-70 rounded-lg flex items-center text-sm transition-all",
          "hover:bg-muted/50 border border-transparent hover:border-primary/20",
          isCollapsed ? "justify-center px-2 py-2.5 h-[48px]" : "justify-start space-x-3 px-4 py-2.5 h-[48px]",
          isActive &&
            "bg-primary/10 text-primary border-primary/30 opacity-100 font-semibold shadow-sm"
        )}
        title={isCollapsed ? pathname : undefined}
      >
        {children}
      </motion.div>
    </Link>
  );
}
