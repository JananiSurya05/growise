"use client";
import { useState } from "react";
import { useAuth } from "../../lib/useAuth";
import { supabase } from "../../lib/supabase";

export default function IncomeCalculator() {
    const { loading: authLoading } = useAuth();
    const [crop, setCrop] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [result, setResult] = useState<null | { direct: number; middleman: number; saved: number; percent: number; }>(null);

    const presets = [
        { crop: "Tomato", price: 25, img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=60&h=60&fit=crop" },
        { crop: "Rice", price: 40, img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=60&h=60&fit=crop" },
        { crop: "Chilli", price: 80, img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=60&h=60&fit=crop" },
        { crop: "Onion", price: 20, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=60&h=60&fit=crop" },
        { crop: "Spinach", price: 30, img: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=60&h=60&fit=crop" },
        { crop: "Potato", price: 18, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=60&h=60&fit=crop" },
    ];

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    function calculate() {
        const qty = parseFloat(quantity);
        const prc = parseFloat(price);
        if (!qty || !prc) return;
        const direct = qty * prc;
        const middleman = direct * 0.55;
        const saved = direct - middleman;
        const percent = Math.round((saved / direct) * 100);
        setResult({ direct, middleman, saved, percent });
    }

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh", backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/farmer" },
                        { icon: "🌱", label: "My Crops", href: "/farmer/crops" },
                        { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
                        { icon: "📸", label: "Disease Scan", href: "/farmer/disease" },
                        { icon: "🌤️", label: "Weather", href: "/farmer/weather" },
                        { icon: "💰", label: "Income", href: "/farmer/income", active: true },
                        { icon: "📊", label: "Sales", href: "/farmer/sales" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(251,191,36,0.12)" : "transparent", border: item.active ? "1px solid rgba(251,191,36,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
                            </div>
                        </a>
                    ))}
                </nav>
                <div onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "14px" }}>🚪</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                    </div>
                </div>
            </div>

            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>
                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "24px", height: "130px" }}>
                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=300&fit=crop" alt="money" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "4px" }}>💰 Income Calculator</h1>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>See exactly how much more you earn by selling directly on GroWise</p>
                        </div>
                        <div style={{ display: "flex", gap: "24px" }}>
                            {[{ label: "Middleman cut", value: "45%" }, { label: "Avg farmer gain", value: "+₹8,200/mo" }, { label: "Platform fee", value: "₹0" }].map((s, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#fbbf24" }}>{s.value}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px", marginBottom: "14px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>Quick select crop</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                                {presets.map((p, i) => (
                                    <button key={i} onClick={() => { setCrop(p.crop); setPrice(p.price.toString()); }} style={{ background: crop === p.crop ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)", border: crop === p.crop ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                        <img src={p.img} alt={p.crop} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} />
                                        <div style={{ fontSize: "11px", color: crop === p.crop ? "#fbbf24" : "rgba(255,255,255,0.6)", fontWeight: "600" }}>{p.crop}</div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>₹{p.price}/kg</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>Enter your details</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[{ label: "Crop Name", value: crop, set: setCrop, placeholder: "e.g. Tomato" }, { label: "Quantity (kg)", value: quantity, set: setQuantity, placeholder: "e.g. 100", type: "number" }, { label: "Your Price per kg (₹)", value: price, set: setPrice, placeholder: "e.g. 25", type: "number" }].map((f, i) => (
                                    <div key={i}>
                                        <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", display: "block" }}>{f.label}</label>
                                        <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type || "text"} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "11px 14px", fontSize: "13px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }} />
                                    </div>
                                ))}
                                <button onClick={calculate} style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)", border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px", fontWeight: "700", color: "#0a0a0a", cursor: "pointer" }}>
                                    Calculate My Income →
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {!result && (
                            <>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "16px", padding: "20px" }}>
                                    <div style={{ fontSize: "12px", color: "#f87171", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>❌ The middleman problem</div>
                                    {[{ label: "You sell 100kg tomato at ₹25/kg", value: "₹2,500 total" }, { label: "Middleman takes 45%", value: "−₹1,125" }, { label: "You receive only", value: "₹1,375 😞" }].map((r, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{r.label}</span>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: i === 2 ? "#f87171" : "rgba(255,255,255,0.7)" }}>{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "20px" }}>
                                    <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>✅ The GroWise solution</div>
                                    {[{ label: "You sell 100kg tomato at ₹25/kg", value: "₹2,500 total" }, { label: "GroWise platform fee", value: "₹0 free" }, { label: "You receive full amount", value: "₹2,500 😊" }].map((r, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{r.label}</span>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: i === 2 ? "#4ade80" : "rgba(255,255,255,0.7)" }}>{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {result && (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.2), rgba(21,128,61,0.15))", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "16px", padding: "20px" }}>
                                        <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "8px" }}>✅ On GroWise</div>
                                        <div style={{ fontSize: "36px", fontWeight: "800", color: "white", marginBottom: "4px" }}>₹{result.direct.toLocaleString()}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>You keep 100%</div>
                                    </div>
                                    <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "16px", padding: "20px" }}>
                                        <div style={{ fontSize: "11px", color: "#f87171", fontWeight: "600", marginBottom: "8px" }}>❌ Via Middleman</div>
                                        <div style={{ fontSize: "36px", fontWeight: "800", color: "#f87171", marginBottom: "4px" }}>₹{result.middleman.toLocaleString()}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>Middleman takes 45%</div>
                                    </div>
                                </div>
                                <div style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.2), rgba(180,83,9,0.15))", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
                                    <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "600", marginBottom: "8px" }}>💰 Extra money in your pocket</div>
                                    <div style={{ fontSize: "48px", fontWeight: "800", color: "#fbbf24", marginBottom: "4px" }}>₹{result.saved.toLocaleString()}</div>
                                    <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>That's {result.percent}% more income for {quantity}kg of {crop}</div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                    {[{ label: "Monthly (x4 sells)", value: `₹${(result.saved * 4).toLocaleString()}`, color: "#4ade80" }, { label: "Yearly savings", value: `₹${(result.saved * 48).toLocaleString()}`, color: "#fbbf24" }, { label: "5 year savings", value: `₹${(result.saved * 240).toLocaleString()}`, color: "#a78bfa" }].map((s, i) => (
                                        <div key={i} style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px", textAlign: "center" }}>
                                            <div style={{ fontSize: "16px", fontWeight: "700", color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setResult(null); setCrop(""); setQuantity(""); setPrice(""); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px", fontSize: "13px", color: "rgba(255,255,255,0.5)", cursor: "pointer", width: "100%" }}>
                                    Calculate another crop →
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
