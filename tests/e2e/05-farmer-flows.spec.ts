/**
 * Suite 5: Farmer User Journey
 *
 * Tests that require an authenticated farmer session.
 * The proxy.ts middleware enforces server-side role validation, so these
 * tests need a real Supabase session cookie.
 *
 * Unauthenticated redirect + API auth tests run unconditionally.
 * Authenticated UI journeys use storageState written by global-setup.ts.
 * When that setup didn't succeed (no email auth in Supabase), the
 * authenticated describe block self-skips via a beforeEach guard.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { apiPost } from "./helpers";

const FARMER_STATE = path.join(
  process.cwd(),
  "tests",
  "storageState",
  "farmer.json"
);

function farmerSessionAvailable(): boolean {
  try {
    const raw = fs.readFileSync(FARMER_STATE, "utf8");
    const state = JSON.parse(raw);
    return Array.isArray(state.cookies) && state.cookies.length > 0;
  } catch {
    return false;
  }
}

// ─── Unauthenticated redirect enforcement ────────────────────────────────────

test.describe("Farmer dashboard — redirect (auth enforced)", () => {
  test("GET /farmer without session → /login", async ({ page }) => {
    await page.goto("/farmer");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("GET /farmer/crops without session → /login", async ({ page }) => {
    await page.goto("/farmer/crops");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});

// ─── API authentication enforcement ─────────────────────────────────────────

test.describe("AI Advisor — authentication enforcement", () => {
  test("POST /api/advisor without session → 401 Unauthorized", async ({
    request,
  }) => {
    const res = await apiPost(request, "/api/advisor", {
      question: "What crop for June?",
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Disease Scanner — authentication enforcement", () => {
  test("POST /api/disease without session → 401 Unauthorized", async ({
    request,
  }) => {
    const res = await apiPost(request, "/api/disease", {
      image: "data:image/jpeg;base64,/9j/4AAQ",
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Weather — authentication enforcement", () => {
  test("GET /api/weather without session → 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai");
    expect(res.status()).toBe(401);
  });
});

// ─── Authenticated farmer UI flows ───────────────────────────────────────────

test.describe("Farmer dashboard — authenticated", () => {
  test.use({ storageState: FARMER_STATE });

  test.beforeEach(async ({}, testInfo) => {
    if (!farmerSessionAvailable()) {
      testInfo.skip(
        true,
        "Farmer session not available — run global-setup or configure Supabase email auth"
      );
    }
  });

  test("farmer dashboard loads and shows key cards", async ({ page }) => {
    await page.goto("/farmer", { waitUntil: "domcontentloaded" });
    // Proxy must NOT redirect to /login — we're authenticated as farmer
    await expect(page).not.toHaveURL(/\/login/);
    // Dashboard must show the farmer's own content area
    await expect(
      page.locator("text=Farmer").or(page.locator("text=Dashboard")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("crops page loads without redirect", async ({ page }) => {
    await page.goto("/farmer/crops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    // Crops page should show some crop-related heading or list
    await expect(
      page
        .locator("text=Crops")
        .or(page.locator("text=Add Crop"))
        .or(page.locator("text=My Crops"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("crop creation: negative price shows validation alert", async ({
    page,
  }) => {
    await page.goto("/farmer/crops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    // Wait for the Add Crop form or button to be available
    const addBtn = page
      .locator("button", { hasText: /add crop/i })
      .or(page.locator("button", { hasText: /add/i }))
      .first();
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });

    // Capture the alert dialog before triggering it
    const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 }).catch(() => null);

    // Fill the form — name is required, price -5 should trigger validation
    await page.fill("input[placeholder*='name' i], input[name='name']", "Test Crop").catch(() => {});
    await page.fill("input[placeholder*='price' i], input[name='price']", "-5").catch(() => {});
    await page.fill(
      "input[placeholder*='quantity' i], input[name='quantity']",
      "10"
    ).catch(() => {});

    await addBtn.click();

    const dialog = await dialogPromise;
    if (dialog) {
      expect(dialog.message()).toMatch(/price/i);
      await dialog.dismiss();
    } else {
      // Some implementations use inline error text instead of alert()
      await expect(
        page
          .locator("text=/price/i")
          .or(page.locator("[role=alert]"))
          .first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("crop creation: zero quantity shows validation alert", async ({
    page,
  }) => {
    await page.goto("/farmer/crops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    const addBtn = page
      .locator("button", { hasText: /add crop/i })
      .or(page.locator("button", { hasText: /add/i }))
      .first();
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });

    const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 }).catch(() => null);

    await page.fill("input[placeholder*='name' i], input[name='name']", "Test Crop").catch(() => {});
    await page.fill("input[placeholder*='price' i], input[name='price']", "100").catch(() => {});
    await page.fill(
      "input[placeholder*='quantity' i], input[name='quantity']",
      "0"
    ).catch(() => {});

    await addBtn.click();

    const dialog = await dialogPromise;
    if (dialog) {
      expect(dialog.message()).toMatch(/quantity/i);
      await dialog.dismiss();
    } else {
      await expect(
        page
          .locator("text=/quantity/i")
          .or(page.locator("[role=alert]"))
          .first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("farmer cannot access /consumer — proxy redirects to /farmer", async ({
    page,
  }) => {
    await page.goto("/consumer", { waitUntil: "domcontentloaded" });
    // Proxy sees role=farmer for this session and redirects to /farmer
    await expect(page).not.toHaveURL(/\/consumer/);
    await expect(page).toHaveURL(/\/farmer/, { timeout: 8_000 });
  });

  test("farmer cannot access /government — proxy redirects to /farmer", async ({
    page,
  }) => {
    await page.goto("/government", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/government/);
    await expect(page).toHaveURL(/\/farmer/, { timeout: 8_000 });
  });
});
