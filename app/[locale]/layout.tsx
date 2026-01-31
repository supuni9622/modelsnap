import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/scroll-top";
import { TailwindIndicator } from "@/components/tailwindIndicator";
import { QueryProvider } from "@/components/providers/query-provider";
import { locales } from "@/lib/config/locales";

async function getMessages(locale: string) {
  try {
    return (await import(`@/locales/${locale}.json`)).default;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Missing translation file for locale: ${locale}`);
    }
    return {};
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  
  // Validate locale - filter out Clerk IDs and invalid locales
  let locale = resolvedParams.locale;
  if (
    !locale ||
    typeof locale !== "string" ||
    !locales.values.includes(locale) ||
    locale.startsWith("clerk_")
  ) {
    locale = locales.default;
  }
  
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
    >
      <QueryProvider>
        <Toaster />
        <ScrollToTop />
        {children}
        {process.env.NODE_ENV === "development" && <TailwindIndicator />}
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
