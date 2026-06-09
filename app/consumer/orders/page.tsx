"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const steps = ["Placed", "Processing", "On the way", "Delivered"];

export default function MyOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { window.location.href = "/login"; return; }
        setUser(authUser);

        const { data } = await supabase
            .from("orders")
            .select("*, crops(name, image_url, price), users!orders_farmer_id_fkey(name, location)")
            .eq("consumer_id", authUser.id)
            .order("created_at", { ascending: false }) as { data: any[] };

        const result = data || [];
        setOrders(result);
        if (result.length > 0) setSelected(result[0]);
        setLoading(false);
    }

    function getStatus(status: string) {
        const s = (status || "processing").toLowerCase();
        if (s === "delivered") return { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)", icon: "✅" };
        if (s === "on the way") return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: "🚛" };
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)", icon: "⏳" };
    }

    const totalSpent = orders.reduce((a, o) => a + (o.total || 0), 0);
    const totalSaved = orders.reduce((a, o) => a + (o.amount_saved || 0), 0);
    const farmerIds = new Set(orders.map(o => o.farmer_id));

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
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Every rupee goes directly to the farmer. No middlemen. No markup.</div>
                    </div>
                    <div style={{ display: "flex", gap: "32px" }}>
                        {[
                            { label: "Total Spent", value: `₹${totalSpent}`, color: "#60a5fa" },
                            { label: "Saved vs Supermarket", value: `₹${totalSaved}`, color: "#4ade80" },
                            { label: "Total Orders", value: orders.length, color: "#fbbf24" },
                            { label: "Farmers Supported", value: farmerIds.size, color: "#a78bfa" },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                        Loading your orders...
                    </div>
                )}

                {/* No orders */}
                {!loading && orders.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px", background: "#012e2f", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "white", marginBottom: "8px" }}>No orders yet!</div>
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "20px" }}>Start shopping fresh produce from Tamil Nadu farmers.</div>
                        <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                            <div style={{ background: "#4ade80", color: "#0a0a0a", borderRadius: "12px", padding: "12px 28px", fontSize: "14px", fontWeight: "700", display: "inline-block" }}>
                                Shop Now →
                            </div>
                        </a>
                    </div>
                )}

                {/* Real orders */}
                {!loading && orders.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "20px" }}>

                        {/* Orders list */}
                        <div style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: "18px", top: "24px", bottom: "24px", width: "2px", background: "rgba(255,255,255,0.05)" }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                {orders.map((order) => {
                                    const st = getStatus(order.status);
                                    const isSelected = selected?.id === order.id;
                                    const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                    return (
                                        <div key={order.id} style={{ display: "flex", gap: "16px", position: "relative", zIndex: 1 }}>
                                            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: isSelected ? st.bg : "rgba(0,0,0,0.3)", border: `2px solid ${isSelected ? st.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                                                {st.icon}
                                            </div>
                                            <div onClick={() => setSelected(order)} style={{ flex: 1, background: isSelected ? "rgba(96,165,250,0.05)" : "#012e2f", border: isSelected ? "2px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                    <div>
                                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Order #{order.id?.slice(0, 8)}</div>
                                                        <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{order.crops?.name || "Product"}</div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "4px" }}>₹{order.total || 0}</div>
                                                        <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 10px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.icon} {order.status}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>🗓️ {date}</div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>👨‍🌾 {order.users?.name || "Farmer"}</div>
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
                        </div>

                        {/* Detail panel */}
                        {selected && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "24px", height: "fit-content" }}>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                                    <div style={{ position: "relative", height: "100px" }}>
                                        <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=200&fit=crop" alt="farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,46,47,0.95), rgba(0,0,0,0.4))" }} />
                                        <div style={{ position: "absolute", inset: 0, padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "rgba(74,222,128,0.2)", border: "2px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>👨‍🌾</div>
                                            <div>
                                                <div style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>{selected.users?.name || "Farmer"}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>📍 {selected.users?.location || "Tamil Nadu"}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>🛒 Items in this Order</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                                        <img src={selected.crops?.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80&h=80&fit=crop"} alt={selected.crops?.name} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{selected.crops?.name || "Product"}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{selected.quantity || 1}kg × ₹{selected.crops?.price || 0}/kg</div>
                                        </div>
                                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{selected.total || 0}</div>
                                    </div>
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
                                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "2px" }}>💰 You saved ₹{selected.amount_saved} on this order</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>vs buying from a supermarket</div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <a href="/consumer/qr" style={{ textDecoration: "none", flex: 1 }}>
                                        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>📱 Farm Story</div>
                                    </a>
                                    <a href="/consumer/shop" style={{ textDecoration: "none", flex: 1 }}>
                                        <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "10px", padding: "10px", textAlign: "center", fontSize: "12px", color: "white", fontWeight: "700" }}>🔄 Reorder</div>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
