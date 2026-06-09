"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const steps = ["Placed", "Processing", "On the way", "Delivered"];

export default function MyOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { window.location.href = "/login"; return; }

        const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .eq("consumer_id", authUser.id)
            .order("created_at", { ascending: false }) as { data: any[] };

        if (!ordersData) { setLoading(false); return; }

        // Fetch order_items for each order
        const ordersWithItems = await Promise.all(ordersData.map(async (order) => {
            const { data: items } = await supabase
                .from("order_items")
                .select("*")
                .eq("order_id", order.id) as { data: any[] };
            return { ...order, items: items || [] };
        }));

        setOrders(ordersWithItems);
        if (ordersWithItems.length > 0) setSelected(ordersWithItems[0]);
        setLoading(false);
    }

    async function deleteOrder(orderId: string) {
        if (!confirm("Delete this order?")) return;
        await supabase.from("order_items").delete().eq("order_id", orderId);
        await supabase.from("orders").delete().eq("id", orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selected?.id === orderId) setSelected(null);
    }

    function getStatus(status: string) {
        const s = (status || "processing").toLowerCase();
        if (s === "delivered") return { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)", icon: "✅" };
        if (s === "on the way") return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: "🚛" };
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)", icon: "⏳" };
    }

    const totalSpent = orders.reduce((a, o) => a + (o.total || 0), 0);
    const totalSaved = orders.reduce((a, o) => a + (o.amount_saved || 0), 0);

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh", backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Consumer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/consumer" },
                        { icon: "🥦", label: "Shop", href: "/consumer/shop" },
                        { icon: "📱", label: "Scan QR", href: "/consumer/qr" },
                        { icon: "🥗", label: "Nutrition", href: "/consumer/nutrition" },
                        { icon: "📦", label: "My Orders", href: "/consumer/orders", active: true },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(96,165,250,0.12)" : "transparent", border: item.active ? "1px solid rgba(96,165,250,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
                            </div>
                        </a>
                    ))}
                </nav>
                <div onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span>🚪</span>
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
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
                            <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", letterSpacing: ".06em" }}>ORDER HISTORY</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>📦 My Orders</h1>
                    </div>
                    <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                        <div style={{ background: "#60a5fa", borderRadius: "10px", padding: "8px 18px", fontSize: "12px", color: "#0a0a0a", fontWeight: "700" }}>+ Order More</div>
                    </a>
                </div>

                {/* Impact bar */}
                <div style={{ background: "linear-gradient(135deg, #012e2f, #013a3b)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "18px 24px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 Your Impact — Helping Real Farmers</div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Every rupee goes directly to the farmer. No middlemen.</div>
                    </div>
                    <div style={{ display: "flex", gap: "32px" }}>
                        {[
                            { label: "Total Spent", value: `₹${totalSpent}`, color: "#60a5fa" },
                            { label: "Saved vs Supermarket", value: `₹${totalSaved}`, color: "#4ade80" },
                            { label: "Total Orders", value: orders.length, color: "#fbbf24" },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {loading && <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)" }}>Loading your orders...</div>}

                {!loading && orders.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px", background: "#012e2f", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "white", marginBottom: "8px" }}>No orders yet!</div>
                        <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                            <div style={{ background: "#4ade80", color: "#0a0a0a", borderRadius: "12px", padding: "12px 28px", fontSize: "14px", fontWeight: "700", display: "inline-block", marginTop: "12px" }}>Shop Now →</div>
                        </a>
                    </div>
                )}

                {!loading && orders.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "20px" }}>

                        {/* Orders list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {orders.map((order) => {
                                const st = getStatus(order.status);
                                const isSelected = selected?.id === order.id;
                                const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                const itemNames = order.items.length > 0
                                    ? order.items.map((i: any) => i.crop_name).join(", ")
                                    : "Order";

                                return (
                                    <div key={order.id} style={{ display: "flex", gap: "16px" }}>
                                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: isSelected ? st.bg : "rgba(0,0,0,0.3)", border: `2px solid ${isSelected ? st.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                                            {st.icon}
                                        </div>
                                        <div onClick={() => setSelected(order)} style={{ flex: 1, background: isSelected ? "rgba(96,165,250,0.05)" : "#012e2f", border: isSelected ? "2px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", position: "relative" }}>

                                            {/* Delete button */}
                                            <button onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", padding: "3px 10px", color: "#f87171", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>✕ Delete</button>

                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", paddingRight: "70px" }}>
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Order #{order.id?.slice(0, 8)}</div>
                                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{itemNames}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "4px" }}>₹{order.total || 0}</div>
                                                    <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 10px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.icon} {order.status}</div>
                                                </div>
                                            </div>

                                            {/* Items summary */}
                                            {order.items.length > 0 && (
                                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                                    {order.items.map((item: any, i: number) => (
                                                        <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "3px 8px", fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>
                                                            {item.crop_name} × {item.quantity}kg = ₹{item.total}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>🗓️ {date}</div>
                                                {order.amount_saved > 0 && <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>💰 Saved ₹{order.amount_saved}</div>}
                                            </div>

                                            {/* Progress bar */}
                                            <div style={{ marginTop: "10px", display: "flex", alignItems: "center" }}>
                                                {steps.map((step, i) => {
                                                    const curr = steps.findIndex(s => s.toLowerCase() === (order.status || "").toLowerCase());
                                                    const done = i <= curr;
                                                    return (
                                                        <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: done ? st.color : "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                                                            {i < 3 && <div style={{ flex: 1, height: "2px", background: i < curr ? st.color : "rgba(255,255,255,0.06)" }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                                                {steps.map((step, i) => {
                                                    const curr = steps.findIndex(s => s.toLowerCase() === (order.status || "").toLowerCase());
                                                    return <div key={i} style={{ fontSize: "8px", color: i <= curr ? st.color : "rgba(255,255,255,0.2)" }}>{step}</div>;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Detail panel */}
                        {selected && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "24px", height: "fit-content" }}>

                                {/* Bill Summary */}
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🛒 Items in this Order</div>
                                    {selected.items.length > 0 ? selected.items.map((item: any, i: number) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < selected.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                            <div>
                                                <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{item.crop_name}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{item.quantity}kg × ₹{item.price}/kg</div>
                                            </div>
                                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{item.total}</div>
                                        </div>
                                    )) : (
                                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>No items found</div>
                                    )}
                                </div>

                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🧾 Smart Bill Summary</div>
                                    {[
                                        { label: "Subtotal", value: `₹${selected.total || 0}`, color: "white" },
                                        { label: "Delivery Charges", value: "₹0 — Free!", color: "#4ade80" },
                                        { label: "Platform Fee", value: "₹0 — We don't charge!", color: "#4ade80" },
                                        { label: "Middleman Cut", value: "₹0 — Eliminated!", color: "#4ade80" },
                                    ].map((d, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{d.label}</span>
                                            <span style={{ fontSize: "12px", fontWeight: "600", color: d.color }}>{d.value}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>Total Paid</span>
                                        <span style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80" }}>₹{selected.total || 0}</span>
                                    </div>
                                    {selected.amount_saved > 0 && (
                                        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "10px", padding: "10px 12px", marginTop: "8px" }}>
                                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>💰 You saved ₹{selected.amount_saved} vs supermarket!</div>
                                        </div>
                                    )}
                                </div>

                                {/* Tracking */}
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🚚 Order Tracking</div>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        {steps.map((step, i) => {
                                            const curr = steps.findIndex(s => s.toLowerCase() === (selected.status || "").toLowerCase());
                                            const done = i <= curr;
                                            const st = getStatus(selected.status);
                                            return (
                                                <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                                    <div style={{ textAlign: "center", flex: 1 }}>
                                                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: done ? st.color : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", fontSize: "10px", color: done ? "#0a0a0a" : "rgba(255,255,255,0.3)", fontWeight: "700" }}>
                                                            {done ? "✓" : i + 1}
                                                        </div>
                                                        <div style={{ fontSize: "9px", color: done ? st.color : "rgba(255,255,255,0.25)" }}>{step}</div>
                                                    </div>
                                                    {i < 3 && <div style={{ height: "2px", flex: 1, background: i < curr ? st.color : "rgba(255,255,255,0.06)", marginBottom: "16px" }} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                                    <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "10px", padding: "12px", textAlign: "center", fontSize: "13px", color: "white", fontWeight: "700" }}>🔄 Order Again</div>
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
