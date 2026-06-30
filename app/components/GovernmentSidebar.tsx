"use client";
import { supabase } from "../lib/supabase";

const NAV_ITEMS = [{ icon: "⚡", label: "Dashboard", href: "/government" }];

export default function GovernmentSidebar({ activeHref }: { activeHref: string }) {
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
        background: "rgba(0,0,0,0.3)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        position: "fixed",
        height: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", padding: "0 8px" }}>
        <span style={{ fontSize: "18px" }}>🌿</span>
        <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
          Gro<span style={{ color: "#4ade80" }}>Wise</span>
        </span>
      </div>
      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", padding: "0 8px", marginBottom: "20px" }}>ADMIN PORTAL</div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <a key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: active ? "rgba(167,139,250,0.12)" : "transparent",
                  border: active ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                <span style={{ fontSize: "12px", color: active ? "#a78bfa" : "rgba(255,255,255,0.4)", fontWeight: active ? "600" : "400" }}>
                  {item.label}
                </span>
              </div>
            </a>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto" }}>
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Admin Portal</div>
          <div style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>GroWise Analytics</div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          style={{ cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit", width: "100%", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px" }}>
            <span>🚪</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
          </div>
        </button>
      </div>
    </div>
  );
}
