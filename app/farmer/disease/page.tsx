"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState, useRef } from "react";
import { useAuth } from "../../lib/useAuth";
import FarmerLayout from "../../components/FarmerLayout";

export default function DiseaseScanner() {
    const { user, loading: authLoading } = useAuth();
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    if (authLoading) return <AppLoadingState />;

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
        <FarmerLayout activeHref="/farmer/disease" firstName={user?.user_metadata?.full_name?.split(" ")[0] || "Farmer"} contentStyle={{ padding: "28px 32px" }}>
                <div style={{ marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>📸</div>
                        <div>
                            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "3px" }}>Plant Disease Scanner</h1>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Upload a photo of your plant — AI identifies the disease and suggests treatment</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "1000px" }}>
                    <div>
                        <button type="button" onClick={() => fileRef.current?.click()} style={{ background: image ? "transparent" : "#012e2f", border: image ? "none" : "2px dashed rgba(248,113,113,0.3)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", marginBottom: "14px", minHeight: "280px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: 0, font: "inherit", width: "100%" }}>
                            {image ? (
                                <>
                                    <img src={image} alt="uploaded plant" style={{ width: "100%", height: "280px", objectFit: "cover", borderRadius: "20px", display: "block" }} />
                                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)", borderRadius: "20px" }} />
                                    <div style={{ position: "absolute", bottom: "16px", left: "16px", fontSize: "12px", color: "white", fontWeight: "600" }}>✅ Photo uploaded — click Scan below</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
                                    <div style={{ fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "6px" }}>Click to upload plant photo</div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>JPG, PNG — any plant or crop</div>
                                </>
                            )}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                        {image ? (
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={scanDisease} disabled={loading} style={{ flex: 1, background: loading ? "rgba(248,113,113,0.2)" : "linear-gradient(135deg, #dc2626, #f87171)", border: "none", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "700", color: "white", cursor: loading ? "not-allowed" : "pointer" }}>
                                    {loading ? "🔬 Analysing..." : "🔬 Scan for Disease →"}
                                </button>
                                <button onClick={() => { setImage(null); setResult(""); }} style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "14px 18px", fontSize: "13px", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>Clear</button>
                            </div>
                        ) : (
                            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", background: "#012e2f", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "600", color: "#f87171", cursor: "pointer" }}>📷 Choose Photo</button>
                        )}
                        <div style={{ marginTop: "20px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>Can detect</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {[{ name: "Leaf Blight", icon: "🍃" }, { name: "Powdery Mildew", icon: "🌾" }, { name: "Root Rot", icon: "🌱" }, { name: "Aphid Infestation", icon: "🐛" }, { name: "Nutrient Deficiency", icon: "⚗️" }, { name: "Fungal Infection", icon: "🍄" }].map((d, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#012e2f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px 10px" }}>
                                        <span style={{ fontSize: "14px" }}>{d.icon}</span>
                                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        {!result && !loading && (
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "32px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔬</div>
                                <div style={{ fontSize: "16px", fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>AI Analysis Result</div>
                                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", lineHeight: "1.7" }}>Upload a photo and click Scan to get an instant AI diagnosis</div>
                            </div>
                        )}
                        {loading && (
                            <div style={{ background: "#012e2f", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "20px", padding: "32px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                                <div style={{ fontSize: "56px", marginBottom: "20px" }}>🤖</div>
                                <div style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "8px" }}>AI is analysing your plant...</div>
                                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f87171", animation: `bounce 1s infinite ${i * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {result && (
                            <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "20px", padding: "24px", height: "100%", overflow: "auto" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🔬</div>
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>AI Disease Analysis</div>
                                        <div style={{ fontSize: "11px", color: "#4ade80" }}>Diagnosis complete</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{result}</div>
                                <button onClick={() => { setImage(null); setResult(""); }} style={{ marginTop: "16px", width: "100%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "10px", fontSize: "13px", color: "#4ade80", cursor: "pointer", fontWeight: "600" }}>
                                    Scan another plant →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
        </FarmerLayout>
    );
}
