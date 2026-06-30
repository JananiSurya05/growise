import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Role } from "./app/lib/types";

const isDev = process.env.NODE_ENV !== "production";

const ROUTE_ROLES: Array<{ prefix: string; role: Role }> = [
  { prefix: "/farmer", role: "farmer" },
  { prefix: "/consumer", role: "consumer" },
  { prefix: "/government", role: "government" },
];

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    // unsafe-eval required by React/Turbopack in development for error stack reconstruction
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src stays unsafe-inline: the app renders via inline style={} props app-wide;
    // tightening this requires migrating to the Tailwind token system first.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.openweathermap.org https://*.razorpay.com wss://*.razorpay.com",
    "font-src 'self'",
    "frame-src https://api.razorpay.com https://*.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
  ].join("; ");
}

export async function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);

  const pathname = req.nextUrl.pathname;
  const required = ROUTE_ROLES.find(({ prefix }) => pathname.startsWith(prefix));

  // Auth/role enforcement only applies to role-gated dashboard routes —
  // public pages (landing, login, API routes) must not be redirected here.
  if (!required) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as never);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Enforce role-to-path binding: a consumer cannot access /farmer/* and vice-versa.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== required.role) {
    const actualRole: Role = (profile?.role as Role) ?? "consumer";
    return NextResponse.redirect(new URL(`/${actualRole}`, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};