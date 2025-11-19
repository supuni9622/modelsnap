import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { locales } from "@/lib/config/locales";
import { publicRoutes } from "@/lib/routes";
import { NextResponse } from "next/server";
import { checkEnvironmentVariables } from "@/lib/env-checker";

// Configure i18n middleware
const intlMiddleware = createMiddleware({
  locales: locales.values,
  defaultLocale: locales.default,
});

// Create a matcher for public routes
const isPublicRoute = createRouteMatcher(publicRoutes);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  
  // Skip ALL middleware processing for static files, setup page and API routes
  if (
    pathname === "/setup" ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|mp4|webm|ogg|mov|avi)$/)
  ) {
    return NextResponse.next();
  }

  // Check environment variables ONLY in production and cache the result
  // Skip in development to improve performance
  if (process.env.NODE_ENV === "production") {
    try {
      // Cache env check result (check once per minute)
      const cacheKey = "env-check-cache";
      const cacheTime = 60000; // 1 minute
      const cached = (global as any)[cacheKey];
      
      if (!cached || Date.now() - cached.timestamp > cacheTime) {
        const envResult = checkEnvironmentVariables();
        (global as any)[cacheKey] = {
          result: envResult,
          timestamp: Date.now(),
        };
        
        // If critical environment variables are missing, redirect to setup
        if (!envResult.isComplete) {
          const url = req.nextUrl.clone();
          url.pathname = "/setup";
          return NextResponse.redirect(url);
        }
      } else if (!cached.result.isComplete) {
        // Use cached result
        const url = req.nextUrl.clone();
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // If environment check fails, redirect to setup
      const url = req.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  // Only proceed with locale redirect if environment is complete
  // Redirect "/" to default or user-selected locale
  if (pathname === "/") {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    const locale =
      cookieLocale && locales.values.includes(cookieLocale)
        ? cookieLocale
        : locales.default;

    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  if (!isPublicRoute(req)) {
    await auth.protect(); // Protect private routes
  }

  // Extract locale from pathname and validate it
  const pathSegments = pathname.split("/").filter(Boolean);
  const potentialLocale = pathSegments[0];
  
  // If the first segment is not a valid locale (or is a Clerk ID), ensure we use default locale
  if (
    potentialLocale &&
    (potentialLocale.startsWith("clerk_") || !locales.values.includes(potentialLocale))
  ) {
    // If invalid locale detected, replace it with default locale
    const url = req.nextUrl.clone();
    const remainingPath = pathSegments.slice(1).join("/");
    url.pathname = remainingPath ? `/${locales.default}/${remainingPath}` : `/${locales.default}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(req);

  return intlResponse;
});

// Define config for the middleware
export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
    // Explicitly match root path
    "/"
  ],
};
