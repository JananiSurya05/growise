/**
 * Suite 1: Authentication & Redirect Enforcement
 *
 * Verifies that every protected route redirects unauthenticated visitors to
 * /login. These tests exercise the proxy.ts middleware without requiring a
 * real Supabase session.
 */
import { test, expect } from "@playwright/test";
import { PROTECTED_ROUTES } from "./helpers";

test.describe("Auth redirects — proxy.ts enforcement", () => {
  for (const { path } of PROTECTED_ROUTES) {
    test(`unauthenticated GET ${path} → /login`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "commit" });
      // Allow redirects — check final URL
      await page.waitForURL("**/login**", { timeout: 8_000 });
      expect(page.url()).toContain("/login");
      // Login page must render the GroWise header
      await expect(page.locator("text=GroWise")).toBeVisible();
    });
  }

  test("login page itself is publicly accessible (no redirect loop)", async ({ page }) => {
    await page.goto("/login");
    expect(page.url()).toContain("/login");
    await expect(page.locator("text=GroWise")).toBeVisible();
  });

  test("root / is accessible without auth", async ({ page }) => {
    const res = await page.goto("/");
    // Either public landing page or redirect to login — but never a 5xx
    expect(res?.status()).toBeLessThan(500);
  });
});
