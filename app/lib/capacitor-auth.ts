"use client";
/**
 * Native Android OAuth handler for Capacitor.
 *
 * Problem: Chrome Custom Tabs (opened by @capacitor/browser) and the
 * Capacitor WebView have separate cookie stores on Android. After Google
 * OAuth completes and the deep link growise://auth/callback?code=... fires,
 * the WebView does NOT automatically receive the Supabase session.
 *
 * Solution: listen for App URL open events, parse the code + role, call
 * exchangeCodeForSession(), upsert the users table, then navigate.
 *
 * Called once from app/login/page.tsx useEffect on native platforms.
 */

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";

const ALLOWED_ROLES = new Set(["farmer", "consumer", "government"]);

function sanitizeRole(raw: string | null): string {
  if (!raw) return "consumer";
  const decoded = decodeURIComponent(raw).trim().toLowerCase();
  return ALLOWED_ROLES.has(decoded) ? decoded : "consumer";
}

export function registerNativeAuthListener(
  onSuccess: (role: string) => void,
  onError: (message: string) => void
): () => void {
  const handle = App.addListener("appUrlOpen", async (event) => {
    const url = event.url;

    // Only handle our own deep link
    if (!url.startsWith("growise://auth/callback")) return;

    try {
      await Browser.close();
    } catch { /* Browser may already be closed */ }

    const parsed = new URL(url.replace("growise://", "https://growise.invalid/"));
    const code  = parsed.searchParams.get("code");
    const role  = sanitizeRole(parsed.searchParams.get("role"));

    if (!code) {
      onError("OAuth callback missing code parameter.");
      return;
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      onError(error?.message ?? "Session exchange failed.");
      return;
    }

    // Upsert role into users table (same as /auth/complete on web)
    try {
      const { error: upsertErr } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? "",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "User",
          role,
        },
        { onConflict: "id" }
      );
      if (upsertErr) {
        console.error("[native-auth] users upsert failed:", upsertErr.message);
      }
    } catch (e) {
      console.error("[native-auth] users upsert exception:", e);
    }

    onSuccess(role);
  });

  // Return cleanup function
  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}
