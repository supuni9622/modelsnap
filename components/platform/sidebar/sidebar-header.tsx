import AccountButton from "@/components/buttons/account-button";
import MyCreditsButton from "@/components/buttons/my-credits-button";
import SubscriptionBadge from "@/components/buttons/subscription-badge";
import RoleSwitcher from "@/components/buttons/role-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@clerk/nextjs";

export default function SidebarHeader() {
  // Note: We can't use useAuth here since this is a server component
  // The SubscriptionBadge component will handle the conditional rendering
  return (
    <header className="w-full h-[55px] flex items-center px-5 md:px-10 sticky top-0 bg-background/70 backdrop-blur-md z-50">
      <SidebarTrigger className="" />
      <div className="flex justify-end w-full items-center space-x-4 ">
        <RoleSwitcher />
        <SubscriptionBadge />
        <MyCreditsButton />
        <ThemeToggle />
        <AccountButton />
      </div>
    </header>
  );
}
