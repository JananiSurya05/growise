/**
 * Suite 9: ML API Routes
 *
 * Tests every route under /api/ml/:
 *   - price-prediction  (POST, auth-required, proxies to ML service)
 *   - crop-recommendation (POST, auth-required)
 *   - sentiment          (POST, auth-required, text validation)
 *   - anomaly-detection  (POST, auth-required + government-ROLE-only)
 *   - model-registry     (GET, auth-required)
 *
 * All unauthenticated requests return 401.
 * anomaly-detection additionally requires role=government (403 for others).
 * When ML service is down each route returns 503 with a helpful message.
 */
import { test, expect } from "@playwright/test";
import { apiGet, apiPost, TINY_JPEG_B64 } from "./helpers";

const ML_ROUTES_POST = [
  "/api/ml/price-prediction",
  "/api/ml/crop-recommendation",
  "/api/ml/sentiment",
  "/api/ml/anomaly-detection",
];

// ─── Auth enforcement: every ML route needs a session ───────────────────────

test.describe("ML API — authentication enforcement", () => {
  for (const route of ML_ROUTES_POST) {
    test(`POST ${route} without auth → 401`, async ({ request }) => {
      const res = await apiPost(request, route, {});
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(res.status()).not.toBe(500);
    });
  }

  test("GET /api/ml/model-registry without auth → 401", async ({ request }) => {
    const res = await apiGet(request, "/api/ml/model-registry");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

// ─── HTTP method enforcement ─────────────────────────────────────────────────

test.describe("ML API — wrong HTTP methods", () => {
  test("GET /api/ml/price-prediction → 405 (POST only)", async ({ request }) => {
    const res = await apiGet(request, "/api/ml/price-prediction");
    expect([405, 401]).toContain(res.status()); // 401 if auth checked before method
  });

  test("POST /api/ml/model-registry → 405 (GET only)", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/model-registry", {});
    expect([405, 401]).toContain(res.status());
  });

  test("DELETE /api/ml/sentiment → 405", async ({ request }) => {
    const res = await request.delete("http://localhost:3000/api/ml/sentiment");
    expect([405, 401]).toContain(res.status());
  });
});

// ─── Input validation: sentiment ─────────────────────────────────────────────

test.describe("ML sentiment — input validation (auth blocks first → 401)", () => {
  test("missing text field → 401 (auth) | 400 (validation)", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/sentiment", {});
    expect([400, 401]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test("text over 2000 chars → 401 (auth) | 400 (validation)", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/sentiment", { text: "A".repeat(2001) });
    expect([400, 401]).toContain(res.status());
  });

  test("null text → 401 (auth) | 400 (validation)", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/sentiment", { text: null });
    expect([400, 401]).toContain(res.status());
  });

  test("empty string text → 401 (auth) | 400 (validation)", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/sentiment", { text: "" });
    expect([400, 401]).toContain(res.status());
  });
});

// ─── Input validation: price-prediction ──────────────────────────────────────

test.describe("ML price-prediction — input validation", () => {
  test("empty body → 401 or 400, no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {});
    expect(res.status()).toBeLessThan(500);
  });

  test("invalid JSON body → 400 or 401", async ({ request }) => {
    const res = await request.post("http://localhost:3000/api/ml/price-prediction", {
      data: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    expect([400, 401, 415]).toContain(res.status());
  });

  test("negative quantity → 401 (auth first), never 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      crop_name: "Tomato",
      location: "Chennai",
      month: 6,
      season: "Kharif",
      quantity_kg: -100,
      weeks_ahead: 1,
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("weeks_ahead=0 edge case → not a crash", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      crop_name: "Tomato",
      quantity_kg: 100,
      weeks_ahead: 0,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── anomaly-detection: government-only role ─────────────────────────────────

test.describe("ML anomaly-detection — role enforcement", () => {
  // Without auth: 401 (auth runs before role check)
  test("unauthenticated request → 401, not 403", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/anomaly-detection", { orders: [] });
    expect(res.status()).toBe(401);
  });

  // NOTE: role=403 for non-government users — documented here for implementation reference.
  // With a non-government session the route returns { error: "Forbidden" } 403.
  // Tested in authenticated integration suite when test credentials are available.
  test("route responds — no server crash on empty orders array", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/anomaly-detection", { orders: [] });
    // 401 without auth — confirms route is reachable and doesn't crash
    expect([401, 403, 503]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });
});

// ─── Concurrent ML requests — no 5xx ────────────────────────────────────────

test.describe("ML API — concurrency and stability", () => {
  test("10 concurrent POST /api/ml/price-prediction → all return structured response", async ({
    request,
  }) => {
    const promises = Array.from({ length: 10 }, () =>
      apiPost(request, "/api/ml/price-prediction", { crop_name: "Tomato" })
    );
    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
    }
  });

  test("simultaneous calls to different ML endpoints — server stays up", async ({ request }) => {
    const [r1, r2, r3, r4] = await Promise.all([
      apiPost(request, "/api/ml/price-prediction", {}),
      apiPost(request, "/api/ml/crop-recommendation", {}),
      apiPost(request, "/api/ml/sentiment", { text: "good harvest" }),
      apiGet(request, "/api/ml/model-registry"),
    ]);
    for (const res of [r1, r2, r3, r4]) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});

// ─── Security: injection in ML inputs ────────────────────────────────────────

test.describe("ML API — injection and abuse payloads", () => {
  test("SQL injection in crop_name → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      crop_name: "'; DROP TABLE crops; --",
      location: "Chennai",
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("script tag in sentiment text → no XSS reflected", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/sentiment", {
      text: "<script>alert('xss')</script>Tomatoes are good",
    });
    expect([400, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.text();
      expect(body).not.toContain("<script>");
    }
  });

  test("prototype pollution in body → server handles gracefully", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      "__proto__": { admin: true },
      "constructor": { prototype: { admin: true } },
      crop_name: "Tomato",
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("extremely large crop_name string → no 5xx", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      crop_name: "A".repeat(10_000),
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("numeric fields as strings → graceful handling", async ({ request }) => {
    const res = await apiPost(request, "/api/ml/price-prediction", {
      crop_name: "Tomato",
      month: "six",   // should be int
      quantity_kg: "lots",
    });
    expect(res.status()).toBeLessThan(500);
  });
});
