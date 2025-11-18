/**
 * Google Analytics utility functions
 * Track page views and custom events
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: {
        [key: string]: unknown;
      }
    ) => void;
  }
}

/**
 * Track page view
 */
export function trackPageView(url: string): void {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "", {
      page_path: url,
    });
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Track conversion events
 */
export const trackConversion = {
  earlyAccessSignup: () => {
    trackEvent("early_access_signup", "conversion", "Early Access");
  },
  renderCompleted: (renderId: string) => {
    trackEvent("render_completed", "conversion", renderId);
  },
  paymentCompleted: (planId: string, amount: number) => {
    trackEvent("payment_completed", "conversion", planId, amount);
  },
};
