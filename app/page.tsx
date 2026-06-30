export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      fontFamily: "'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>

      {/* Full bleed background image */}
      <img
        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&h=900&fit=crop"
        alt="farm field"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.2
        }}
      />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 100%)"
      }} />

      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(74,222,128,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.05) 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      {/* Navbar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🌿</span>
          <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
            Gro<span style={{ color: "#4ade80" }}>Wise</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href="/login" style={{
            background: "transparent", color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "8px 20px", borderRadius: "7px",
            textDecoration: "none", fontSize: "13px"
          }}>Sign In</a>
          <a href="/login" style={{
            background: "#4ade80", color: "#0f0f0f",
            padding: "8px 20px", borderRadius: "7px",
            textDecoration: "none", fontSize: "13px", fontWeight: "700"
          }}>Get Started</a>
        </div>
      </div>

      {/* Hero content */}
      <div style={{
        position: "relative", zIndex: 2,
        textAlign: "center", padding: "0 24px",
        maxWidth: "680px"
      }}>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(74,222,128,0.08)",
          border: "1px solid rgba(74,222,128,0.2)",
          borderRadius: "999px", padding: "5px 16px",
          fontSize: "11px", color: "#4ade80", fontWeight: "600",
          marginBottom: "28px", letterSpacing: "0.06em"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
          INDIA&apos;S AI-POWERED AGRIFOOD PLATFORM
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "80px", fontWeight: "800", color: "white",
          letterSpacing: "-4px", lineHeight: 1, marginBottom: "10px"
        }}>
          Gro<span style={{ color: "#4ade80" }}>Wise</span>
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: "18px", color: "rgba(255,255,255,0.4)",
          fontStyle: "italic", marginBottom: "16px"
        }}>
          Sow Smart. Grow Wise.
        </p>

        {/* Description */}
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.3)",
          lineHeight: "1.8", marginBottom: "40px",
          maxWidth: "480px", margin: "0 auto 40px"
        }}>
          Connecting Tamil Nadu farmers directly to consumers.
          Real food. Fair prices. Zero middlemen. Powered by AI.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "56px" }}>
          <a href="/login" style={{
            background: "#4ade80", color: "#0f0f0f",
            padding: "14px 32px", borderRadius: "8px",
            textDecoration: "none", fontSize: "15px", fontWeight: "700"
          }}>
            Get Started →
          </a>
          <a href="#" style={{
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "14px 32px", borderRadius: "8px",
            textDecoration: "none", fontSize: "15px"
          }}>
            Learn More
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px", overflow: "hidden",
          background: "rgba(255,255,255,0.03)",
          maxWidth: "480px", margin: "0 auto"
        }}>
          {[
            { num: "500+", label: "Farmers" },
            { num: "50+", label: "Crops Listed" },
            { num: "2000+", label: "Consumers" },
            { num: "0", label: "Middlemen" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "18px 12px", textAlign: "center",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#4ade80" }}>{s.num}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}