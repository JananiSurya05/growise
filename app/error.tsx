"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#014D4E",
        fontFamily: "'Segoe UI', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#012e2f",
          border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white", marginBottom: "8px" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: "1.7", marginBottom: "28px" }}>
          An unexpected error occurred. Your data is safe. Please try again or
          return to the home page.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#4ade80",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#0a0a0a",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
