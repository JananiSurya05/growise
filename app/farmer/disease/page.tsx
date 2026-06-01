"use client";
import { useState, useRef } from "react";

export default function DiseaseScanner() {
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function scanDisease() {
        if (!image) return;
        setLoading(true);
        setResult("");
        const res = await fetch("/api/disease", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
        });
        const data = await res.json();
        setResult(data.result);
        setLoading(false);
    }

    return (
        <main style={{
            minHeight: "100vh",
            background: "#014D4E",
            fontFamily: "'Segoe UI', sans-serif",
            display: "flex",
        }}>

            {/* Sidebar */}
            <div style={{
                width: "200px", flexShrink: 0,
                background: "rgba(0,0,0,0.25)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column",
                padding: "20px 12px", position: "fixed", height: "100vh",
                backdropFilter: "blur(20px)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
                        Gro<span style={{ color: "#4ade80" }}>Wise</span>
                    </span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/farmer" },
                        { icon: "🌱", label: "My Crops", href: "/farmer/crops" },
                        { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
                        { icon: "📸", label: "Disease Scan", href: "/farmer/disease", active: true },
                        { icon: "🌤️", label: "Weather", href: "/farmer/weather" },
                        { icon: "💰", label: "Income", href: "/farmer/income" },
                        { icon: "📊", label: "Sales", href: "/farmer/sales" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "9px 10px", borderRadius: "8px",
                                background: item.active ? "rgba(248,113,113,0.12)" : "transparent",
                                border: item.active ? "1px solid rgba(248,113,113,0.22)" : "1px solid transparent",
                            }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                                    {item.label}
                                </span>
                            </div>
                        </a>
                    ))}
                </nav>
                <a href="/login" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "14px" }}>🚪</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                    </div>
                </a>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "28px 32px" }}>

                {/* Header */}
                <div style={{ marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <div style={{
                            width: "44px", height: "44px", borderRadius: "12px",
                            background: "rgba(248,113,113,0.15)",
                            border: "1px solid rgba(248,113,113,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px"
                        }}>📸</div>
                        <div>
                            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "3px" }}>
                                Plant Disease Scanner
                            </h1>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                                Upload a photo of your plant — AI identifies the disease and suggests treatment
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "1000px" }}>

                    {/* Left — Upload */}
                    <div>

                        {/* Upload area */}
                        <div
                            onClick={() => fileRef.current?.click()}
                            style={{
                                background: image ? "transparent" : "#012e2f",
                                border: image ? "none" : "2px dashed rgba(248,113,113,0.3)",
                                borderRadius: "20px",
                                overflow: "hidden",
                                cursor: "pointer",
                                marginBottom: "14px",
                                minHeight: "280px",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                position: "relative"
                            }}
                        >
                            {image ? (
                                <>
                                    <img
                                        src={image}
                                        alt="uploaded plant"
                                        style={{ width: "100%", height: "280px", objectFit: "cover", borderRadius: "20px", display: "block" }}
                                    />
                                    <div style={{
                                        position: "absolute", inset: 0,
                                        background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                                        borderRadius: "20px"
                                    }} />
                                    <div style={{
                                        position: "absolute", bottom: "16px", left: "16px",
                                        fontSize: "12px", color: "white", fontWeight: "600"
                                    }}>
                                        ✅ Photo uploaded — click Scan below
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
                                    <div style={{ fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "6px" }}>
                                        Click to upload plant photo
                                    </div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                                        JPG, PNG — any plant or crop
                                    </div>
                                </>
                            )}
                        </div>

                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />

                        {/* Buttons */}
                        {image ? (
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    onClick={scanDisease}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        background: loading ? "rgba(248,113,113,0.2)" : "linear-gradient(135deg, #dc2626, #f87171)",
                                        border: "none", borderRadius: "12px",
                                        padding: "14px", fontSize: "14px",
                                        fontWeight: "700", color: "white",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,0.3)"
                                    }}
                                >
                                    {loading ? "🔬 Analysing..." : "🔬 Scan for Disease →"}
                                </button>
                                <button
                                    onClick={() => { setImage(null); setResult(""); }}
                                    style={{
                                        background: "#012e2f",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px", padding: "14px 18px",
                                        fontSize: "13px", color: "rgba(255,255,255,0.5)",
                                        cursor: "pointer"
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    width: "100%",
                                    background: "#012e2f",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                    borderRadius: "12px", padding: "14px",
                                    fontSize: "14px", fontWeight: "600",
                                    color: "#f87171", cursor: "pointer"
                                }}
                            >
                                📷 Choose Photo
                            </button>
                        )}

                        {/* Common diseases */}
                        <div style={{ marginTop: "20px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                                Can detect
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {[
                                    { name: "Leaf Blight", icon: "🍃", color: "#f87171" },
                                    { name: "Powdery Mildew", icon: "🌾", color: "#fbbf24" },
                                    { name: "Root Rot", icon: "🌱", color: "#a78bfa" },
                                    { name: "Aphid Infestation", icon: "🐛", color: "#60a5fa" },
                                    { name: "Nutrient Deficiency", icon: "⚗️", color: "#4ade80" },
                                    { name: "Fungal Infection", icon: "🍄", color: "#f87171" },
                                ].map((d, i) => (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center", gap: "8px",
                                        background: "#012e2f",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                        borderRadius: "8px", padding: "8px 10px"
                                    }}>
                                        <span style={{ fontSize: "14px" }}>{d.icon}</span>
                                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — Result */}
                    <div>
                        {!result && !loading && (
                            <div style={{
                                background: "#012e2f",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "20px", padding: "32px",
                                height: "100%", display: "flex",
                                flexDirection: "column", justifyContent: "center",
                                alignItems: "center", textAlign: "center"
                            }}>
                                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔬</div>
                                <div style={{ fontSize: "16px", fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                                    AI Analysis Result
                                </div>
                                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", lineHeight: "1.7" }}>
                                    Upload a photo of your plant and click Scan to get an instant AI diagnosis with treatment steps
                                </div>

                                {/* Example result preview */}
                                <div style={{
                                    marginTop: "28px", width: "100%",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: "12px", padding: "16px",
                                    textAlign: "left"
                                }}>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                                        Example output
                                    </div>
                                    {[
                                        { label: "Disease", value: "Leaf Blight" },
                                        { label: "Cause", value: "Fungal infection" },
                                        { label: "Treatment", value: "Spray copper fungicide" },
                                    ].map((ex, i) => (
                                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", width: "60px", flexShrink: 0 }}>{ex.label}</span>
                                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{ex.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div style={{
                                background: "#012e2f",
                                border: "1px solid rgba(248,113,113,0.2)",
                                borderRadius: "20px", padding: "32px",
                                height: "100%", display: "flex",
                                flexDirection: "column", justifyContent: "center",
                                alignItems: "center", textAlign: "center"
                            }}>
                                <div style={{ fontSize: "56px", marginBottom: "20px" }}>🤖</div>
                                <div style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "8px" }}>
                                    AI is analysing your plant...
                                </div>
                                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "24px" }}>
                                    Checking for diseases, pests and deficiencies
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div key={i} style={{
                                            width: "8px", height: "8px", borderRadius: "50%",
                                            background: "#f87171",
                                            animation: `bounce 1s infinite ${i * 0.15}s`
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {result && (
                            <div style={{
                                background: "#012e2f",
                                border: "1px solid rgba(74,222,128,0.2)",
                                borderRadius: "20px", padding: "24px",
                                height: "100%", overflow: "auto"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                    <div style={{
                                        width: "36px", height: "36px", borderRadius: "10px",
                                        background: "rgba(74,222,128,0.15)",
                                        border: "1px solid rgba(74,222,128,0.3)",
                                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px"
                                    }}>🔬</div>
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>AI Disease Analysis</div>
                                        <div style={{ fontSize: "11px", color: "#4ade80" }}>Diagnosis complete</div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: "13px", color: "rgba(255,255,255,0.85)",
                                    lineHeight: "1.8", whiteSpace: "pre-wrap"
                                }}>
                                    {result}
                                </div>
                                <button
                                    onClick={() => { setImage(null); setResult(""); }}
                                    style={{
                                        marginTop: "16px", width: "100%",
                                        background: "rgba(74,222,128,0.1)",
                                        border: "1px solid rgba(74,222,128,0.2)",
                                        borderRadius: "10px", padding: "10px",
                                        fontSize: "13px", color: "#4ade80",
                                        cursor: "pointer", fontWeight: "600"
                                    }}
                                >
                                    Scan another plant →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
        </main>
    );
}