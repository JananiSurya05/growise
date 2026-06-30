// Validates that API requests come from authorized origins.
// Native Capacitor clients send no Origin header — those are allowed.
// Requests with an Origin header must match the configured app URL or localhost.
const ALLOWED_WEB_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost",
  "capacitor://localhost",
].filter(Boolean) as string[]);

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  // No Origin header = direct / native client request — allow
  if (!origin) return true;
  return ALLOWED_WEB_ORIGINS.has(origin);
}
