import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["farmer", "consumer", "government"]);

function sanitizeRole(raw: string | null): string {
  if (!raw) return "consumer";
  const decoded = decodeURIComponent(raw).trim().toLowerCase();
  return ALLOWED_ROLES.has(decoded) ? decoded : "consumer";
}

// Redirect to client-side page that handles exchangeCodeForSession so the
// session lands in document.cookie via createBrowserClient (readable by proxy.ts).
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/growise_pending_role=([^;]+)/);
  const role = sanitizeRole(match?.[1] ?? null);

  const target = new URL("/auth/complete", origin);
  if (code) target.searchParams.set("code", code);
  target.searchParams.set("role", role);

  const response = NextResponse.redirect(target);
  // Clear the pending role cookie
  response.cookies.set("growise_pending_role", "", { maxAge: 0, path: "/" });
  return response;
}
