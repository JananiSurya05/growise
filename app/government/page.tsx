"use client";
import { useState, useEffect } from "react";

export default function GovernmentDashboard() {
    const [time, setTime] = useState("");

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

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
                background: "rgba(0,0,0,0.3)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column",
                padding: "20px 12px",
                position: "fixed", height: "100vh"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
                        Gro<span style={{ color: "#4ade80" }}>Wise</span>
                    </span>
                </div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", padding: "0 8px", marginBottom: "20px" }}>
                    ADMIN PORTAL
                </div>

                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".1em", padding: "0 8px", marginBottom: "8px" }}>
                    Navigation
                </div>
                {[
                    { icon: "⚡", label: "Dashboard", href: "/government", active: true },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 10px", borderRadius: "8px", marginBottom: "2px",
                        background: item.active ? "rgba(167,139,250,0.12)" : "transparent",
                        border: item.active ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent",
                    }}>
                        <span style={{ fontSize: "14px" }}>{item.icon}</span>
                        <span style={{ fontSize: "12px", color: item.active ? "#a78bfa" : "rgba(255,255,255,0.4)", fontWeight: item.active ? "600" : "400" }}>
                            {item.label}
                        </span>
                    </div>
                ))}

                <div style={{ marginTop: "auto" }}>
                    <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Admin Officer</div>
                        <div style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>Tamil Nadu Dept.</div>
                    </div>
                    <a href="/login" style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px" }}>
                            <span style={{ fontSize: "14px" }}>🚪</span>
                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                        </div>
                    </a>
                </div>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "20px 24px" }}>

                {/* Top bar */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "20px", paddingBottom: "16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)"
                }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>
                                LIVE · TAMIL NADU STATE DASHBOARD
                            </span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-.5px" }}>
                            Agricultural Command Center
                        </h1>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "white", fontVariantNumeric: "tabular-nums" }}>
                            {time}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>Monday, 19 May 2026</div>
                    </div>
                </div>

                {/* KPI row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                        { label: "Active Farmers", value: "142", change: "↑ 12 this week", color: "#4ade80", icon: "👨‍🌾" },
                        { label: "Crops Listed", value: "38", change: "↑ 4 new today", color: "#60a5fa", icon: "🌾" },
                        { label: "Orders Today", value: "284", change: "↑ 18% vs yesterday", color: "#fbbf24", icon: "📦" },
                        { label: "Disease Alerts", value: "7", change: "⚠️ 3 urgent", color: "#f87171", icon: "🦠" },
                        { label: "Food Waste Saved", value: "2.3t", change: "This month", color: "#a78bfa", icon: "♻️" },
                    ].map((k, i) => (
                        <div key={i} style={{
                            background: "rgba(0,0,0,0.25)",
                            border: `1px solid ${k.color}22`,
                            borderTop: `3px solid ${k.color}`,
                            borderRadius: "12px", padding: "14px",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <span style={{ fontSize: "18px" }}>{k.icon}</span>
                                <span style={{ fontSize: "9px", color: k.color, fontWeight: "600", letterSpacing: ".04em", textTransform: "uppercase" }}>LIVE</span>
                            </div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "4px" }}>{k.value}</div>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginBottom: "4px" }}>{k.label}</div>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{k.change}</div>
                        </div>
                    ))}
                </div>

                {/* Second row */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>

                    {/* Disease hotspots — most urgent */}
                    <div style={{
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(248,113,113,0.15)",
                        borderRadius: "14px", padding: "16px",
                        backdropFilter: "blur(10px)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171" }} />
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#f87171", letterSpacing: ".04em" }}>DISEASE HOTSPOTS</span>
                                </div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Active alerts by district</div>
                            </div>
                            <div style={{
                                background: "rgba(248,113,113,0.1)",
                                border: "1px solid rgba(248,113,113,0.2)",
                                borderRadius: "999px", padding: "3px 10px",
                                fontSize: "10px", color: "#f87171", fontWeight: "600"
                            }}>7 total</div>
                        </div>

                        {[
                            { district: "Coimbatore", crop: "Tomato", type: "Leaf Blight", cases: 3, severity: "HIGH", pct: 90, color: "#f87171" },
                            { district: "Madurai", crop: "Rice", type: "Root Rot", cases: 2, severity: "MED", pct: 60, color: "#fbbf24" },
                            { district: "Trichy", crop: "Chilli", type: "Whitefly", cases: 1, severity: "MED", pct: 35, color: "#fbbf24" },
                            { district: "Salem", crop: "Onion", type: "Thrips", cases: 1, severity: "LOW", pct: 20, color: "#4ade80" },
                        ].map((d, i) => (
                            <div key={i} style={{ marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>{d.district}</span>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginLeft: "6px" }}>{d.crop} · {d.type}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "11px", color: "white", fontWeight: "700" }}>{d.cases}</span>
                                        <span style={{
                                            fontSize: "9px", fontWeight: "700", padding: "2px 7px",
                                            borderRadius: "999px", color: d.color,
                                            background: `${d.color}15`, border: `1px solid ${d.color}30`
                                        }}>{d.severity}</span>
                                    </div>
                                </div>
                                <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                    <div style={{ width: `${d.pct}%`, height: "100%", background: d.color, borderRadius: "2px" }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Crop production */}
                    <div style={{
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(74,222,128,0.12)",
                        borderRadius: "14px", padding: "16px",
                        backdropFilter: "blur(10px)"
                    }}>
                        <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80", marginBottom: "2px" }}>📈 CROP PRODUCTION</div>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>By volume · Kharif 2026</div>
                        </div>

                        {[
                            { crop: "Tomato", img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=40&h=40&fit=crop", vol: "8.4t", pct: 85, trend: "↑" },
                            { crop: "Rice", img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=40&h=40&fit=crop", vol: "12.1t", pct: 70, trend: "↑" },
                            { crop: "Potato", img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=40&h=40&fit=crop", vol: "5.2t", pct: 55, trend: "→" },
                            { crop: "Chilli", img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=40&h=40&fit=crop", vol: "3.8t", pct: 40, trend: "↓" },
                            { crop: "Spinach", img: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=40&h=40&fit=crop", vol: "2.1t", pct: 30, trend: "↑" },
                        ].map((c, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                <img src={c.img} alt={c.crop} style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                        <span style={{ fontSize: "11px", color: "white" }}>{c.crop}</span>
                                        <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>{c.vol}</span>
                                    </div>
                                    <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                        <div style={{ width: `${c.pct}%`, height: "100%", background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: "2px" }} />
                                    </div>
                                </div>
                                <span style={{ fontSize: "12px", color: c.trend === "↑" ? "#4ade80" : c.trend === "↓" ? "#f87171" : "#fbbf24", fontWeight: "700", width: "14px" }}>{c.trend}</span>
                            </div>
                        ))}
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                        {/* Sustainability score */}
                        <div style={{
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(167,139,250,0.15)",
                            borderRadius: "14px", padding: "16px",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#a78bfa", marginBottom: "12px" }}>♻️ SUSTAINABILITY</div>
                            {[
                                { label: "Eco Score", value: "84/100", bar: 84, color: "#a78bfa" },
                                { label: "Water Usage", value: "↓ 12%", bar: 88, color: "#60a5fa" },
                                { label: "Farmer Income", value: "↑ 34%", bar: 74, color: "#4ade80" },
                                { label: "Food Waste", value: "↓ 28%", bar: 72, color: "#fbbf24" },
                            ].map((s, i) => (
                                <div key={i} style={{ marginBottom: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                        <span style={{ fontSize: "11px", color: s.color, fontWeight: "700" }}>{s.value}</span>
                                    </div>
                                    <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                        <div style={{ width: `${s.bar}%`, height: "100%", background: s.color, borderRadius: "2px" }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent activity */}
                        <div style={{
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "14px", padding: "16px",
                            backdropFilter: "blur(10px)", flex: 1
                        }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                                🕐 RECENT ACTIVITY
                            </div>
                            {[
                                { dot: "#4ade80", text: "New farmer registered · Coimbatore", time: "2m ago" },
                                { dot: "#f87171", text: "Disease alert · Leaf blight · Madurai", time: "14m ago" },
                                { dot: "#60a5fa", text: "284 orders fulfilled today", time: "1h ago" },
                                { dot: "#fbbf24", text: "Surplus food redistributed · 120kg", time: "2h ago" },
                                { dot: "#a78bfa", text: "Monthly report generated", time: "3h ago" },
                            ].map((a, i) => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: a.dot, marginTop: "4px", flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{a.text}</div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{a.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom — farm photo strip with data overlay */}
                <div style={{
                    position: "relative", borderRadius: "14px",
                    overflow: "hidden", height: "90px"
                }}>
                    <img
                        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&h=200&fit=crop"
                        alt="farm"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(1,77,78,0.85)" }} />
                    <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center",
                        justifyContent: "space-around", padding: "0 32px"
                    }}>
                        {[
                            { label: "Districts Monitored", value: "38" },
                            { label: "AI Queries This Week", value: "1,284" },
                            { label: "Avg Farmer Income", value: "₹18,400/mo" },
                            { label: "Platform Uptime", value: "99.9%" },
                            { label: "Total Users", value: "2,642" },
                            { label: "Carbon Saved", value: "4.2t CO₂" },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>{s.value}</div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
}