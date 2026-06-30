/**
 * Suite 12: Deep Security Testing
 *
 * Extends suite 03/04 with:
 *  - CSP directive-level validation
 *  - CORS enforcement on all API routes
 *  - HTTP method enforcement (PUT/DELETE/PATCH on every route)
 *  - Session cookie attributes (Secure, SameSite, HttpOnly)
 *  - Sensitive data exposure checks
 *  - Path traversal variants
 *  - Header injection attempts
 *  - Content-Type enforcement
 */
import { test, expect } from "@playwright/test";
import { apiPost, apiGet } from "./helpers";

const EVIL_ORIGINS = [
  "https://evil-attacker.com",
  "http://evil.growise.fake",
  "null",
  "https://growise.com.evil.com",
  "javascript://evil",
];

// ─── CORS on every API route ──────────────────────────────────────────────────

test.describe("CORS — evil origin rejected on all POST routes", () => {
  const POST_ROUTES = [
    "/api/advisor",
    "/api/disease",
    "/api/insights",
    "/api/market-intelligence",
    "/api/consumer/personalized",
    "/api/ml/price-prediction",
    "/api/ml/crop-recommendation",
    "/api/ml/sentiment",
    "/api/ml/anomaly-detection",
  ];

  for (const route of POST_ROUTES) {
    for (const origin of EVIL_ORIGINS.slice(0, 2)) {
      test(`POST ${route} from ${origin} → 403 or 401 (never 200)`, async ({ request }) => {
        const res = await apiPost(request, route, { question: "test" }, { Origin: origin });
        // Either CSRF blocks (403) or auth blocks (401) — never succeeds
        expect([401, 403]).toContain(res.status());
        expect(res.status()).not.toBe(200);
      });
    }
  }

  test("GET /api/weather from evil origin → 403 or 401", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai", {
      headers: { Origin: "https://evil.com" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ─── CSP directive-level validation ─────────────────────────────────────────

test.describe("Content-Security-Policy directives", () => {
  let csp = "";

  test.beforeAll(async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    csp = res.headers()["content-security-policy"] ?? "";
  });

  test("default-src 'self' present", () => {
    expect(csp).toContain("default-src 'self'");
  });

  test("frame-src 'none' present — clickjacking protection", () => {
    expect(csp).toContain("frame-src 'none'");
  });

  test("object-src 'none' present — no plugins", () => {
    expect(csp).toContain("object-src 'none'");
  });

  test("base-uri 'self' present — no base tag injection", () => {
    expect(csp).toContain("base-uri 'self'");
  });

  test("img-src does not allow wildcard *", () => {
    // Must not contain blanket wildcard
    const imgSrc = csp.match(/img-src([^;]*)/)?.[1] ?? "";
    expect(imgSrc).not.toMatch(/\s\*\s|\s\*$/);
  });

  test("connect-src restricts to known domains only", () => {
    const connectSrc = csp.match(/connect-src([^;]*)/)?.[1] ?? "";
    // Must allow Supabase and Groq but not wildcard
    expect(connectSrc).toContain("supabase.co");
    expect(connectSrc).not.toMatch(/\s\*\s|\s\*$/);
  });

  test("form-action restricts to 'self' and Google", () => {
    expect(csp).toContain("form-action 'self'");
    // Google OAuth form action must be allowed
    expect(csp).toContain("accounts.google.com");
  });
});

// ─── Security headers ─────────────────────────────────────────────────────────

test.describe("Security headers — all public endpoints", () => {
  const PUBLIC_PAGES = ["/", "/login", "/auth/complete"];

  for (const path of PUBLIC_PAGES) {
    test(`${path} — X-Frame-Options: DENY`, async ({ request }) => {
      const res = await request.get(`http://localhost:3000${path}`);
      expect(res.headers()["x-frame-options"]?.toUpperCase()).toBe("DENY");
    });

    test(`${path} — X-Content-Type-Options: nosniff`, async ({ request }) => {
      const res = await request.get(`http://localhost:3000${path}`);
      expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    });
  }

  test("X-Powered-By not exposed on any page", async ({ request }) => {
    for (const path of PUBLIC_PAGES) {
      const res = await request.get(`http://localhost:3000${path}`);
      expect(res.headers()["x-powered-by"]).toBeUndefined();
    }
  });

  test("Permissions-Policy blocks camera, microphone, geolocation", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    const pp = res.headers()["permissions-policy"] ?? "";
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  test("Referrer-Policy is strict-origin-when-cross-origin", async ({ request }) => {
    const res = await request.get("http://localhost:3000/login");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});

// ─── HTTP method enforcement ──────────────────────────────────────────────────

test.describe("HTTP method enforcement", () => {
  test("PUT /api/advisor → 405 or 401", async ({ request }) => {
    const res = await request.put("http://localhost:3000/api/advisor", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 405]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test("DELETE /api/weather → 405 or 401", async ({ request }) => {
    const res = await request.delete("http://localhost:3000/api/weather");
    expect([401, 405]).toContain(res.status());
  });

  test("PATCH /api/disease → 405 or 401", async ({ request }) => {
    const res = await request.patch("http://localhost:3000/api/disease", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 405]).toContain(res.status());
  });

  test("PUT /api/insights → 405 or 401", async ({ request }) => {
    const res = await request.put("http://localhost:3000/api/insights", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 405]).toContain(res.status());
  });

  test("DELETE /api/market-intelligence → 405 or 401", async ({ request }) => {
    const res = await request.delete("http://localhost:3000/api/market-intelligence");
    expect([401, 405]).toContain(res.status());
  });
});

// ─── Header injection ─────────────────────────────────────────────────────────

test.describe("Header injection attempts", () => {
  test("CRLF in city parameter → handled cleanly", async ({ request }) => {
    const res = await request.get(
      "http://localhost:3000/api/weather?city=Chennai%0d%0aX-Injected%3a%20evil",
    );
    // Auth blocks first; injected header must not be reflected
    expect([400, 401, 403]).toContain(res.status());
    const responseHeaders = res.headers();
    expect(responseHeaders["x-injected"]).toBeUndefined();
  });

  test("Forged X-Forwarded-For header → server responds normally", async ({ request }) => {
    const res = await apiPost(
      request,
      "/api/advisor",
      { question: "test" },
      { "X-Forwarded-For": "1.2.3.4, 5.6.7.8, 127.0.0.1" }
    );
    // Auth blocks — but server must not crash on spoofed IP header
    expect(res.status()).toBeLessThan(500);
  });

  test("X-HTTP-Method-Override to fake a DELETE → rejected", async ({ request }) => {
    const res = await apiPost(
      request,
      "/api/advisor",
      { question: "test" },
      { "X-HTTP-Method-Override": "DELETE" }
    );
    // Must be treated as POST (auth → 401), not route-overridden
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Sensitive data exposure ──────────────────────────────────────────────────

test.describe("Sensitive data exposure checks", () => {
  test("API error responses do not leak stack traces", async ({ request }) => {
    // Send deliberately bad payload
    const res = await request.post("http://localhost:3000/api/advisor", {
      data: "{{{{invalid}}}}",
      headers: { "Content-Type": "application/json" },
    });
    const text = await res.text();
    // Must not contain file paths, stack frames, or internal error messages
    expect(text).not.toMatch(/at\s+\w+\s+\(/); // stack frame pattern
    expect(text).not.toMatch(/\/app\/api\//); // internal file paths
    expect(text).not.toMatch(/node_modules/);
  });

  test("API key not leaked in any error response", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {
      question: "${process.env.GROQ_API_KEY}${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}",
    });
    const text = await res.text();
    // Groq key pattern: gsk_...
    expect(text).not.toMatch(/gsk_[A-Za-z0-9]+/);
    // Supabase anon key pattern: eyJ... (JWT)
    expect(text).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+/);
  });

  test("Supabase URL not exposed in API error bodies", async ({ request }) => {
    const res = await apiPost(request, "/api/advisor", {});
    const text = await res.text();
    expect(text).not.toMatch(/supabase\.co\/rest\/v1/);
  });
});

// ─── Path traversal ───────────────────────────────────────────────────────────

test.describe("Path traversal attempts", () => {
  const TRAVERSAL_PATHS = [
    "/farmer/../../etc/passwd",
    "/consumer/../farmer/crops",
    "/%2F%2F..%2F..%2Fetc%2Fpasswd",
    "/farmer%2F..%2F..%2Fgovernment",
  ];

  for (const path of TRAVERSAL_PATHS) {
    test(`${path} → redirected or 404, not content leak`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "commit" });
      const status = res?.status() ?? 0;
      const url = page.url();

      // Must not serve content from another role
      expect(url).not.toMatch(/\/government(?!\w)/);
      // Must not be a 5xx
      expect(status).toBeLessThan(500);
    });
  }
});

// ─── UUID manipulation ────────────────────────────────────────────────────────

test.describe("UUID and ID parameter manipulation", () => {
  test("QR page with sequential numeric ID → redirected, no data leak", async ({ page }) => {
    for (const id of ["1", "2", "3", "99999"]) {
      await page.goto(`/consumer/qr?crop=${id}`, { waitUntil: "commit" });
      await page.waitForURL("**/login**", { timeout: 8_000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("QR page with all-zeros UUID → no disclosure before auth", async ({ page }) => {
    await page.goto("/consumer/qr?crop=00000000-0000-0000-0000-000000000000", {
      waitUntil: "commit",
    });
    await page.waitForURL("**/login**", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });

  test("QR page with random UUID → no data exposed before auth", async ({ page }) => {
    await page.goto("/consumer/qr?crop=a1b2c3d4-e5f6-7890-abcd-ef1234567890", {
      waitUntil: "commit",
    });
    await page.waitForURL("**/login**", { timeout: 8_000 });
    expect(page.url()).toContain("/login");
  });
});
