"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { QRCodeSVG } from "qrcode.react";
import type { CropWithFarmer } from "../../lib/types";
import ConsumerLayout from "../../components/ConsumerLayout";

export default function QRPage() {
    const { loading: authLoading } = useAuth();
    const [crops, setCrops] = useState<CropWithFarmer[]>([]);
    const [selected, setSelected] = useState<CropWithFarmer | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    async function loadCrops() {
        setLoading(true);
        setLoadError("");
        const { data, error } = await supabase
            .from("crops")
            .select("id, name, price, quantity, location, image_url, badge, status, users:farmer_id(name)")
            .eq("status", "Active") as { data: CropWithFarmer[] | null; error: { message: string } | null };

        if (error) {
            console.error("[qr] loadCrops failed:", error.message);
            setLoadError("Couldn't load products right now. Please try again.");
            setLoading(false);
            return;
        }

        setCrops(data ?? []);
        setLoading(false);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCrops();
    }, []);

    const nutrients: Record<string, string[]> = {
        tomato: ["Vitamin C", "Lycopene", "Potassium"],
        rice: ["Carbohydrates", "B Vitamins", "Iron"],
        chilli: ["Vitamin C", "Capsaicin", "Vitamin A"],
        spinach: ["Iron", "Vitamin K", "Folate"],
        onion: ["Vitamin C", "Quercetin", "Fiber"],
        groundnut: ["Protein", "Healthy Fats", "Vitamin E"],
    };

    function getNutrients(name: string) {
        const key = name.toLowerCase();
        for (const k of Object.keys(nutrients)) {
            if (key.includes(k)) return nutrients[k];
        }
        return ["Vitamins", "Minerals", "Fiber"];
    }

    if (authLoading) return <AppLoadingState />;

    return (
        <ConsumerLayout activeHref="/consumer/qr">

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
                            <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", letterSpacing: ".06em" }}>FOOD TRANSPARENCY · FARM TO TABLE</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>📱 QR Farm Story</h1>
                    </div>
                    {selected && (
                        <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", fontSize: "12px", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                            ← Back to products
                        </button>
                    )}
                </div>

                {!selected ? (
                    <div>
                        {/* Info banner */}
                        <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                            <img src="https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=1200&h=300&fit=crop" alt="farmer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "4px" }}>KNOW YOUR FARMER</div>
                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>Click any product to see its full Farm Story</div>
                                </div>
                                <div style={{ display: "flex", gap: "28px" }}>
                                    {[
                                        { label: "Live Products", value: crops.length },
                                        { label: "Transparent", value: "100%" },
                                        { label: "No Middlemen", value: "0" },
                                    ].map((s, i) => (
                                        <div key={i} style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#60a5fa" }}>{s.value}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.4)" }}>Loading products...</div>
                        ) : loadError ? (
                            <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.25)" }}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                                <div style={{ fontSize: "16px", color: "#f87171", marginBottom: "12px" }}>{loadError}</div>
                                <button
                                    onClick={() => loadCrops()}
                                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", padding: "8px 20px", color: "#f87171", cursor: "pointer", fontSize: "13px" }}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : crops.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px" }}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📱</div>
                                <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>No products available yet</div>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                                {crops.map((crop) => (
                                    <button type="button" key={crop.id} onClick={() => setSelected(crop)} aria-label={`View farm story for ${crop.name}`} style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", cursor: "pointer", display: "flex", padding: 0, font: "inherit", textAlign: "left", width: "100%" }}>
                                        <div style={{ width: "130px", flexShrink: 0, position: "relative" }}>
                                            <img src={crop.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop"} alt={crop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                        <div style={{ flex: 1, padding: "14px 16px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                                <div style={{ fontSize: "16px", fontWeight: "700", color: "white" }}>{crop.name}</div>
                                                <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>{crop.badge || "🌿 Eco"}</div>
                                            </div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>👨‍🌾 {crop.users?.name || "Local Farmer"} · 📍 {crop.location || "Tamil Nadu"}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>📦 {crop.quantity}kg available</div>
                                            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#60a5fa" }}>₹{crop.price}/kg</div>
                                                <div style={{ fontSize: "11px", color: "#4ade80" }}>✅ Verified</div>
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600" }}>📱 Tap to see Farm Story →</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                        {/* Left — Farm story */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                            {/* Hero */}
                            <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative", height: "180px" }}>
                                <img src={selected.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop"} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.95) 0%, rgba(0,0,0,0.2) 60%)" }} />
                                <div style={{ position: "absolute", bottom: "16px", left: "16px", right: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                        <div style={{ fontSize: "22px", fontWeight: "800", color: "white" }}>{selected.name}</div>
                                        <div style={{ fontSize: "10px", fontWeight: "600", padding: "3px 10px", borderRadius: "999px", background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}>{selected.badge || "🌿 Eco"}</div>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>₹{selected.price}/kg · {selected.quantity}kg available</div>
                                </div>
                            </div>

                            {/* Product details */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 Product Details</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                                    {[
                                        { label: "Crop Name", value: selected.name },
                                        { label: "Price", value: `₹${selected.price}/kg` },
                                        { label: "Location", value: selected.location || "Tamil Nadu" },
                                        { label: "Stock", value: `${selected.quantity}kg` },
                                        { label: "Status", value: selected.status || "Active" },
                                        { label: "Badge", value: selected.badge || "🌿 Eco" },
                                    ].map((d, i) => (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px 10px" }}>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "2px" }}>{d.label}</div>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{d.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Nutrients */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>🥗 Key Nutrients</div>
                                {getNutrients(selected.name).map((n: string, i: number) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
                                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{n}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — QR code */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                            {/* QR card */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                                <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>📱 Product QR Code</div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>Scan to verify authenticity</div>
                                <div style={{ display: "inline-block", background: "white", padding: "16px", borderRadius: "16px", marginBottom: "16px" }}>
                                    <QRCodeSVG value={`${process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "")}/consumer/qr?crop=${selected.id}`} size={180} bgColor="white" fgColor="#014D4E" />
                                </div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginBottom: "16px" }}>growise.app/consumer/qr/{selected.id?.slice(0, 8)}</div>
                                <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "10px", padding: "10px" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6" }}>
                                        This QR code links directly to this product&apos;s verified farm profile on GroWise.
                                    </div>
                                </div>
                            </div>

                            {/* Trust indicators */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🛡️ Trust & Transparency</div>
                                {[
                                    { icon: "✅", label: "Verified Product", desc: `${selected.name} is a verified GroWise listing` },
                                    { icon: "📍", label: "Location Confirmed", desc: `Farm located in ${selected.location || "Tamil Nadu"}` },
                                    { icon: "📦", label: "Stock Available", desc: `${selected.quantity}kg currently available` },
                                    { icon: "🌿", label: "Direct from Farmer", desc: "No middlemen — straight from farm to you" },
                                    { icon: "💰", label: "Fair Price", desc: `₹${selected.price}/kg — below market rate` },
                                ].map((t, i) => (
                                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px", paddingBottom: "12px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <span style={{ fontSize: "16px", flexShrink: 0 }}>{t.icon}</span>
                                        <div>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white", marginBottom: "2px" }}>{t.label}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{t.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Buy button */}
                            <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                                <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "12px", padding: "14px", textAlign: "center", fontSize: "14px", fontWeight: "700", color: "white", cursor: "pointer" }}>
                                    🛒 Buy {selected.name} Now →
                                </div>
                            </a>
                        </div>
                    </div>
                )}
        </ConsumerLayout>
    );
}
