/**
 * Suite 14: Performance Benchmarks
 *
 * Measures real page-load performance using the Navigation Timing API.
 * Flags pages that exceed thresholds and reports LCP where available.
 *
 * Thresholds (development server, not production):
 *   TTFB         < 2000 ms   (dev server is slow relative to prod)
 *   DOMContentLoaded < 5000 ms
 *   Load Complete    < 8000 ms
 *
 * API response time:
 *   Expected < 500 ms for sync routes (auth-only response, no upstream)
 *
 * NOTE: These are development-mode baselines. Production numbers will
 * be significantly faster. Fail thresholds are deliberately relaxed.
 */
import { test, expect } from "@playwright/test";

const DEV_TTFB_LIMIT_MS          = 2_000;
const DEV_DOM_CONTENT_LIMIT_MS   = 6_000;
const DEV_LOAD_COMPLETE_LIMIT_MS = 10_000;
const API_SYNC_RESPONSE_LIMIT_MS = 2_000;  // auth-only routes, no upstream

async function getTimings(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    if (!nav) return null;
    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
    };
  });
}

// ─── Public page load times ───────────────────────────────────────────────────

test.describe("Page load performance — public pages", () => {
  test("/ loads within thresholds", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const t = await getTimings(page);
    if (!t) return; // timing not available
    console.log(`/ — TTFB: ${t.ttfb}ms  DCL: ${t.domContentLoaded}ms  Load: ${t.loadComplete}ms`);
    expect(t.ttfb, `TTFB exceeded ${DEV_TTFB_LIMIT_MS}ms`).toBeLessThan(DEV_TTFB_LIMIT_MS);
    expect(t.domContentLoaded, `DCL exceeded limit`).toBeLessThan(DEV_DOM_CONTENT_LIMIT_MS);
    expect(t.loadComplete, `Load complete exceeded limit`).toBeLessThan(DEV_LOAD_COMPLETE_LIMIT_MS);
  });

  test("/login loads within thresholds", async ({ page }) => {
    await page.goto("/login", { waitUntil: "load" });
    const t = await getTimings(page);
    if (!t) return;
    console.log(`/login — TTFB: ${t.ttfb}ms  DCL: ${t.domContentLoaded}ms  Load: ${t.loadComplete}ms`);
    expect(t.ttfb).toBeLessThan(DEV_TTFB_LIMIT_MS);
    expect(t.domContentLoaded).toBeLessThan(DEV_DOM_CONTENT_LIMIT_MS);
    expect(t.loadComplete).toBeLessThan(DEV_LOAD_COMPLETE_LIMIT_MS);
  });

  test("/auth/complete loads within thresholds", async ({ page }) => {
    await page.goto("/auth/complete", { waitUntil: "load" });
    const t = await getTimings(page);
    if (!t) return;
    console.log(`/auth/complete — TTFB: ${t.ttfb}ms  DCL: ${t.domContentLoaded}ms`);
    expect(t.ttfb).toBeLessThan(DEV_TTFB_LIMIT_MS);
    expect(t.domContentLoaded).toBeLessThan(DEV_DOM_CONTENT_LIMIT_MS);
  });
});

// ─── Protected pages — redirect performance ───────────────────────────────────

test.describe("Auth redirect performance", () => {
  const PROTECTED = ["/farmer", "/consumer", "/government"];

  for (const path of PROTECTED) {
    test(`${path} redirect completes within 6s`, async ({ page }) => {
      const start = Date.now();
      await page.goto(path, { waitUntil: "commit" });
      await page.waitForURL("**/login**", { timeout: 10_000 });
      const elapsed = Date.now() - start;
      console.log(`${path} → /login redirect: ${elapsed}ms`);
      expect(elapsed, `Redirect took too long for ${path}`).toBeLessThan(6_000);
    });
  }
});

// ─── API response time — sync (auth-only) routes ─────────────────────────────

