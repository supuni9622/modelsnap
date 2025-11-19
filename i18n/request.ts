// Import the getRequestConfig function from next-intl/server
import { getRequestConfig } from "next-intl/server";

// Import the routing configuration
import { routing } from "./routing";

// Export the default request configuration
export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  // Filter out any Clerk IDs or invalid locale strings
  if (
    !locale ||
    typeof locale !== "string" ||
    !routing.locales.includes(locale as any) ||
    locale.startsWith("clerk_")
  ) {
    locale = routing.defaultLocale;
  }

  try {
    // Return the locale and the corresponding messages
    const messages = (await import(`../locales/${locale}.json`)).default;
    return {
      locale,
      messages,
    };
  } catch (error) {
    // Fallback to default locale if locale file doesn't exist
    console.error(`Failed to load locale ${locale}, falling back to ${routing.defaultLocale}`, error);
    const messages = (await import(`../locales/${routing.defaultLocale}.json`)).default;
    return {
      locale: routing.defaultLocale,
      messages,
    };
  }
});
