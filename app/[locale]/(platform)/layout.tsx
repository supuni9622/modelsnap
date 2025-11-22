import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar/dashboard-sidebar";
import { DashboardTopBar } from "@/components/dashboard/top-bar";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";
import { getUserRole } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();

  // If no role, redirect to onboarding (OnboardingCheck will handle this, but double-check)
  if (!role) {
    redirect("/onboarding");
  }

  return (
    <DashboardProviders>
      <SidebarProvider>
        <DashboardSidebar role={role} />
        <SidebarInset>
          <DashboardTopBar role={role} />
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProviders>
  );
}

