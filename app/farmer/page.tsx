"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabase";

export default function FarmerDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [crops, setCrops] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalCrops: 0, totalOrders: 0, totalRevenue: 0, totalKg: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    async function loadData() {
        setLoading(true);

        const [cropsRes, ordersRes] = await Promise.all([
            supabase.from("crops").select("*").eq("farmer_id", user.id),
            supabase.from("orders").select("*, order_items(*)").eq("farmer_id", user.id).order("created_at", { ascending: false }).limit(5),
        ]);

        const cropsData = (cropsRes.data || []) as any[];
        const ordersData = (ordersRes.data || []) as any[];

        setCrops(cropsData);
        setOrders(ordersData);

        const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const totalKg = ordersData.reduce((sum: number, o: any) => sum + (o.quantity || 0), 0);

        setStats({
            totalCrops: cropsData.length,
            totalOrders: ordersData.length,
            totalRevenue,
            totalKg,
        });

        setLoading(false);
    }

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Farmer";

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>
            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh", backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>

                {/* Profile */}
                <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 8px 14px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(74,222,128,0.2)", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginBottom: "6px" }}>
                        {firstName[0]}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{firstName}</div>
                    <div style={{ fontSize: "10px", color: "#4ade80" }}>● Online · Farmer</div>
                </div>

                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/farmer", active: true },
                        { icon: "🌱", label: "My Crops", href: "/farmer/crops" },
                        { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
                        { icon: "📸", label: "Disease Scan", href: "/farmer/disease" },
                        { icon: "🌤️", label: "Weather", href: "/farmer/weather" },
                        { icon: "💰", label: "Income", href: "/farmer/income" },
                        { icon: "📊", label: "Sales", href: "/farmer/sales" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(74,222,128,0.12)" : "transparent", border: item.active ? "1px solid rgba(74,222,128,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#4ade80" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
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

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>FARMER DASHBOARD · LIVE DATA</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>Welcome back, {firstName}! 👋</h1>
                    </div>
                    <a href="/farmer/crops" style={{ textDecoration: "none" }}>
                        <div style={{ background: "#4ade80", borderRadius: "10px", padding: "8px 18px", fontSize: "12px", color: "#0a0a0a", fontWeight: "700" }}>+ List New Crop</div>
                    </a>
                </div>

                {/* KPI Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                    {[
                        { label: "My Crops", value: loading ? "..." : stats.totalCrops, icon: "🌱", color: "#4ade80", href: "/farmer/crops" },
                        { label: "Total Orders", value: loading ? "..." : stats.totalOrders, icon: "📦", color: "#60a5fa", href: "/farmer/sales" },
                        { label: "Total Revenue", value: loading ? "..." : `₹${stats.totalRevenue}`, icon: "💰", color: "#fbbf24", href: "/farmer/sales" },
                        { label: "Total Sold", value: loading ? "..." : `${stats.totalKg}kg`, icon: "⚖️", color: "#a78bfa", href: "/farmer/sales" },
                    ].map((k, i) => (
                        <a key={i} href={k.href} style={{ textDecoration: "none" }}>
                            <div style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${k.color}22`, borderTop: `3px solid ${k.color}`, borderRadius: "12px", padding: "16px", backdropFilter: "blur(10px)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "20px" }}>{k.icon}</span>
                                    <span style={{ fontSize: "9px", color: k.color, fontWeight: "600" }}>LIVE</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "4px" }}>{k.value}</div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{k.label}</div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Banner */}
                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                    <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&h=300&fit=crop" alt="farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>GROWISE FARMER NETWORK</div>
                            <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>Sell directly. Earn more. No middlemen.</div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[
                                { label: "Platform Fee", value: "₹0", color: "#4ade80" },
                                { label: "Direct to Consumer", value: "100%", color: "#60a5fa" },
                                { label: "Middleman Cut", value: "₹0", color: "#fbbf24" },
                            ].map((s, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>

                    {/* My Crops */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 My Active Crops</div>
                            <a href="/farmer/crops" style={{ fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}>View all →</a>
                        </div>
                        {loading ? (
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Loading...</div>
                        ) : crops.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "24px" }}>
                                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌱</div>
                                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>No crops listed yet</div>
                                <a href="/farmer/crops" style={{ textDecoration: "none" }}>
                                    <div style={{ background: "#4ade80", borderRadius: "10px", padding: "8px 16px", fontSize: "12px", color: "#0a0a0a", fontWeight: "700", display: "inline-block" }}>+ Add First Crop</div>
                                </a>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                                {crops.slice(0, 4).map((crop, i) => (
                                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden" }}>
                                        <img src={crop.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=200&fit=crop"} alt={crop.name} style={{ width: "100%", height: "70px", objectFit: "cover" }} />
                                        <div style={{ padding: "8px 10px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "white", marginBottom: "3px" }}>{crop.name}</div>
                                            <div style={{ fontSize: "11px", color: "#4ade80" }}>₹{crop.price}/kg · {crop.quantity}kg</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>📍 {crop.location}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                        {/* Recent Orders */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 Recent Orders</div>
                                <a href="/farmer/sales" style={{ fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}>View all →</a>
                            </div>
                            {loading ? (
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Loading...</div>
                            ) : orders.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "16px", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                                    No orders yet. List your crops to start selling!
                                </div>
                            ) : orders.map((order, i) => {
                                const itemNames = order.order_items?.map((it: any) => it.crop_name).join(", ") || "Order";
                                const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                                const statusColor = order.status === "Delivered" ? "#4ade80" : order.status === "On the way" ? "#fbbf24" : "#60a5fa";
                                return (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < orders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <div>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{itemNames}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{date} · {order.quantity}kg</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#4ade80" }}>₹{order.total}</div>
                                            <div style={{ fontSize: "9px", color: statusColor }}>{order.status}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Quick Links */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>⚡ Quick Actions</div>
                            {[
                                { label: "Check Weather", href: "/farmer/weather", icon: "🌤️", color: "#60a5fa" },
                                { label: "AI Crop Advisor", href: "/farmer/advisor", icon: "🤖", color: "#4ade80" },
                                { label: "Disease Scanner", href: "/farmer/disease", icon: "📸", color: "#f87171" },
                                { label: "Income Calculator", href: "/farmer/income", icon: "💰", color: "#fbbf24" },
                            ].map((link, i) => (
                                <a key={i} href={link.href} style={{ textDecoration: "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px", marginBottom: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <span style={{ fontSize: "16px" }}>{link.icon}</span>
                                        <span style={{ fontSize: "12px", color: link.color, fontWeight: "600" }}>{link.label}</span>
                                        <span style={{ marginLeft: "auto", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>→</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
