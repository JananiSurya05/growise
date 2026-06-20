"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ALLOWED_ROLES = new Set(["farmer", "consumer", "government"]);

const Spinner = () => (
  <div style={{
    minHeight: "100vh",
    background: "#014D4E",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    gap: "16px",
  }}>
    <div style={{ fontSize: "28px" }}>🌿</div>
    <div style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
      Gro<span style={{ color: "#4ade80" }}>Wise</span>
    </div>
    <div style={{ width: "36px", height: "36px", border: "3px solid rgba(74,222,128,0.3)", borderTop: "3px solid #4ade80", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function AuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Signing you in...");
  // PKCE codes are single-use — React Strict Mode double-invokes this effect in dev,
  // so guard against exchanging the same code twice.
  const exchangedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const rawRole = params.get("role") ?? "consumer";
    const role = ALLOWED_ROLES.has(rawRole) ? rawRole : "consumer";

    if (!code) {
      router.replace("/login");
      return;
    }

    if (exchangedCodeRef.current === code) return;
    exchangedCodeRef.current = code;

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error || !data.user) {
        console.error("[auth/complete] exchangeCodeForSession failed:", error);
        setStatus("Authentication failed. Redirecting...");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      // Upsert user record — required for proxy role enforcement
      try {
        const { error: upsertError } = await supabase.from("users").upsert(
          {
            id: data.user.id,
            email: data.user.email ?? "",
            name: data.user.user_metadata?.full_name ?? data.user.email ?? "User",
            role,
          },
          { onConflict: "id" }
        );
        if (upsertError) {
          console.error("[auth/complete] role upsert failed:", upsertError.message);
          setStatus("Profile setup incomplete — you may land on the wrong dashboard.");
        }
      } catch (e) {
        console.error("[auth/complete] role upsert exception:", e);
      }

      setStatus(`Welcome! Taking you to your dashboard...`);
      router.replace(`/${role}`);
    });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#014D4E",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      gap: "16px",
    }}>
      <div style={{ fontSize: "28px" }}>🌿</div>
      <div style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
        Gro<span style={{ color: "#4ade80" }}>Wise</span>
      </div>
      <div style={{ width: "36px", height: "36px", border: "3px solid rgba(74,222,128,0.3)", borderTop: "3px solid #4ade80", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{status}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthComplete() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCompleteInner />
    </Suspense>
  );
}