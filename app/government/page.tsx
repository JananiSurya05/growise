"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

export default function GovernmentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [time, setTime] = useState("");
    const [stats, setStats] = useState({
        farmers: 0, crops: 0, orders: 0, consumers: 0, totalRevenue: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [cropList, setCropList] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

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
        if (user) loadData();
    }, [user]);

    async function loadData() {
        setLoadingData(true);

        // Get counts
        const [farmersRes, cropsRes, ordersRes, consumersRes] = await Promise.all([
            supabase.from("users").select("id", { count: "exact" }).eq("role", "farmer"),
            supabase.from("crops").select("id", { count: "exact" }),
            supabase.from("orders").select("id, total", { count: "exact" }),
            supabase.from("users").select("id", { count: "exact" }).eq("role", "consumer"),
        ]);

        const totalRevenue = (ordersRes.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        setStats({
            farmers: farmersRes.count || 0,
            crops: cropsRes.count || 0,
            orders: ordersRes.count || 0,
            consumers: consumersRes.count || 0,
            totalRevenue,
        });

        // Recent orders
        const { data: orders } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false })
            .limit(5) as { data: any[] };
        setRecentOrders(orders || []);

        // Crops list
        const { data: crops } = await supabase
            .from("crops")
            .select("*")
            .eq("status", "Active")
            .limit(5) as { data: any[] };
        setCropList(crops || []);

        setLoadingData(false);
    }

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Admin Officer</div>
                        <div style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>Tamil Nadu Dept.</div>
                    </div>
                    <div onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px" }}>
                            <span style={{ fontSize: "14px" }}>🚪</span>
                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "20px 24px" }}>

                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · GROWISE STATE DASHBOARD</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-.5px" }}>Agricultural Command Center</h1>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "white" }}>{time}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{today}</div>
                    </div>
                </div>

                {/* KPI row — real data */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                        { label: "Registered Farmers", value: loadingData ? "..." : stats.farmers, color: "#4ade80", icon: "👨‍🌾" },
                        { label: "Crops Listed", value: loadingData ? "..." : stats.crops, color: "#60a5fa", icon: "🌾" },
                        { label: "Total Orders", value: loadingData ? "..." : stats.orders, color: "#fbbf24", icon: "📦" },
                        { label: "Consumers", value: loadingData ? "..." : stats.consumers, color: "#a78bfa", icon: "🛒" },
                        { label: "Total Revenue", value: loadingData ? "..." : `₹${stats.totalRevenue}`, color: "#f87171", icon: "💰" },
                    ].map((k, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${k.color}22`, borderTop: `3px solid ${k.color}`, borderRadius: "12px", padding: "14px", backdropFilter: "blur(10px)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <span style={{ fontSize: "18px" }}>{k.icon}</span>
                                <span style={{ fontSize: "9px", color: k.color, fontWeight: "600", textTransform: "uppercase" }}>LIVE</span>
                            </div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "4px" }}>{k.value}</div>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Second row */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>

                    {/* Recent Orders */}
                    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "14px", padding: "16px", backdropFilter: "blur(10px)" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#60a5fa", marginBottom: "14px" }}>📦 RECENT ORDERS</div>
                        {loadingData ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>Loading...</div>
                        ) : recentOrders.length === 0 ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>No orders yet</div>
                        ) : recentOrders.map((order, i) => {
                            const itemNames = order.order_items?.map((it: any) => it.crop_name).join(", ") || "Order";
                            const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                            return (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "10px", borderBottom: i < recentOrders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>{itemNames}</div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{date} · {order.status}</div>
                                    </div>
                                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#4ade80" }}>₹{order.total}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active Crops */}
                    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(74,222,128,0.12)", borderRadius: "14px", padding: "16px", backdropFilter: "blur(10px)" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80", marginBottom: "14px" }}>🌾 ACTIVE CROPS</div>
                        {loadingData ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>Loading...</div>
                        ) : cropList.length === 0 ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>No crops listed</div>
                        ) : cropList.map((crop, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                <img src={crop.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=40&h=40&fit=crop"} alt={crop.name} style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover" }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                        <span style={{ fontSize: "11px", color: "white" }}>{crop.name}</span>
                                        <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>₹{crop.price}/kg</span>
                                    </div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{crop.quantity}kg · {crop.location}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sustainability */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "14px", padding: "16px", backdropFilter: "blur(10px)" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#a78bfa", marginBottom: "12px" }}>♻️ PLATFORM IMPACT</div>
                            {[
                                { label: "Zero Middlemen", value: "100%", color: "#4ade80" },
                                { label: "Direct Farmer Pay", value: "100%", color: "#60a5fa" },
                                { label: "Platform Fee", value: "₹0", color: "#fbbf24" },
                                { label: "Food Transparency", value: "QR Verified", color: "#a78bfa" },
                            ].map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                    <span style={{ fontSize: "11px", color: s.color, fontWeight: "700" }}>{s.value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px", backdropFilter: "blur(10px)", flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>🕐 SYSTEM STATUS</div>
                            {[
                                { dot: "#4ade80", text: "Database: Online", time: "✅" },
                                { dot: "#4ade80", text: "Auth: Active", time: "✅" },
                                { dot: "#4ade80", text: "API: Running", time: "✅" },
                                { dot: "#60a5fa", text: "AI Advisor: Ready", time: "✅" },
                                { dot: "#fbbf24", text: "Weather API: Live", time: "✅" },
                            ].map((a, i) => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
                                    <div style={{ flex: 1, fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>{a.text}</div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{a.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom banner */}
                <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", height: "90px" }}>
                    <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&h=200&fit=crop" alt="farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(1,77,78,0.85)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 32px" }}>
                        {[
                            { label: "Registered Farmers", value: loadingData ? "..." : stats.farmers },
                            { label: "Active Crops", value: loadingData ? "..." : stats.crops },
                            { label: "Total Orders", value: loadingData ? "..." : stats.orders },
                            { label: "Total Consumers", value: loadingData ? "..." : stats.consumers },
                            { label: "Total Revenue", value: loadingData ? "..." : `₹${stats.totalRevenue}` },
                            { label: "Platform Fee", value: "₹0" },
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
