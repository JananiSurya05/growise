"use client";
import { supabase } from "../lib/supabase";

const NAV_ITEMS = [
  { icon: "⚡", label: "Dashboard", href: "/farmer" },
  { icon: "🌱", label: "My Crops", href: "/farmer/crops" },
  { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
  { icon: "📸", label: "Disease Scan", href: "/farmer/disease" },
  { icon: "🌤️", label: "Weather", href: "/farmer/weather" },
  { icon: "💰", label: "Income", href: "/farmer/income" },
  { icon: "📊", label: "Sales", href: "/farmer/sales" },
];

export default function FarmerSidebar({ activeHref, firstName }: { activeHref: string; firstName: string }) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div
      className="sidebar"
      style={{
        width: "200px",
        flexShrink: 0,
        background: "rgba(0,0,0,0.25)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        position: "fixed",
        height: "100vh",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
        <span style={{ fontSize: "18px" }}>🌿</span>
        <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
          Gro<span style={{ color: "#4ade80" }}>Wise</span>
        </span>
      </div>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>

      <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 8px 14px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "rgba(74,222,128,0.2)",
            border: "2px solid rgba(74,222,128,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            marginBottom: "6px",
          }}
        >
          {firstName[0]}
        </div>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{firstName}</div>
        <div style={{ fontSize: "10px", color: "#4ade80" }}>● Online · Farmer</div>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <a key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 10px",
                  borderRadius: "8px",
                  background: active ? "rgba(74,222,128,0.12)" : "transparent",
                  border: active ? "1px solid rgba(74,222,128,0.22)" : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: active ? "600" : "400", color: active ? "#4ade80" : "rgba(255,255,255,0.4)" }}>
                  {item.label}
                </span>
              </div>
            </a>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={handleSignOut}
        style={{ cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit", width: "100%", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
          <span style={{ fontSize: "14px" }}>🚪</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
        </div>
      </button>
    </div>
  );
}