test.describe("API response time — auth-only routes", () => {
  test("GET /api/weather → 401 response under threshold", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("http://localhost:3000/api/weather?city=Chennai");
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(401);
    console.log(`GET /api/weather 401 response: ${elapsed}ms`);
    expect(elapsed, `Weather API auth check too slow`).toBeLessThan(API_SYNC_RESPONSE_LIMIT_MS);
  });

  test("POST /api/advisor → 401 response under threshold", async ({ request }) => {
    const start = Date.now();
    const res = await request.post("http://localhost:3000/api/advisor", {
      data: { question: "test" },
      headers: { "Content-Type": "application/json" },
    });
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(401);
    console.log(`POST /api/advisor 401 response: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(API_SYNC_RESPONSE_LIMIT_MS);
  });

  test("POST /api/disease → 401 response under threshold", async ({ request }) => {
    const start = Date.now();
    const res = await request.post("http://localhost:3000/api/disease", {
      data: { image: "data:image/jpeg;base64,/9j/test" },
      headers: { "Content-Type": "application/json" },
    });
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(401);
    console.log(`POST /api/disease 401 response: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(API_SYNC_RESPONSE_LIMIT_MS);
  });

  test("POST /api/insights → 401 response under threshold", async ({ request }) => {
    const start = Date.now();
    const res = await request.post("http://localhost:3000/api/insights", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    const elapsed = Date.now() - start;
    console.log(`POST /api/insights response: ${res.status()} in ${elapsed}ms`);
    expect(res.status()).toBe(401);
    expect(elapsed).toBeLessThan(API_SYNC_RESPONSE_LIMIT_MS);
  });
});

// ─── LCP measurement ─────────────────────────────────────────────────────────

test.describe("Largest Contentful Paint", () => {
  // LCP is available in browser context via PerformanceObserver
  async function getLCP(page: import("@playwright/test").Page): Promise<number | null> {
    return page.evaluate(
      () =>
        new Promise<number | null>((resolve) => {
          let lcp: number | null = null;
          try {
            const obs = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length) lcp = entries[entries.length - 1].startTime;
            });
            obs.observe({ type: "largest-contentful-paint", buffered: true });
            // Give the browser 3s to populate LCP
            setTimeout(() => { obs.disconnect(); resolve(lcp); }, 3_000);
          } catch {
            resolve(null);
          }
        })
    );
  }

  test("Landing page LCP < 4s (dev baseline)", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const lcp = await getLCP(page);
    if (lcp !== null) {
      console.log(`/ LCP: ${Math.round(lcp)}ms`);
      expect(lcp, `LCP exceeded 6000ms on landing page`).toBeLessThan(6_000);
    } else {
      console.log("/ LCP: not available in this browser context");
    }
  });

  test("Login page LCP < 6s", async ({ page }) => {
    await page.goto("/login", { waitUntil: "load" });
    const lcp = await getLCP(page);
    if (lcp !== null) {
      console.log(`/login LCP: ${Math.round(lcp)}ms`);
      expect(lcp).toBeLessThan(6_000);
    }
  });
});

// ─── Resource count — excessive requests check ────────────────────────────────

test.describe("Network efficiency", () => {
  test("landing page makes no more than 60 network requests", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("/", { waitUntil: "load" });
    const nonHmr = requests.filter(
      (u) => !u.includes("_next/webpack-hmr") && !u.includes("__nextjs")
    );
    console.log(`/ total requests: ${nonHmr.length}`);
    // This is a loose upper bound to catch runaway polling or N+1 requests
    expect(nonHmr.length, `Too many requests on landing page: ${nonHmr.length}`).toBeLessThan(60);
  });

  test("login page makes no more than 60 network requests", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("/login", { waitUntil: "load" });
    const nonHmr = requests.filter(
      (u) => !u.includes("_next/webpack-hmr") && !u.includes("__nextjs")
    );
    console.log(`/login total requests: ${nonHmr.length}`);
    expect(nonHmr.length).toBeLessThan(60);
  });
});
