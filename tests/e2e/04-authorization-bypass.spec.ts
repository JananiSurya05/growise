/**
 * Suite 4: Authorization Bypass Attempts
 *
 * Penetration tests for role enforcement, path manipulation, and direct
 * Supabase query bypass attempts.
 *
 * All tests are against the live Next.js server. Cross-role UI bypass tests
 * require a real authenticated session and are marked as skipped with reason.
 */
import { test, expect } from "@playwright/test";
import { apiGet, apiPost } from "./helpers";
import * as fs from "fs";
import * as path from "path";

const CONSUMER_STATE = path.join(process.cwd(), "tests", "storageState", "consumer.json");
const FARMER_STATE = path.join(process.cwd(), "tests", "storageState", "farmer.json");
const GOVT_STATE = path.join(process.cwd(), "tests", "storageState", "government.json");

function sessionAvailable(stateFile: string): boolean {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return Array.isArray(s.cookies) && s.cookies.length > 0;
  } catch {
    return false;
  }
}

test.describe("Route-level authorization — unauthenticated bypass", () => {
  const attackPaths = [
    "/farmer",
    "/farmer/crops",
    "/farmer/advisor",
    "/farmer/disease",
    "/farmer/weather",
    "/farmer/income",
    "/farmer/sales",
    "/consumer",
    "/consumer/shop",
    "/consumer/qr",
    "/consumer/orders",
    "/government",
  ];

  for (const path of attackPaths) {
    test(`direct navigation to ${path} → redirected to /login`, async ({ page }) => {
      await page.goto(path, { waitUntil: "commit" });
      await page.waitForURL("**/login**", { timeout: 8_000 });
      expect(page.url()).toContain("/login");
    });
  }

  test("path traversal attempt /farmer/../consumer → /login", async ({ page }) => {
    // Browser normalises the URL, but test the encoded form
    await page.goto("/farmer%2F..%2Fconsumer", { waitUntil: "commit" });
    // Should either 404 or redirect to login, not serve a different role page
    const url = page.url();
    expect(url).not.toContain("/government");
    expect(url).not.toContain("/consumer");
  });

  test("query param injection in protected path → /login", async ({ page }) => {
    await page.goto("/farmer?role=government", { waitUntil: "commit" });
    await page.waitForURL("**/login**", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });

  test("POST to API with forged role header → 401 (auth required)", async ({ request }) => {
    const res = await apiPost(
      request,
      "/api/advisor",
      { question: "test" },
      { "x-user-role": "government" } // Attacker tries to inject role via header
    );
    // Auth blocks regardless of custom headers
    expect(res.status()).toBe(401);
  });
});

test.describe("API endpoint abuse", () => {
  test("SQL injection in weather city → rejected before Supabase", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", {
      city: "' OR '1'='1",
    });
    // Either 400 (invalid chars) or 401 (auth first) — never 200 with SQL results
    expect([400, 401]).toContain(res.status());
  });

  test("XSS payload in question field → safely handled", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {
      question: "<script>alert('XSS')</script>",
    });
    // 401 without auth; with auth would be 200 (AI receives sanitised text)
    expect([200, 400, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Response must not echo back raw script tags as HTML
      expect(body.answer).not.toContain("<script>");
    }
  });

  test("Oversized JSON body → handled gracefully", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {
      question: "A".repeat(50_000),
    });
    expect([400, 401, 413]).toContain(res.status());
  });

  test("Non-JSON body to POST endpoint → 400 or 401", async ({ request }) => {
    const res = await request.post("http://localhost:3000/api/advisor", {
      data: "not json at all !!!",
      headers: { "Content-Type": "text/plain" },
    });
    expect([400, 401, 415]).toContain(res.status());
  });

  test("Prototype pollution payload in JSON body", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {
      "__proto__": { admin: true },
      "constructor": { prototype: { admin: true } },
      question: "test",
    });
    expect([200, 400, 401]).toContain(res.status());
    // Server must not crash — no 5xx
    expect(res.status()).toBeLessThan(500);
  });

  test("Multiple concurrent requests — server does not crash", async ({ request }) => {
    const requests = Array.from({ length: 10 }, () =>
      apiPost(request, "/api/advisor", { question: "concurrent test" })
    );
    const responses = await Promise.all(requests);
    // All should return structured responses, none 5xx
    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});

test.describe("Cross-role UI bypass — requires authenticated session", () => {
  test.describe("as consumer", () => {
    test.use({ storageState: CONSUMER_STATE });
    test.beforeEach(async ({}, testInfo) => {
      if (!sessionAvailable(CONSUMER_STATE)) {
        testInfo.skip(true, "Consumer session not available — run global-setup (needs Supabase email auth configured)");
      }
    });

    test("consumer accessing /farmer/crops → redirected to /consumer", async ({ page }) => {
      // proxy.ts checks users.role = 'consumer' ≠ 'farmer' → redirects to /consumer
      await page.goto("/farmer/crops", { waitUntil: "commit" });
      await page.waitForURL("**/consumer**", { timeout: 8_000 });
      expect(page.url()).toContain("/consumer");
      expect(page.url()).not.toContain("/farmer");
    });
  });

  test.describe("as farmer", () => {
    test.use({ storageState: FARMER_STATE });
    test.beforeEach(async ({}, testInfo) => {
      if (!sessionAvailable(FARMER_STATE)) {
        testInfo.skip(true, "Farmer session not available — run global-setup (needs Supabase email auth configured)");
      }
    });

    test("farmer accessing /government → redirected to /farmer", async ({ page }) => {
      await page.goto("/government", { waitUntil: "commit" });
      await page.waitForURL("**/farmer**", { timeout: 8_000 });
      expect(page.url()).toContain("/farmer");
      expect(page.url()).not.toContain("/government");
    });
  });

  test.describe("as government", () => {
    test.use({ storageState: GOVT_STATE });
    test.beforeEach(async ({}, testInfo) => {
      if (!sessionAvailable(GOVT_STATE)) {
        testInfo.skip(true, "Government session not available — run global-setup (needs Supabase email auth configured)");
      }
    });

    test("government user accessing /consumer/shop → redirected to /government", async ({ page }) => {
      await page.goto("/consumer/shop", { waitUntil: "commit" });
      await page.waitForURL("**/government**", { timeout: 8_000 });
      expect(page.url()).toContain("/government");
      expect(page.url()).not.toContain("/consumer");
    });
  });
});
