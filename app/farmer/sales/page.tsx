"use client";
import { useState } from "react";

const monthlySales = [
    { month: "Jan", revenue: 3200, orders: 18, kg: 280 },
    { month: "Feb", revenue: 2800, orders: 14, kg: 220 },
    { month: "Mar", revenue: 4100, orders: 22, kg: 340 },
    { month: "Apr", revenue: 3600, orders: 19, kg: 290 },
    { month: "May", revenue: 5200, orders: 28, kg: 420 },
];

const recentOrders = [
    { id: "GW-001", buyer: "Priya Singh", crop: "Tomato", qty: 5, price: 25, total: 125, date: "19 May 2026", status: "Delivered", img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=80&h=80&fit=crop" },
    { id: "GW-002", buyer: "Rahul Kumar", crop: "Rice", qty: 10, price: 40, total: 400, date: "18 May 2026", status: "On the way", img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=80&h=80&fit=crop" },
    { id: "GW-003", buyer: "Anitha Devi", crop: "Chilli", qty: 2, price: 80, total: 160, date: "17 May 2026", status: "Delivered", img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=80&h=80&fit=crop" },
    { id: "GW-004", buyer: "Vijay Mohan", crop: "Tomato", qty: 8, price: 25, total: 200, date: "16 May 2026", status: "Delivered", img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=80&h=80&fit=crop" },
    { id: "GW-005", buyer: "Meera Nair", crop: "Rice", qty: 15, price: 40, total: 600, date: "15 May 2026", status: "Delivered", img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=80&h=80&fit=crop" },
];

const maxRevenue = Math.max(...monthlySales.map(m => m.revenue));

export default function SalesPage() {
    const totalRevenue = monthlySales.reduce((a, m) => a + m.revenue, 0);
    const totalOrders = monthlySales.reduce((a, m) => a + m.orders, 0);
    const totalKg = monthlySales.reduce((a, m) => a + m.kg, 0);
    const avgOrder = Math.round(totalRevenue / totalOrders);

    function getStatus(status: string) {
        if (status === "Delivered") return { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)" };
        if (status === "On the way") return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)" };
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)" };
    }

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            {/* Sidebar */}
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
                        { icon: "💰", label: "Income", href: "/farmer/income" },
                        { icon: "📊", label: "Sales", href: "/farmer/sales", active: true },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(74,222,128,0.12)" : "transparent", border: item.active ? "1px solid rgba(74,222,128,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#4ade80" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
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
            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>SALES ANALYTICS · 2026</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>📊 My Sales Dashboard</h1>
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", background: "#012e2f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 14px" }}>
                        Jan – May 2026
                    </div>
                </div>

                {/* Hero banner */}
                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "110px" }}>
                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=300&fit=crop" alt="sales" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>YOUR GROWISE EARNINGS THIS YEAR</div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: "white" }}>₹{totalRevenue.toLocaleString()} <span style={{ fontSize: "13px", color: "#4ade80" }}>total revenue · no middleman cut</span></div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[
                                { label: "Total Orders", value: totalOrders, color: "#60a5fa" },
                                { label: "Total Sold", value: `${totalKg}kg`, color: "#fbbf24" },
                                { label: "Avg Order Value", value: `₹${avgOrder}`, color: "#a78bfa" },
                                { label: "Platform Fee", value: "₹0", color: "#4ade80" },
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

                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* Revenue chart */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "2px" }}>📈 Monthly Revenue</div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>Jan – May 2026</div>
                                </div>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80" }}>₹{totalRevenue.toLocaleString()}</div>
                            </div>

                            {/* Bar chart */}
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "120px", marginBottom: "8px" }}>
                                {monthlySales.map((m, i) => (
                                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                                        <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "700" }}>₹{(m.revenue / 1000).toFixed(1)}k</div>
                                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                                            <div style={{
                                                width: "100%",
                                                height: `${(m.revenue / maxRevenue) * 100}%`,
                                                background: i === monthlySales.length - 1
                                                    ? "linear-gradient(to top, #16a34a, #4ade80)"
                                                    : "linear-gradient(to top, #013a3b, #015f60)",
                                                borderRadius: "6px 6px 0 0",
                                                border: i === monthlySales.length - 1 ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.06)",
                                                minHeight: "8px"
                                            }} />
                                        </div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{m.month}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                                May 2026 is your best month — ₹5,200 earned 🎉
                            </div>
                        </div>

                        {/* Orders + KG chart */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 Orders per Month</div>
                                {monthlySales.map((m, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", width: "28px" }}>{m.month}</div>
                                        <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                            <div style={{ width: `${(m.orders / 28) * 100}%`, height: "100%", background: "#60a5fa", borderRadius: "3px" }} />
                                        </div>
                                        <div style={{ fontSize: "11px", color: "white", fontWeight: "600", width: "20px" }}>{m.orders}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>⚖️ KG Sold per Month</div>
                                {monthlySales.map((m, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", width: "28px" }}>{m.month}</div>
                                        <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                            <div style={{ width: `${(m.kg / 420) * 100}%`, height: "100%", background: "#fbbf24", borderRadius: "3px" }} />
                                        </div>
                                        <div style={{ fontSize: "11px", color: "white", fontWeight: "600", width: "30px" }}>{m.kg}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent orders */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>🧾 Recent Orders</div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Last 5 orders</div>
                            </div>
                            {recentOrders.map((order, i) => {
                                const st = getStatus(order.status);
                                return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < recentOrders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <img src={order.img} alt={order.crop} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{order.crop} · {order.qty}kg</div>
                                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{order.total}</div>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px" }}>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>👤 {order.buyer} · {order.date}</div>
                                                <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                                                    {order.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* Top crops */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 Top Selling Crops</div>
                            {[
                                { name: "Rice", revenue: 9000, pct: 100, img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=60&h=60&fit=crop", orders: 19 },
                                { name: "Tomato", revenue: 5250, pct: 58, img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=60&h=60&fit=crop", orders: 27 },
                                { name: "Chilli", revenue: 3200, pct: 36, img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=60&h=60&fit=crop", orders: 8 },
                            ].map((c, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                                    <img src={c.img} alt={c.name} style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{c.name}</span>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#4ade80" }}>₹{c.revenue.toLocaleString()}</span>
                                        </div>
                                        <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", marginBottom: "3px" }}>
                                            <div style={{ width: `${c.pct}%`, height: "100%", background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: "3px" }} />
                                        </div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{c.orders} orders</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Middleman comparison */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>💰 GroWise vs Middleman</div>
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Your GroWise earnings</span>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{totalRevenue.toLocaleString()}</span>
                                </div>
                                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginBottom: "12px" }}>
                                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: "4px" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Via middleman (55%)</span>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f87171" }}>₹{Math.round(totalRevenue * 0.55).toLocaleString()}</span>
                                </div>
                                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                                    <div style={{ width: "55%", height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", borderRadius: "4px" }} />
                                </div>
                            </div>
                            <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                                <div style={{ fontSize: "22px", fontWeight: "800", color: "#4ade80" }}>+₹{Math.round(totalRevenue * 0.45).toLocaleString()}</div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>extra earned by selling direct on GroWise</div>
                            </div>
                        </div>

                        {/* Performance stats */}
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                            <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>⚡ Performance Stats</div>
                            {[
                                { label: "Avg Response Time", value: "1.2 hrs", icon: "⏱️", color: "#4ade80" },
                                { label: "Order Completion Rate", value: "98%", icon: "✅", color: "#4ade80" },
                                { label: "Customer Rating", value: "4.8 / 5", icon: "⭐", color: "#fbbf24" },
                                { label: "Repeat Customers", value: "62%", icon: "🔄", color: "#60a5fa" },
                                { label: "Eco Badge", value: "Green ✅", icon: "🌿", color: "#4ade80" },
                            ].map((s, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "16px" }}>{s.icon}</span>
                                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                    </div>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: s.color }}>{s.value}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}