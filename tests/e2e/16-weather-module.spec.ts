/**
 * Suite 16: Weather Module
 *
 * /api/weather is a GET endpoint with:
 *  - CSRF check (Origin header)
 *  - Auth enforcement (Supabase session)
 *  - Rate limit: 30 req / 60s per user
 *  - Input validation: city must match /^[a-zA-Z\s\-'.]+$/, max 100 chars
 *
 * All city validation tests return 401 here (auth blocks before validation),
 * but the expected status with valid auth is documented in comments.
 */
import { test, expect } from "@playwright/test";
import { apiGet } from "./helpers";

// ─── Auth enforcement ─────────────────────────────────────────────────────────

test.describe("Weather API — authentication", () => {
  test("GET /api/weather without auth → 401", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Chennai" });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("GET /api/weather without city param → 401 (auth first)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather");
    expect([400, 401]).toContain(res.status());
  });
});

// ─── Input validation (returns 401 because auth runs first) ──────────────────

test.describe("Weather API — input validation (auth blocks first)", () => {
  const INVALID_CITIES = [
    { value: "",        desc: "empty city"                },
    { value: "A".repeat(101), desc: "city > 100 chars"   },
    { value: "123",     desc: "numeric city"              },
    { value: "'; DROP TABLE crops; --", desc: "SQL injection" },
    { value: "<script>alert(1)</script>", desc: "XSS in city" },
    { value: "Chennai; ls -la", desc: "command injection" },
    { value: "\x00Chennai", desc: "null byte prefix"      },
    { value: "%00",     desc: "URL-encoded null byte"     },
  ];

  for (const { value, desc } of INVALID_CITIES) {
    test(`city: ${desc} → 400 or 401`, async ({ request }) => {
      const res = await apiGet(request, "/api/weather", { city: value });
      expect([400, 401]).toContain(res.status());
      expect(res.status()).not.toBe(200);
      expect(res.status()).not.toBe(500);
    });
  }

  test("city with only spaces → 400 or 401 (empty after trim)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "   " });
    expect([400, 401]).toContain(res.status());
  });

  test("city with unicode characters → 400 or 401", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Chénnai" });
    // Either 400 (invalid chars) or 401 (auth first)
    expect([400, 401]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test("city with emoji → 400 or 401", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Chennai🌱" });
    expect([400, 401]).toContain(res.status());
  });

  // Valid-format cities (allowed chars) but auth still blocks
  test("Valid city name format 'Chennai' → 401 (auth required)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Chennai" });
    expect(res.status()).toBe(401);
  });

  test("Valid city with hyphen 'Kochi-Ernakulam' → 401 (auth required)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "Kochi-Ernakulam" });
    expect(res.status()).toBe(401);
  });

  test("Valid city with apostrophe → 401 (auth required)", async ({ request }) => {
    const res = await apiGet(request, "/api/weather", { city: "O'Brien City" });
    expect(res.status()).toBe(401);
  });
});

// ─── CSRF protection on weather ──────────────────────────────────────────────

test.describe("Weather API — CSRF", () => {
  test("GET /api/weather from evil origin → 403", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai", {
      headers: { Origin: "https://evil.com" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  test("GET /api/weather from null origin → 403", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai", {
      headers: { Origin: "null" },
    });
    expect(res.status()).toBe(403);
  });

  test("GET /api/weather with no Origin → auth check (401, not 403)", async ({ request }) => {
    // No Origin header = direct/native client → CSRF passes → auth blocks
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai");
    expect(res.status()).toBe(401); // auth, not CSRF
  });
});

// ─── Concurrency ──────────────────────────────────────────────────────────────

test.describe("Weather API — concurrency", () => {
  test("20 concurrent GET requests → all return structured response, no 5xx", async ({
    request,
  }) => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        apiGet(request, "/api/weather", { city: "Chennai" })
      )
    );
    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
      // All should be 401 since no session
      expect(res.status()).toBe(401);
    }
  });
});

// ─── Authenticated scenarios (documented) ────────────────────────────────────

test.describe("Weather — authenticated scenarios (skipped — need farmer session)", () => {
  test.skip("Valid city returns temperature, humidity, description", async ({ page }) => {
    // REQUIRES FARMER AUTH
    // Navigate to /farmer/weather → search 'Chennai'
    // Expected: temperature card, humidity %, weather description visible
  });

  test.skip("Invalid city shows 'City not found' error", async ({ page }) => {
    // REQUIRES FARMER AUTH
    // Search for 'XYZNotACity' → Expected: error message below search box
  });

  test.skip("City with special characters shows validation error", async ({ page }) => {
    // REQUIRES FARMER AUTH
    // Type "'; alert(1)" in city field → Expected: input rejected / 400 error shown
  });

  test.skip("Empty city search shows 'City name is required' error", async ({ page }) => {
    // REQUIRES FARMER AUTH
    // Click search with empty field → Expected: validation message
  });

  test.skip("Rate limit: 31 rapid searches → 29th+ shows rate limit message", async ({ page }) => {
    // REQUIRES FARMER AUTH
    // Make 31 rapid city searches → Expected: rate limit message shown in UI
    // Rate: 30 req / 60s
  });
});
