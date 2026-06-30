import Link from "next/link";

export const metadata = {
  title: "404 — Page Not Found | GroWise",
};

export default function NotFound() {
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
          border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: "20px",
          padding: "48px 40px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "52px", marginBottom: "12px" }}>🌿</div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#4ade80",
            lineHeight: 1,
            marginBottom: "8px",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "800",
            color: "white",
            marginBottom: "8px",
          }}
        >
          Page Not Found
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.45)",
            lineHeight: "1.7",
            marginBottom: "32px",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Head back
          to GroWise to continue.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              background: "#4ade80",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#0a0a0a",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go Home
          </Link>
          <Link
            href="/login"
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
            Sign In
          </Link>
        </div>
        <div
          style={{
            marginTop: "32px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          GroWise — Sow Smart. Grow Wise.
        </div>
      </div>
    </main>
  );
}
