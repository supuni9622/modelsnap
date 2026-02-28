"use client";

import { usePathname } from "@/i18n/navigation";
import Footer from "@/components/landing/footer/footer-1";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname?.includes("/onboarding");

  if (isOnboarding) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="mx-auto max-w-screen-xl py-5 px-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex min-h-screen justify-center mt-[55px] md:mt-[50px]">
        {children}
      </main>
      <Footer />
    </>
  );
}
