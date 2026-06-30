/**
 * Suite 7: Government Dashboard
 *
 * Government role is read-only analytics. All data access goes through RLS
 * (once applied). These tests verify the redirect enforcement and document
 * the authenticated journey.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const GOVT_STATE = path.join(
  process.cwd(),
  "tests",
  "storageState",
  "government.json"
);

function govtSessionAvailable(): boolean {
  try {
    const raw = fs.readFileSync(GOVT_STATE, "utf8");
    const state = JSON.parse(raw);
    return Array.isArray(state.cookies) && state.cookies.length > 0;
  } catch {
    return false;
  }
}

// ─── Unauthenticated redirect enforcement ────────────────────────────────────

test.describe("Government dashboard — redirect (auth enforced)", () => {
  test("GET /government without session → /login", async ({ page }) => {
    await page.goto("/government");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});

// ─── Authenticated government UI flows ───────────────────────────────────────

test.describe("Government dashboard — authenticated", () => {
  test.use({ storageState: GOVT_STATE });

  test.beforeEach(async ({}, testInfo) => {
    if (!govtSessionAvailable()) {
      testInfo.skip(
        true,
        "Government session not available — run global-setup or configure Supabase email auth"
      );
    }
  });

  test("government dashboard loads without redirect", async ({ page }) => {
    await page.goto("/government", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .locator("text=Government")
        .or(page.locator("text=Analytics"))
        .or(page.locator("text=Dashboard"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("government dashboard shows aggregated statistics", async ({ page }) => {
    await page.goto("/government", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    // Dashboard should render stat cards (even with 0 values)
    await expect(
      page
        .locator("text=/order/i")
        .or(page.locator("text=/farmer/i"))
        .or(page.locator("text=/revenue/i"))
        .or(page.locator("text=/total/i"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("government dashboard is read-only — no create or delete buttons", async ({
    page,
  }) => {
    await page.goto("/government", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for page content to stabilize
    await page.waitForTimeout(2_000);

    // None of these action buttons should exist on the government view
    const addCropBtn = page.locator("button", { hasText: /add crop/i });
    const deleteBtn = page.locator("button", { hasText: /delete/i });
    const placeOrderBtn = page.locator("button", { hasText: /place order/i });

    await expect(addCropBtn).not.toBeVisible();
    await expect(deleteBtn).not.toBeVisible();
    await expect(placeOrderBtn).not.toBeVisible();
  });

  test("government cannot access /farmer — proxy redirects to /government", async ({
    page,
  }) => {
    await page.goto("/farmer", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/farmer/);
    await expect(page).toHaveURL(/\/government/, { timeout: 8_000 });
  });

  test("government cannot access /consumer — proxy redirects to /government", async ({
    page,
  }) => {
    await page.goto("/consumer", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/consumer/);
    await expect(page).toHaveURL(/\/government/, { timeout: 8_000 });
  });
});
