"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/useAuth";
import { supabase } from "../../lib/supabase";
import FarmerLayout from "../../components/FarmerLayout";
import AppEmptyState from "../../components/ui/AppEmptyState";

type OrderItem = { crop_name: string; quantity: number; price: number; total: number };
type Order = { id: string; total: number; quantity: number; amount_saved: number; status: string; created_at: string; order_items?: OrderItem[] };

const NEXT_STATUS: Record<string, string> = {
    Processing: "On the way",
    "On the way": "Delivered",
};

export default function SalesPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    async function loadSales() {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from("orders")
            .select("id, total, quantity, amount_saved, status, created_at, order_items(crop_name, quantity, price, total)")
            .eq("farmer_id", user.id)
            .order("created_at", { ascending: false }) as { data: Order[] | null };
        setOrders(data || []);
        setLoading(false);
    }

    async function advanceStatus(orderId: string, currentStatus: string) {
        const nextStatus = NEXT_STATUS[currentStatus];
        if (!nextStatus) return;
        setUpdatingId(orderId);
        try {
            const res = await fetch("/api/orders/update-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: nextStatus }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: "Failed to update status." }));
                alert(body.error ?? "Failed to update status.");
                return;
            }
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
        } finally {
            setUpdatingId(null);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (user) loadSales();
    }, [user]);

    if (authLoading) return <AppLoadingState />;

    const totalRevenue = orders.reduce((a, o) => a + (o.total || 0), 0);
    const totalOrders = orders.length;
    const totalKg = orders.reduce((a, o) => a + (o.quantity || 0), 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    function getStatus(status: string) {
        if (status === "Delivered") return { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)" };
        if (status === "On the way") return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)" };
        return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)" };
    }

    return (
        <FarmerLayout activeHref="/farmer/sales" firstName={user?.user_metadata?.full_name?.split(" ")[0] || "Farmer"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE SALES DATA</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>📊 My Sales Dashboard</h1>
                    </div>
                </div>

                {/* Banner */}
                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "110px" }}>
                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=300&fit=crop" alt="sales" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>YOUR GROWISE EARNINGS</div>
                            <div style={{ fontSize: "26px", fontWeight: "800", color: "white" }}>₹{totalRevenue.toLocaleString()} <span style={{ fontSize: "13px", color: "#4ade80" }}>total revenue · no middleman cut</span></div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[
                                { label: "Total Orders", value: totalOrders, color: "#60a5fa" },
                                { label: "Total Sold", value: `${totalKg}kg`, color: "#fbbf24" },
                                { label: "Avg Order", value: `₹${avgOrder}`, color: "#a78bfa" },
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

                {/* Orders */}
                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                    <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🧾 Recent Orders</div>

                    {loading ? (
                        <AppLoadingState fullScreen={false} label="Loading orders..." />
                    ) : orders.length === 0 ? (
                        <AppEmptyState icon="📦" title="No orders yet" description="When consumers order your crops, they'll appear here!" />
                    ) : orders.map((order, i) => {
                        const st = getStatus(order.status);
                        const itemNames = order.order_items?.map((it: OrderItem) => it.crop_name).join(", ") || "Order";
                        const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                        const nextStatus = NEXT_STATUS[order.status];
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < orders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🌾</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{itemNames} · {order.quantity}kg</div>
                                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>₹{order.total}</div>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px" }}>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>🗓️ {date}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{order.status}</div>
                                            {nextStatus && (
                                                <button
                                                    onClick={() => advanceStatus(order.id, order.status)}
                                                    disabled={updatingId === order.id}
                                                    style={{ fontSize: "10px", fontWeight: "600", padding: "3px 10px", borderRadius: "999px", color: "#0a0a0a", background: "#4ade80", border: "none", cursor: updatingId === order.id ? "default" : "pointer", opacity: updatingId === order.id ? 0.6 : 1 }}
                                                >
                                                    {updatingId === order.id ? "Updating…" : `Mark "${nextStatus}" →`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* GroWise vs Middleman */}
                {totalRevenue > 0 && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "18px", marginTop: "16px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>💰 GroWise vs Middleman</div>
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
                        <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginBottom: "14px" }}>
                            <div style={{ width: "55%", height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", borderRadius: "4px" }} />
                        </div>
                        <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "22px", fontWeight: "800", color: "#4ade80" }}>+₹{Math.round(totalRevenue * 0.45).toLocaleString()}</div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>extra earned by selling direct on GroWise</div>
                        </div>
                    </div>
                )}
        </FarmerLayout>
    );
}
