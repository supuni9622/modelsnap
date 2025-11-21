import AccountButton from "@/components/buttons/account-button";
import MyCreditsButton from "@/components/buttons/my-credits-button";
import RoleSwitcher from "@/components/buttons/role-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SidebarHeader() {
  return (
    <header className="w-full h-[55px] flex items-center px-5 md:px-10 sticky top-0 bg-background/70 backdrop-blur-md z-50">
      <SidebarTrigger className="" />
      <div className="flex justify-end w-full items-center space-x-4 ">
        <RoleSwitcher />
        <MyCreditsButton />
        <ThemeToggle />
        <AccountButton />
      </div>
    </header>
  );
}
