"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

export default function GovernmentDashboard() {
    const { loading: authLoading } = useAuth();
    const [time, setTime] = useState("");
    const [stats, setStats] = useState({ farmers: 0, crops: 0, orders: 0, consumers: 0, totalRevenue: 0, totalSaved: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [cropStats, setCropStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);

        const [farmersRes, cropsRes, ordersRes, consumersRes] = await Promise.all([
            supabase.from("users").select("id", { count: "exact" }).eq("role", "farmer"),
            supabase.from("crops").select("name, price, quantity, location, status"),
            supabase.from("orders").select("total, amount_saved, status, created_at").order("created_at", { ascending: false }),
            supabase.from("users").select("id", { count: "exact" }).eq("role", "consumer"),
        ]);

        const ordersData = (ordersRes.data || []) as any[];
        const cropsData = (cropsRes.data || []) as any[];

        const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const totalSaved = ordersData.reduce((sum: number, o: any) => sum + (o.amount_saved || 0), 0);

        setStats({
            farmers: farmersRes.count || 0,
            crops: cropsData.filter(c => c.status === "Active").length,
            orders: ordersData.length,
            consumers: consumersRes.count || 0,
            totalRevenue,
            totalSaved,
        });

        // Recent activity (no private data)
        setRecentActivity(ordersData.slice(0, 8).map((o: any) => ({
            status: o.status,
            total: o.total,
            date: new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        })));

        // Crop stats by location
        const locationMap: Record<string, number> = {};
        cropsData.forEach((c: any) => {
            if (c.location) locationMap[c.location] = (locationMap[c.location] || 0) + 1;
        });
        setCropStats(Object.entries(locationMap).map(([loc, count]) => ({ location: loc, count })).sort((a, b) => b.count - a.count));

        setLoading(false);
    }

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const ordersByStatus = {
        Processing: recentActivity.filter(o => o.status === "Processing").length,
        "On the way": recentActivity.filter(o => o.status === "On the way").length,
        Delivered: recentActivity.filter(o => o.status === "Delivered").length,
    };

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", padding: "0 8px", marginBottom: "20px" }}>ADMIN PORTAL</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", marginBottom: "2px" }}>
                    <span style={{ fontSize: "14px" }}>⚡</span>
                    <span style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600" }}>Dashboard</span>
                </div>
                <div style={{ marginTop: "auto" }}>
                    <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Admin Portal</div>
                        <div style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>GroWise Analytics</div>
                    </div>
                    <div onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px" }}>
                            <span>🚪</span>
                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "20px 24px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · GROWISE ANALYTICS DASHBOARD</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>Agricultural Command Center</h1>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "white" }}>{time}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{today}</div>
                    </div>
                </div>

                {/* KPI Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                        { label: "Farmers", value: loading ? "..." : stats.farmers, color: "#4ade80", icon: "👨‍🌾" },
                        { label: "Active Crops", value: loading ? "..." : stats.crops, color: "#60a5fa", icon: "🌾" },
                        { label: "Total Orders", value: loading ? "..." : stats.orders, color: "#fbbf24", icon: "📦" },
                        { label: "Consumers", value: loading ? "..." : stats.consumers, color: "#a78bfa", icon: "🛒" },
                        { label: "Revenue Generated", value: loading ? "..." : `₹${stats.totalRevenue}`, color: "#f87171", icon: "💰" },
                        { label: "Consumer Savings", value: loading ? "..." : `₹${stats.totalSaved}`, color: "#4ade80", icon: "🎯" },
                    ].map((k, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${k.color}22`, borderTop: `3px solid ${k.color}`, borderRadius: "12px", padding: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "16px" }}>{k.icon}</span>
                                <span style={{ fontSize: "8px", color: k.color, fontWeight: "600" }}>LIVE</span>
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "3px" }}>{k.value}</div>
                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)" }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Main grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", marginBottom: "16px" }}>

                    {/* Order Status Breakdown */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 Order Status Overview</div>
                        {[
                            { label: "Processing", value: ordersByStatus["Processing"], color: "#60a5fa", icon: "⏳" },
                            { label: "On the way", value: ordersByStatus["On the way"], color: "#fbbf24", icon: "🚛" },
                            { label: "Delivered", value: ordersByStatus["Delivered"], color: "#4ade80", icon: "✅" },
                        ].map((s, i) => (
                            <div key={i} style={{ marginBottom: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{s.icon} {s.label}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: s.color }}>{s.value} orders</span>
                                </div>
                                <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                    <div style={{ width: `${stats.orders > 0 ? (s.value / stats.orders) * 100 : 0}%`, height: "100%", background: s.color, borderRadius: "3px" }} />
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>Recent Activity</div>
                            {recentActivity.slice(0, 4).map((a, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>🛒 New order · {a.date}</div>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#4ade80" }}>₹{a.total}</span>
                                        <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "999px", color: a.status === "Delivered" ? "#4ade80" : a.status === "On the way" ? "#fbbf24" : "#60a5fa", background: "rgba(255,255,255,0.06)" }}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Crops by Location */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>📍 Crops by Location</div>
                        {loading ? (
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>Loading...</div>
                        ) : cropStats.length === 0 ? (
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>No crops listed yet</div>
                        ) : cropStats.map((loc, i) => (
                            <div key={i} style={{ marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>📍 {loc.location}</span>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80" }}>{loc.count} crops</span>
                                </div>
                                <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                    <div style={{ width: `${(loc.count / (cropStats[0]?.count || 1)) * 100}%`, height: "100%", background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: "3px" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Platform Impact + System Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 Platform Impact</div>
                        {[
                            { label: "Middlemen Eliminated", value: "100%", color: "#4ade80" },
                            { label: "Platform Fee", value: "₹0", color: "#4ade80" },
                            { label: "Direct Farmer Pay", value: "100%", color: "#60a5fa" },
                            { label: "Consumer Savings", value: `₹${stats.totalSaved}`, color: "#fbbf24" },
                            { label: "Food Transparency", value: "QR Verified", color: "#a78bfa" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: s.color }}>{s.value}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🖥️ System Status</div>
                        {[
                            { label: "Database", status: "Online", color: "#4ade80" },
                            { label: "Authentication", status: "Active", color: "#4ade80" },
                            { label: "AI Advisor", status: "Ready", color: "#4ade80" },
                            { label: "Disease Scanner", status: "Active", color: "#4ade80" },
                            { label: "Weather API", status: "Live", color: "#4ade80" },
                            { label: "QR System", status: "Active", color: "#4ade80" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "10px", fontWeight: "600", color: s.color }}>● {s.status}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#012e2f", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>📊 Platform Summary</div>
                        {[
                            { label: "Total Users", value: stats.farmers + stats.consumers, color: "#60a5fa" },
                            { label: "Active Crops", value: stats.crops, color: "#4ade80" },
                            { label: "Completed Orders", value: ordersByStatus["Delivered"], color: "#4ade80" },
                            { label: "Pending Orders", value: ordersByStatus["Processing"], color: "#fbbf24" },
                            { label: "Total Revenue", value: `₹${stats.totalRevenue}`, color: "#f87171" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: s.color }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
