/**
 * Suite 6: Consumer User Journey
 *
 * Tests for marketplace, checkout, orders, and QR scanning.
 * Unauthenticated redirect tests run immediately.
 * Full UI journeys use storageState written by global-setup.ts.
 * When that setup didn't succeed, authenticated blocks self-skip.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const CONSUMER_STATE = path.join(
  process.cwd(),
  "tests",
  "storageState",
  "consumer.json"
);

function consumerSessionAvailable(): boolean {
  try {
    const raw = fs.readFileSync(CONSUMER_STATE, "utf8");
    const state = JSON.parse(raw);
    return Array.isArray(state.cookies) && state.cookies.length > 0;
  } catch {
    return false;
  }
}

// ─── Unauthenticated redirect enforcement ────────────────────────────────────

test.describe("Consumer dashboard — redirect (auth enforced)", () => {
  const routes = ["/consumer", "/consumer/shop", "/consumer/qr", "/consumer/orders"];

  for (const route of routes) {
    test(`GET ${route} without session → /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("**/login**");
      expect(page.url()).toContain("/login");
    });
  }
});

// ─── Authenticated consumer UI flows ─────────────────────────────────────────

test.describe("Consumer dashboard — authenticated", () => {
  test.use({ storageState: CONSUMER_STATE });

  test.beforeEach(async ({}, testInfo) => {
    if (!consumerSessionAvailable()) {
      testInfo.skip(
        true,
        "Consumer session not available — run global-setup or configure Supabase email auth"
      );
    }
  });

  test("consumer dashboard loads without redirect", async ({ page }) => {
    await page.goto("/consumer", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .locator("text=Consumer")
        .or(page.locator("text=Dashboard"))
        .or(page.locator("text=Welcome"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shop page loads product listings", async ({ page }) => {
    await page.goto("/consumer/shop", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .locator("text=Shop")
        .or(page.locator("text=Marketplace"))
        .or(page.locator("text=No crops"))
        .or(page.locator("text=available"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("orders page loads without error", async ({ page }) => {
    await page.goto("/consumer/orders", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .locator("text=Orders")
        .or(page.locator("text=No orders"))
        .or(page.locator("text=Order History"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("QR page loads without error", async ({ page }) => {
    await page.goto("/consumer/qr", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .locator("text=QR")
        .or(page.locator("text=Scan"))
        .or(page.locator("text=Product"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("checkout with empty cart is blocked", async ({ page }) => {
    await page.goto("/consumer/shop", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    // The Place Order button should either be absent or disabled when cart is empty
    const placeOrderBtn = page
      .locator("button", { hasText: /place order/i })
      .or(page.locator("button", { hasText: /checkout/i }))
      .first();

    const isVisible = await placeOrderBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(placeOrderBtn).toBeDisabled();
    }
    // If not visible, empty cart hides the button — also acceptable
  });

  test("consumer cannot access /farmer — proxy redirects to /consumer", async ({
    page,
  }) => {
    await page.goto("/farmer", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/farmer/);
    await expect(page).toHaveURL(/\/consumer/, { timeout: 8_000 });
  });

  test("consumer cannot access /government — proxy redirects to /consumer", async ({
    page,
  }) => {
    await page.goto("/government", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/government/);
    await expect(page).toHaveURL(/\/consumer/, { timeout: 8_000 });
  });
});
