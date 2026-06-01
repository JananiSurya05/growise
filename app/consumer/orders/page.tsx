"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type OrderItem = {
    name: string;
    qty: number;
    price: number;
    img: string;
};

type Order = {
    id: string;
    date: string;
    deliveryDate: string;
    status: string;
    items: OrderItem[];
    farmer: string;
    farmerImg: string;
    location: string;
    subtotal: number;
    saved: number;
    rating: number;
    method: string;
};

const demoOrders: Order[] = [
    {
        id: "GW-2026-001",
        date: "15 May 2026",
        deliveryDate: "16 May 2026",
        status: "Delivered",
        items: [
            { name: "Tomato", qty: 5, price: 25, img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=80&h=80&fit=crop" },
            { name: "Spinach", qty: 3, price: 30, img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=80&h=80&fit=crop" },
        ],
        farmer: "Ravi Kumar",
        farmerImg: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=100&h=100&fit=crop",
        location: "Thiruvallur",
        subtotal: 215,
        saved: 59,
        rating: 5,
        method: "Organic · No pesticides",
    },
    {
        id: "GW-2026-002",
        date: "18 May 2026",
        deliveryDate: "20 May 2026",
        status: "On the way",
        items: [
            { name: "Rice", qty: 10, price: 40, img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=80&h=80&fit=crop" },
            { name: "Onion", qty: 4, price: 20, img: "https://images.unsplash.com/photo-1508747703725-719777637510?w=80&h=80&fit=crop" },
        ],
        farmer: "Suresh Babu",
        farmerImg: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=100&h=100&fit=crop",
        location: "Thanjavur",
        subtotal: 480,
        saved: 134,
        rating: 0,
        method: "Traditional paddy farming",
    },
    {
        id: "GW-2026-003",
        date: "19 May 2026",
        deliveryDate: "21 May 2026",
        status: "Processing",
        items: [
            { name: "Chilli", qty: 2, price: 80, img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=80&h=80&fit=crop" },
        ],
        farmer: "Murugan",
        farmerImg: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=100&h=100&fit=crop",
        location: "Ramanathapuram",
        subtotal: 160,
        saved: 60,
        rating: 0,
        method: "Drip irrigation · Low water",
    },
];

const steps = ["Placed", "Processing", "On the way", "Delivered"];

export default function MyOrders() {
    const [selected, setSelected] = useState<Order>(demoOrders[0]);
    const [realOrders, setRealOrders] = useState<any[]>([]);

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        const userStr = localStorage.getItem("growise_user");
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user) return;

        const { data } = await supabase
            .from("orders")
            .select("*, crops(name, image_url, price), users!orders_farmer_id_fkey(name, location)")
            .eq("consumer_id", user.id) as { data: any[] };

        if (data) setRealOrders(data);
    }

    function getStatus(status: string) {
        if (status === "Delivered") return { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)", icon: "✅" };
        if (status === "On the way") return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: "🚛" };
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)", icon: "⏳" };
    }

    const totalSpent = demoOrders.reduce((a, o) => a + o.subtotal, 0);
    const totalSaved = demoOrders.reduce((a, o) => a + o.saved, 0);

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
                <a href="/login" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span>🚪</span>
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
                            { label: "Real Orders", value: realOrders.length, color: "#fbbf24" },
                            { label: "Farmers Supported", value: demoOrders.length, color: "#a78bfa" },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Real orders from database */}
                {realOrders.length > 0 && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "16px", padding: "18px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                            🟢 Your Live Orders from Database ({realOrders.length})
                        </div>
                        {realOrders.map((order, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < realOrders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <img src={order.crops?.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80&h=80&fit=crop"} alt={order.crops?.name} style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white", marginBottom: "2px" }}>{order.crops?.name}</div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>👨‍🌾 {order.users?.name || "Farmer"} · 📍 {order.users?.location || "Tamil Nadu"} · ₹{order.total}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#4ade80", marginBottom: "4px" }}>₹{order.total}</div>
                                    <div style={{ fontSize: "10px", fontWeight: "600", padding: "3px 10px", borderRadius: "999px", color: "#60a5fa", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>⏳ {order.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>📋 Order History (Demo)</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "20px" }}>

                    {/* Timeline */}
                    <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: "18px", top: "24px", bottom: "24px", width: "2px", background: "rgba(255,255,255,0.05)" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {demoOrders.map((order) => {
                                const st = getStatus(order.status);
                                const isSelected = selected?.id === order.id;
                                return (
                                    <div key={order.id} style={{ display: "flex", gap: "16px", position: "relative", zIndex: 1 }}>
                                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: isSelected ? st.bg : "rgba(0,0,0,0.3)", border: `2px solid ${isSelected ? st.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, boxShadow: isSelected ? `0 0 12px ${st.color}44` : "none" }}>
                                            {st.icon}
                                        </div>
                                        <div onClick={() => setSelected(order)} style={{ flex: 1, background: isSelected ? "rgba(96,165,250,0.05)" : "#012e2f", border: isSelected ? "2px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Order #{order.id}</div>
                                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{order.items.map(i => i.name).join(", ")}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "4px" }}>₹{order.subtotal}</div>
                                                    <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 10px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.icon} {order.status}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                                                {order.items.map((item, i) => (
                                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "5px 10px" }}>
                                                        <img src={item.img} alt={item.name} style={{ width: "22px", height: "22px", borderRadius: "4px", objectFit: "cover" }} />
                                                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{item.name} · {item.qty}kg</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>🗓️ {order.date}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>👨‍🌾 {order.farmer}</div>
                                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600" }}>💰 Saved ₹{order.saved}</div>
                                            </div>
                                            <div style={{ marginTop: "10px", display: "flex", alignItems: "center" }}>
                                                {steps.map((step, i) => {
                                                    const curr = steps.indexOf(order.status);
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
                                                {steps.map((step, i) => (
                                                    <div key={i} style={{ fontSize: "8px", color: i <= steps.indexOf(order.status) ? st.color : "rgba(255,255,255,0.2)" }}>{step}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detail panel */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "24px", height: "fit-content" }}>
                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
                            <div style={{ position: "relative", height: "100px" }}>
                                <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=200&fit=crop" alt="farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,46,47,0.95), rgba(0,0,0,0.4))" }} />
                                <div style={{ position: "absolute", inset: 0, padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                    <img src={selected.farmerImg} alt={selected.farmer} style={{ width: "52px", height: "52px", borderRadius: "12px", objectFit: "cover", border: "2px solid rgba(74,222,128,0.4)" }} />
                                    <div>
                                        <div style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>{selected.farmer}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>📍 {selected.location}</div>
                                        <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "2px" }}>{selected.method}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                            <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>🛒 Items in this Order</div>
                            {selected.items.map((item: OrderItem, i: number) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: i < selected.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <img src={item.img} alt={item.name} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{item.name}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{item.qty}kg × ₹{item.price}/kg</div>
                                    </div>
                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{item.qty * item.price}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                            <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🧾 Smart Bill Summary</div>
                            {[
                                { label: "Subtotal", value: `₹${selected.subtotal}`, color: "white" },
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
                                <span style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80" }}>₹{selected.subtotal}</span>
                            </div>
                            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "10px", padding: "10px 12px", marginTop: "8px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "2px" }}>💰 You saved ₹{selected.saved} on this order</div>
                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>vs buying from a supermarket</div>
                            </div>
                        </div>

                        <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🚚 Delivery Status</div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Ordered: {selected.date}</div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Expected: {selected.deliveryDate}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                {steps.map((step, i) => {
                                    const curr = steps.indexOf(selected.status);
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

                        {selected.status === "Delivered" && (
                            <div style={{ background: "#012e2f", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                                <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "600", marginBottom: "8px" }}>⭐ Rate this order</div>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <div key={star} style={{ fontSize: "22px", cursor: "pointer", opacity: star <= selected.rating ? 1 : 0.2 }}>⭐</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "8px" }}>
                            <a href="/consumer/qr" style={{ textDecoration: "none", flex: 1 }}>
                                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>📱 Farm Story</div>
                            </a>
                            <a href="/consumer/shop" style={{ textDecoration: "none", flex: 1 }}>
                                <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "10px", padding: "10px", textAlign: "center", fontSize: "12px", color: "white", fontWeight: "700" }}>🔄 Reorder</div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}