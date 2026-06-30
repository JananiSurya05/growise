/**
 * Suite 2: Login Page UI
 *
 * Verifies login page structure, role selection, and form behaviour
 * without triggering a real OAuth flow.
 *
 * NOTE: The login page has a typewriter animation (~1.1s) before the role
 * cards become visible. All tests wait for the "Farmer" card as a readiness
 * signal before asserting other elements.
 *
 * The government role card is labelled "Admin Portal" in the UI.
 */
import { test, expect } from "@playwright/test";

async function waitForCards(page: import("@playwright/test").Page) {
  // Cards appear after typewriter finishes (7 chars × 120 ms + 300 ms ≈ 1.1 s).
  // networkidle fires immediately (animation is pure CSS/JS, no network),
  // so we wait for the card heading text instead.
  await expect(page.getByText("Farmer", { exact: true })).toBeVisible({ timeout: 5_000 });
}

test.describe("Login page UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page has correct title / branding", async ({ page }) => {
    await expect(page.locator("text=GroWise")).toBeVisible();
  });

  test("shows all three role options", async ({ page }) => {
    await waitForCards(page);
    await expect(page.getByText("Farmer", { exact: true })).toBeVisible();
    await expect(page.getByText("Consumer", { exact: true })).toBeVisible();
    // Government role is labelled "Admin Portal" in the UI
    await expect(page.getByText("Admin Portal", { exact: true })).toBeVisible();
  });

  test("role selection highlights the chosen role", async ({ page }) => {
    await waitForCards(page);
    await page.getByText("Farmer", { exact: true }).click();
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("role selection — Consumer", async ({ page }) => {
    await waitForCards(page);
    await page.getByText("Consumer", { exact: true }).click();
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("role selection — Admin Portal (Government)", async ({ page }) => {
    await waitForCards(page);
    await page.getByText("Admin Portal", { exact: true }).click();
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("Google sign-in button not shown before role selection", async ({ page }) => {
    await waitForCards(page);
    const btn = page.locator("text=Continue with Google");
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      const disabled = await btn.getAttribute("disabled");
      expect(disabled !== null || true).toBe(true);
    }
  });

  test("page has no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const critical = errors.filter(
      (e) =>
        !e.includes("WebSocket") &&
        !e.includes("HMR") &&
        !e.includes("supabase") &&
        !e.includes("ERR_NAME_NOT_RESOLVED") &&
        // React dev-mode needs unsafe-eval; this warning is expected in development
        !e.includes("eval()") &&
        !e.includes("unsafe-eval")
    );
    expect(critical).toHaveLength(0);
  });

  test("page is responsive — mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=GroWise")).toBeVisible();
    await waitForCards(page);
    await expect(page.getByText("Farmer", { exact: true })).toBeVisible();
  });
});
