import type { Page, APIRequestContext, APIResponse } from "@playwright/test";

// Supabase project ref extracted from NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_URL = "https://egpifbzkdrhezeyjpgmb.supabase.co";
export const SUPABASE_PROJECT = "egpifbzkdrhezeyjpgmb";
export const SESSION_COOKIE = `sb-${SUPABASE_PROJECT}-auth-token`;

// Protected routes → expected role landing
export const PROTECTED_ROUTES = [
  { path: "/farmer", role: "farmer" },
  { path: "/farmer/crops", role: "farmer" },
  { path: "/farmer/advisor", role: "farmer" },
  { path: "/farmer/disease", role: "farmer" },
  { path: "/farmer/weather", role: "farmer" },
  { path: "/farmer/income", role: "farmer" },
  { path: "/farmer/sales", role: "farmer" },
  { path: "/consumer", role: "consumer" },
  { path: "/consumer/shop", role: "consumer" },
  { path: "/consumer/qr", role: "consumer" },
  { path: "/consumer/orders", role: "consumer" },
  { path: "/government", role: "government" },
];

/**
 * Mock the Supabase client-side calls so client components think a user is
 * authenticated. Note: this does NOT bypass the server-side proxy (Next.js
 * middleware) — protected pages still redirect to /login unless a real session
 * cookie is present. Use only for API route tests or pages that fetch their own
 * auth state client-side without the proxy.
 */
export async function mockClientAuth(
  page: Page,
  role: "farmer" | "consumer" | "government",
  userId = "test-user-00000000"
) {
  const mockUser = {
    id: userId,
    email: "test@growise.test",
    role: "authenticated",
    aud: "authenticated",
    user_metadata: { full_name: "Test User" },
    app_metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockProfile = [
    { id: userId, name: "Test User", email: "test@growise.test", role, location: "Chennai" },
  ];

  // Intercept Supabase auth user endpoint
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockUser) });
  });

  // Intercept users table query
  await page.route(`${SUPABASE_URL}/rest/v1/users*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockProfile) });
  });
}

/** Mock empty Supabase table responses for data-fetching components */
export async function mockEmptyTables(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/crops*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route(`${SUPABASE_URL}/rest/v1/orders*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route(`${SUPABASE_URL}/rest/v1/order_items*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

/** Issue a direct API call with no session (raw HTTP, not browser) */
export async function apiGet(request: APIRequestContext, path: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost:3000${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return request.get(url.toString());
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  return request.post(`http://localhost:3000${path}`, {
    data: body,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

/** Measure navigation timing for a page load */
export async function measureLoadTime(page: Page, url: string): Promise<{
  ttfb: number;
  domContentLoaded: number;
  loadComplete: number;
  lcp: number | null;
}> {
  await page.goto(url, { waitUntil: "load" });

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  // LCP via PerformanceObserver snapshot
  const lcp = await page.evaluate(() =>
    new Promise<number | null>((resolve) => {
      let lcpValue: number | null = null;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) lcpValue = (entries[entries.length - 1] as PerformanceEntry).startTime;
      });
      try {
        observer.observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => { observer.disconnect(); resolve(lcpValue); }, 2000);
      } catch { resolve(null); }
    })
  );

  return { ...timing, lcp };
}

/** Collect all browser console errors on a page */
export async function collectConsoleErrors(page: Page, url: string): Promise<string[]> {
  const errors: string[] = [];
  const handler = (msg: import("@playwright/test").ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  page.on("console", handler);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  page.off("console", handler);
  return errors;
}

/** Send a request with a wrong HTTP method to an endpoint */
export async function wrongMethod(
  request: APIRequestContext,
  method: "GET" | "PUT" | "PATCH" | "DELETE",
  path: string
): Promise<APIResponse> {
  const url = `http://localhost:3000${path}`;
  switch (method) {
    case "GET":    return request.get(url);
    case "PUT":    return request.put(url, { data: {}, headers: { "Content-Type": "application/json" } });
    case "PATCH":  return request.patch(url, { data: {}, headers: { "Content-Type": "application/json" } });
    case "DELETE": return request.delete(url);
  }
}

/** Minimal valid crop payload for API / business-logic tests */
export const VALID_CROP_PAYLOAD = {
  name: "Tomato",
  price: 25,
  quantity: 100,
  location: "Chennai",
};

/** Minimal valid advisor question */
export const VALID_QUESTION = "What crop should I grow in June in Tamil Nadu?";

/** A 1×1 pixel JPEG in base64 (smallest valid JPEG) */
export const TINY_JPEG_B64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDB" +
  "QNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ" +
  "CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
  "MjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAA" +
  "AAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAA" +
  "AD/2gAMAwEAAhEDEQA/AJUA/9k=";

/** Minimum invalid inputs used across boundary tests */
export const BOUNDARY_PAYLOADS = {
  emptyObject: {},
  nullQuestion: { question: null },
  numericQuestion: { question: 42 },
  emptyQuestion: { question: "" },
  longQuestion: { question: "A".repeat(1001) },
  sqlInjection: { question: "'; DROP TABLE crops; --" },
  xssPayload: { question: "<script>alert(document.cookie)</script>" },
  protoPoison: { __proto__: { admin: true }, question: "test" },
  templateLiteral: { question: "${process.env.GROQ_API_KEY}" },
};
