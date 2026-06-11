"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

export default function GovernmentDashboard() {
    const { loading: authLoading } = useAuth();
    const [time, setTime] = useState("");
    const [stats, setStats] = useState({ farmers: 0, crops: 0, orders: 0, consumers: 0, totalRevenue: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [farmers, setFarmers] = useState<any[]>([]);
    const [crops, setCrops] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

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
            supabase.from("users").select("*").eq("role", "farmer"),
            supabase.from("crops").select("*"),
            supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
            supabase.from("users").select("id", { count: "exact" }).eq("role", "consumer"),
        ]);

        const ordersData = (ordersRes.data || []) as any[];
        const farmersData = (farmersRes.data || []) as any[];
        const cropsData = (cropsRes.data || []) as any[];

        setOrders(ordersData);
        setFarmers(farmersData);
        setCrops(cropsData);

        const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        setStats({
            farmers: farmersData.length,
            crops: cropsData.length,
            orders: ordersData.length,
            consumers: consumersRes.count || 0,
            totalRevenue,
        });

        setLoading(false);
    }

    async function updateOrderStatus(orderId: string, newStatus: string) {
        setUpdating(orderId);
        await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setUpdating(null);
    }

    async function deleteCrop(cropId: string) {
        if (!confirm("Delete this crop listing?")) return;
        await supabase.from("crops").delete().eq("id", cropId);
        setCrops(prev => prev.filter(c => c.id !== cropId));
        setStats(prev => ({ ...prev, crops: prev.crops - 1 }));
    }

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const statusSteps = ["Processing", "On the way", "Delivered"];

    function getStatusColor(status: string) {
        if (status === "Delivered") return "#4ade80";
        if (status === "On the way") return "#fbbf24";
        return "#60a5fa";
    }

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", padding: "0 8px", marginBottom: "20px" }}>ADMIN PORTAL</div>

                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[
                        { icon: "⚡", label: "Overview", tab: "overview" },
                        { icon: "📦", label: "Manage Orders", tab: "orders" },
                        { icon: "👨‍🌾", label: "Farmers", tab: "farmers" },
                        { icon: "🌾", label: "Crops", tab: "crops" },
                    ].map((item, i) => (
                        <div key={i} onClick={() => setActiveTab(item.tab)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", cursor: "pointer", background: activeTab === item.tab ? "rgba(167,139,250,0.12)" : "transparent", border: activeTab === item.tab ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent" }}>
                            <span style={{ fontSize: "14px" }}>{item.icon}</span>
                            <span style={{ fontSize: "12px", color: activeTab === item.tab ? "#a78bfa" : "rgba(255,255,255,0.4)", fontWeight: activeTab === item.tab ? "600" : "400" }}>{item.label}</span>
                        </div>
                    ))}
                </nav>

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

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · GROWISE ADMIN PANEL</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>Agricultural Command Center</h1>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "white" }}>{time}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{today}</div>
                    </div>
                </div>

                {/* KPI Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "20px" }}>
                    {[
                        { label: "Farmers", value: loading ? "..." : stats.farmers, color: "#4ade80", icon: "👨‍🌾" },
                        { label: "Crops Listed", value: loading ? "..." : stats.crops, color: "#60a5fa", icon: "🌾" },
                        { label: "Total Orders", value: loading ? "..." : stats.orders, color: "#fbbf24", icon: "📦" },
                        { label: "Consumers", value: loading ? "..." : stats.consumers, color: "#a78bfa", icon: "🛒" },
                        { label: "Total Revenue", value: loading ? "..." : `₹${stats.totalRevenue}`, color: "#f87171", icon: "💰" },
                    ].map((k, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${k.color}22`, borderTop: `3px solid ${k.color}`, borderRadius: "12px", padding: "14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontSize: "18px" }}>{k.icon}</span>
                                <span style={{ fontSize: "9px", color: k.color, fontWeight: "600" }}>LIVE</span>
                            </div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "4px" }}>{k.value}</div>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 Recent Orders</div>
                            {loading ? <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Loading...</div> :
                                orders.slice(0, 5).map((order, i) => {
                                    const itemNames = order.order_items?.map((it: any) => it.crop_name).join(", ") || "Order";
                                    const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                                    return (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                            <div>
                                                <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{itemNames}</div>
                                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{date}</div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontSize: "13px", fontWeight: "700", color: "#4ade80" }}>₹{order.total}</span>
                                                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", color: getStatusColor(order.status), background: `${getStatusColor(order.status)}15` }}>{order.status}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 Active Crops</div>
                            {loading ? <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Loading...</div> :
                                crops.filter(c => c.status === "Active").slice(0, 5).map((crop, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <img src={crop.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=40&h=40&fit=crop"} alt={crop.name} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{crop.name}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{crop.quantity}kg · {crop.location}</div>
                                        </div>
                                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80" }}>₹{crop.price}/kg</div>
                                    </div>
                                ))}
                        </div>

                        <div style={{ background: "#012e2f", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>♻️ Platform Impact</div>
                            {[
                                { label: "Zero Middlemen", value: "100%", color: "#4ade80" },
                                { label: "Direct Farmer Pay", value: "100%", color: "#60a5fa" },
                                { label: "Platform Fee", value: "₹0", color: "#fbbf24" },
                                { label: "Food Transparency", value: "QR Verified", color: "#a78bfa" },
                                { label: "Total Revenue Generated", value: `₹${stats.totalRevenue}`, color: "#4ade80" },
                            ].map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: s.color }}>{s.value}</span>
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
                                { label: "Payment Gateway", status: "₹0 Fee", color: "#fbbf24" },
                            ].map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                    <span style={{ fontSize: "11px", fontWeight: "600", color: s.color, background: `${s.color}15`, padding: "2px 8px", borderRadius: "999px" }}>✅ {s.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === "orders" && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 All Orders — Update Status</div>
                        {loading ? <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</div> :
                            orders.length === 0 ? <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "24px" }}>No orders yet</div> :
                                orders.map((order, i) => {
                                    const itemNames = order.order_items?.map((it: any) => it.crop_name).join(", ") || "Order";
                                    const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                    return (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px", marginBottom: "10px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Order #{order.id?.slice(0, 8)}</div>
                                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{itemNames}</div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>🗓️ {date} · {order.quantity}kg · ₹{order.total}</div>
                                                </div>
                                                <div style={{ fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "999px", color: getStatusColor(order.status), background: `${getStatusColor(order.status)}15`, border: `1px solid ${getStatusColor(order.status)}30` }}>
                                                    {order.status}
                                                </div>
                                            </div>
                                            {/* Status update buttons */}
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                {statusSteps.map((step, j) => (
                                                    <button key={j} onClick={() => updateOrderStatus(order.id, step)} disabled={order.status === step || updating === order.id} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: order.status === step ? `1px solid ${getStatusColor(step)}` : "1px solid rgba(255,255,255,0.1)", background: order.status === step ? `${getStatusColor(step)}15` : "rgba(255,255,255,0.04)", color: order.status === step ? getStatusColor(step) : "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "600", cursor: order.status === step ? "default" : "pointer" }}>
                                                        {updating === order.id ? "..." : step}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                )}

                {/* FARMERS TAB */}
                {activeTab === "farmers" && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>👨‍🌾 All Registered Farmers</div>
                        {loading ? <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</div> :
                            farmers.length === 0 ? <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "24px" }}>No farmers registered yet</div> :
                                farmers.map((farmer, i) => {
                                    const farmerCrops = crops.filter(c => c.farmer_id === farmer.id);
                                    const farmerOrders = orders.filter(o => o.farmer_id === farmer.id);
                                    const revenue = farmerOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
                                    return (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "14px" }}>
                                            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                                                {farmer.name?.[0]?.toUpperCase() || "F"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "14px", fontWeight: "700", color: "white", marginBottom: "3px" }}>{farmer.name || farmer.email}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>📍 {farmer.location || "Tamil Nadu"} · {farmer.email}</div>
                                            </div>
                                            <div style={{ display: "flex", gap: "16px" }}>
                                                {[
                                                    { label: "Crops", value: farmerCrops.length, color: "#4ade80" },
                                                    { label: "Orders", value: farmerOrders.length, color: "#60a5fa" },
                                                    { label: "Revenue", value: `₹${revenue}`, color: "#fbbf24" },
                                                ].map((s, j) => (
                                                    <div key={j} style={{ textAlign: "center" }}>
                                                        <div style={{ fontSize: "16px", fontWeight: "700", color: s.color }}>{s.value}</div>
                                                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                )}

                {/* CROPS TAB */}
                {activeTab === "crops" && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 All Crop Listings</div>
                        {loading ? <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading...</div> :
                            crops.length === 0 ? <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "24px" }}>No crops listed yet</div> :
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                                    {crops.map((crop, i) => (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
                                            <img src={crop.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=200&fit=crop"} alt={crop.name} style={{ width: "100%", height: "80px", objectFit: "cover" }} />
                                            <div style={{ padding: "10px 12px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                    <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{crop.name}</div>
                                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#4ade80" }}>₹{crop.price}/kg</div>
                                                </div>
                                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>{crop.quantity}kg · {crop.location}</div>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <div style={{ flex: 1, textAlign: "center", padding: "4px", background: crop.status === "Active" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${crop.status === "Active" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: "6px", fontSize: "10px", color: crop.status === "Active" ? "#4ade80" : "#f87171", fontWeight: "600" }}>
                                                        {crop.status || "Active"}
                                                    </div>
                                                    <button onClick={() => deleteCrop(crop.id)} style={{ padding: "4px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", color: "#f87171", fontSize: "10px", cursor: "pointer", fontWeight: "600" }}>✕ Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                    </div>
                )}
            </div>
        </main>
    );
}
