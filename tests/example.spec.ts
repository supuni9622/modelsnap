import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ModelSnapper/i);
});

test("can navigate to sign in", async ({ page }) => {
  await page.goto("/");
  // Add navigation test when header is implemented
});

