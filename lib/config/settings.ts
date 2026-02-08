import { FooterLinkTypes } from "@/components/landing/footer-link";

/**
 * SITE CONFIGURATION
 * Update these values to customize your application
 */

/** The name of your application */
export const SiteName = "ModelSnapper.ai";

/**
 * Main site settings interface
 */
export interface SiteSettingsType {
  /** Short name for your application */
  name: string;
  /** Path to logo image for light theme */
  logoUrlLight: string;
  /** Path to logo image for dark theme */
  logoUrlDark: string;
  /** Default theme when user first visits */
  defaultTheme: "system" | "light" | "dark";
  /** Your domain name (used for SEO and metadata) */
  domainName: string;
  /** Full URL of your application */
  domainUrl: string;
}

/**
 * ⚠️  IMPORTANT: Update these settings for your application
 */
export const SiteSettings: SiteSettingsType = {
  name: "ModelSnapper.ai",
  logoUrlLight: "/static/images/dark-logo.jpeg",
  logoUrlDark: "/static/images/dark-logo.jpeg",
  defaultTheme: "light",
  domainName: "Founderflow.online",
  domainUrl:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://modelsnapapp.com/en",
};

/**
 * Footer navigation configuration
 */
interface FooterData {
  Links: FooterLinkTypes[];
  More: FooterLinkTypes[];
}

/**
 * ⚠️  Update these links to match your application's navigation
 */
export const footerData: FooterData = {
  Links: [
    {
      label: "Login",
      href: "/login",
      external: false,
    },
    {
      label: "Pricing",
      href: "/pricing",
    },
    // {
    //   label: "Support",
    //   href: "/support",
    // },
    // {
    //   label: "Documentation",
    //   href: "/doc",
    // },
  ],
  More: [
    {
      label: "Login",
      href: "/login",
      external: false,
    },
    {
      label: "Pricing",
      href: "/pricing",
    },
    // {
    //   label: "Support",
    //   href: "/support",
    // },
    // {
    //   label: "Documentation",
    //   href: "/doc",
    // },
  ],
};

/**
 * SOCIAL MEDIA LINKS
 * 
 * ⚠️  Update these with your actual social media profiles
 * Leave empty strings for platforms you don't use
 */
export const SocialLink = {
  facebook: "https://www.facebook.com/profile.php?id=61584141892640",
  instagram: "https://www.instagram.com/modelsnap.ai/",
  tiktok: "https://www.tiktok.com/@modelsnap.ai",
  x: "",
  youtube: "https://www.youtube.com/@ModelSnap-ai",
  linkedin: "https://www.linkedin.com/company/model-snap-ai/?viewAsMember=true",
  pinterest: "",
  snapchat: "",
  reddit: "",
  github: "",
  discord: "",
};

/**
 * LEMON SQUEEZY CONFIGURATION
 * 
 * ⚠️  IMPORTANT: Replace these with your actual Lemon Squeezy store details
 * Get these values from your Lemon Squeezy dashboard
 */
export const lemonSqueezyStoreId = 247074; // Replace with your actual store ID
export const lemonSqueezyStoreUrl = "https://modelsnap.lemonsqueezy.com"; // Replace with your store URL
