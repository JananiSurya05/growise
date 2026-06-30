/**
 * Suite 10: Aggregated API Routes
 *
 * Tests /api/insights, /api/market-intelligence, and /api/consumer/personalized.
 * All three are POST-only, require authentication, and accept JSON bodies with
 * optional crop/location arrays.
 *
 * Since these routes are authenticated, unauthenticated requests always return 401.
 * Body validation is exercised here; the routes gracefully fall back to defaults
 * for missing optional fields (no hard 400 on empty body).
 */
import { test, expect } from "@playwright/test";
import { apiPost, apiGet } from "./helpers";

const AGGREGATED_POST_ROUTES = [
  "/api/insights",
  "/api/market-intelligence",
  "/api/consumer/personalized",
];

// ─── Auth enforcement ────────────────────────────────────────────────────────

test.describe("Aggregated APIs — authentication enforcement", () => {
  for (const route of AGGREGATED_POST_ROUTES) {
    test(`POST ${route} without auth → 401`, async ({ request }) => {
      const res = await apiPost(request, route, {});
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(res.status()).not.toBe(500);
    });
  }
});

// ─── HTTP method enforcement ─────────────────────────────────────────────────

test.describe("Aggregated APIs — wrong HTTP methods", () => {
  test("GET /api/insights → 405 or 401 (POST-only)", async ({ request }) => {
    const res = await apiGet(request, "/api/insights");
    expect([405, 401]).toContain(res.status());
  });

  test("GET /api/market-intelligence → 405 or 401", async ({ request }) => {
    const res = await apiGet(request, "/api/market-intelligence");
    expect([405, 401]).toContain(res.status());
  });

  test("GET /api/consumer/personalized → 405 or 401", async ({ request }) => {
    const res = await apiGet(request, "/api/consumer/personalized");
    expect([405, 401]).toContain(res.status());
  });

  test("DELETE /api/insights → 405 or 401", async ({ request }) => {
    const res = await request.delete("http://localhost:3000/api/insights");
    expect([405, 401]).toContain(res.status());
  });
});

// ─── Invalid body handling ───────────────────────────────────────────────────

test.describe("Aggregated APIs — body validation", () => {
  test("POST /api/insights with malformed JSON → 400 or 401", async ({ request }) => {
    const res = await request.post("http://localhost:3000/api/insights", {
      data: "{{not json}}",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 401]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test("POST /api/market-intelligence with oversized payload → no 5xx", async ({ request }) => {
    const bigCrops = Array.from({ length: 1000 }, (_, i) => ({
      name: `Crop${i}`,
      price: 25,
      quantity: 100,
    }));
    const res = await apiPost(request, "/api/market-intelligence", {
      location: "Chennai",
      crops: bigCrops,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/consumer/personalized with null consumerId → 401 (auth first)", async ({
    request,
  }) => {
    const res = await apiPost(request, "/api/consumer/personalized", {
      consumerId: null,
      location: "Chennai",
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/insights with non-array crops field → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/insights", {
      location: "Chennai",
      crops: "not-an-array",
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/market-intelligence with negative price in crops → no 5xx", async ({
    request,
  }) => {
    const res = await apiPost(request, "/api/market-intelligence", {
      location: "Chennai",
      crops: [{ name: "Tomato", price: -999, quantity: 100 }],
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/insights with empty crops array → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/insights", { location: "Chennai", crops: [] });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

test.describe("Aggregated APIs — rate limit layer", () => {
  /**
   * BEHAVIORAL NOTE: /api/insights checks rate limit BEFORE auth (IP-level limiter).
   * This differs from /api/advisor which checks auth first.
   * With 15 parallel unauthenticated requests, some will get 429 (rate limited)
   * and others 401 (auth). Both are valid — the key invariant is no 5xx.
   *
   * Design gap: unauthenticated callers can consume the rate limit quota.
   * Fix: move auth check before the IP-level rate limiter in insights/route.ts.
   */
  test("POST /api/insights 15x in parallel → all 401 or 429, never 5xx", async ({
    request,
  }) => {
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        apiPost(request, "/api/insights", { location: "Chennai", crops: [] })
      )
    );
    for (const res of results) {
      // Must be auth (401) or rate-limited (429) — never a server crash
      expect([401, 429]).toContain(res.status());
      expect(res.status()).not.toBe(500);
    }
  });
});

// ─── Injection attacks ────────────────────────────────────────────────────────

test.describe("Aggregated APIs — injection payloads", () => {
  test("SQL injection in location → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/insights", {
      location: "'; DROP TABLE crops; --",
      crops: [],
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("XSS in crop name via market-intelligence → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/market-intelligence", {
      location: "<script>alert(1)</script>",
      crops: [{ name: "<img onerror=alert(1)>", price: 25, quantity: 100 }],
    });
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const text = await res.text();
      expect(text).not.toMatch(/<script>/i);
    }
  });

  test("prototype pollution in market-intelligence body", async ({ request }) => {
    const res = await apiPost(request, "/api/market-intelligence", {
      __proto__: { role: "admin" },
      location: "Chennai",
      crops: [],
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/consumer/personalized with XSS in location → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/consumer/personalized", {
      location: "<script>stealCookies()</script>",
    });
    expect(res.status()).toBeLessThan(500);
  });
});
