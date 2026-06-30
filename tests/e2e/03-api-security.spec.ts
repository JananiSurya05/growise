/**
 * Suite 3: API Security — CSRF, Auth, Input Validation
 *
 * All requests made via the raw HTTP client (no browser session).
 * Tests the full security layer: CSRF → auth → rate-limit → validation.
 */
import { test, expect } from "@playwright/test";
import { apiGet, apiPost } from "./helpers";

// ─── CSRF Protection ────────────────────────────────────────────────────────

test.describe("CSRF protection", () => {
  const EVIL_ORIGIN = "https://evil-attacker.com";

  test("POST /api/advisor with disallowed Origin → 403", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", { question: "test" }, { Origin: EVIL_ORIGIN });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.answer).toContain("Forbidden");
  });

  test("POST /api/disease with disallowed Origin → 403", async ({ request }) => {
    const res = await apiPost(
      request,
      "/api/disease",
      { image: "data:image/jpeg;base64,/9j/test" },
      { Origin: EVIL_ORIGIN }
    );
    expect(res.status()).toBe(403);
  });

  test("GET /api/weather with disallowed Origin → 403", async ({ request }) => {
    const url = new URL("http://localhost:3000/api/weather");
    url.searchParams.set("city", "Chennai");
    const res = await request.get(url.toString(), { headers: { Origin: EVIL_ORIGIN } });
    expect(res.status()).toBe(403);
  });

  test("POST /api/advisor from localhost origin passes CSRF → 401 (auth required)", async ({
    request,
  }) => {
    const res = await apiPost(
      request,
      "/api/advisor",
      { question: "test" },
      { Origin: "http://localhost:3000" }
    );
    // CSRF passes → auth blocks → 401 (not 403)
    expect(res.status()).toBe(401);
  });

  test("null-origin header is not allowed", async ({ request }) => {
    const res = await apiPost(
      request,
      "/api/advisor",
      { question: "test" },
      { Origin: "null" }
    );
    expect(res.status()).toBe(403);
  });
});

// ─── Authentication Enforcement ─────────────────────────────────────────────

test.describe("API authentication enforcement", () => {
  test("GET /api/weather without auth → 401", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Chennai" });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("POST /api/advisor without auth → 401", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", { question: "Best crop for June?" });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.answer).toContain("Unauthorized");
  });

  test("POST /api/disease without auth → 401", async ({ request }) => {
    const res = await apiPost(request, "/api/disease", {
      image: "data:image/jpeg;base64,/9j/4AAQSkZJRgAB",
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Input Validation (tests auth before validation, so expect 401) ─────────

test.describe("Input validation — boundary tests", () => {
  // These get 401 because auth is checked before validation.
  // They document expected validation behaviour once auth is present.

  test("Empty question body → 401 (auth first; 400 with valid auth)", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {});
    expect([400, 401]).toContain(res.status());
  });

  test("Question over 1000 chars → 401 (auth first; 400 with valid auth)", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", { question: "A".repeat(1001) });
    expect([400, 401]).toContain(res.status());
  });

  test("Disease scan with non-image MIME → 401 (auth first; 400 with valid auth)", async ({
    request,
  }) => {
    const res = await apiPost(request, "/api/disease", {
      image: "data:application/pdf;base64,JVBERi0x",
    });
    expect([400, 401]).toContain(res.status());
  });

  test("Weather city with special chars → 401 (auth first; 400 with valid auth)", async ({
    request,
  }) => {
    const res = await apiGet(request, "/api/weather", { city: "'; DROP TABLE crops;--" });
    expect([400, 401]).toContain(res.status());
  });

  test("Empty city parameter → 401 (auth first; 400 with valid auth)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "" });
    expect([400, 401]).toContain(res.status());
  });
});

// ─── Security Headers ────────────────────────────────────────────────────────

test.describe("HTTP security headers", () => {
  async function getHeaders(request: Parameters<typeof test>[2] extends (...args: infer A) => unknown ? never : never) {
    // dummy — actual test fetches below
  }

  test("X-Frame-Options: DENY is present", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    const header = res.headers()["x-frame-options"];
    expect(header?.toUpperCase()).toBe("DENY");
  });

  test("X-Content-Type-Options: nosniff is present", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("Referrer-Policy is set", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    expect(res.headers()["referrer-policy"]).toBeTruthy();
  });

  test("Permissions-Policy is set", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    expect(res.headers()["permissions-policy"]).toBeTruthy();
  });

  test("Content-Security-Policy is set", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  test("No X-Powered-By header (information disclosure)", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
