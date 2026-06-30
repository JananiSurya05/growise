"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useConsumerOrderUpdates } from "../../lib/useRealtime";
import { useToast } from "../../lib/useToast";
import type { OrderItem } from "../../lib/types";
import ConsumerLayout from "../../components/ConsumerLayout";
import AppEmptyState from "../../components/ui/AppEmptyState";
import AppLoadingState from "../../components/ui/AppLoadingState";

type OrderRow = {
    id: string;
    total: number;
    quantity: number;
    amount_saved: number;
    status: string;
    created_at: string;
    updated_at: string;
    items: OrderItem[];
};

const steps = ["Placed", "Processing", "On the way", "Delivered"];

export default function MyOrders() {
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [selected, setSelected] = useState<OrderRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [consumerId, setConsumerId] = useState<string | undefined>();
    const { toast } = useToast();

    const loadOrders = useCallback(async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { window.location.href = "/login"; return; }
        setConsumerId(authUser.id);

        type RawOrder = { id: string; total: number; quantity: number; amount_saved: number; status: string; created_at: string; updated_at: string };
        const { data: ordersData } = await supabase
            .from("orders")
            .select("id, total, quantity, amount_saved, status, created_at, updated_at")
            .eq("consumer_id", authUser.id)
            .order("created_at", { ascending: false }) as { data: RawOrder[] | null };

        if (!ordersData) { setLoading(false); return; }

        // Batch-fetch all order_items in a single query (P-3)
        const orderIds = ordersData.map((o) => o.id);
        const { data: allItems } = await supabase
            .from("order_items")
            .select("id, order_id, crop_name, quantity, price, total")
            .in("order_id", orderIds) as { data: OrderItem[] | null };

        const itemsByOrder = new Map<string, OrderItem[]>();
        for (const item of (allItems || [])) {
            const list = itemsByOrder.get(item.order_id) ?? [];
            list.push(item);
            itemsByOrder.set(item.order_id, list);
        }

        const ordersWithItems: OrderRow[] = ordersData.map((order) => ({
            ...order,
            items: itemsByOrder.get(order.id) ?? [],
        }));

        setOrders(ordersWithItems);
        if (ordersWithItems.length > 0) setSelected(ordersWithItems[0]);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadOrders();
    }, [loadOrders]);

    // Live order status updates via Supabase Realtime
    const handleOrderUpdate = useCallback((updated: Record<string, unknown>) => {
        const orderId = updated.id as string;
        const newStatus = updated.status as string;
        const newUpdatedAt = updated.updated_at as string | undefined;
        setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, status: newStatus, updated_at: newUpdatedAt ?? o.updated_at } : o
        ));
        setSelected(prev =>
            prev?.id === orderId ? { ...prev, status: newStatus, updated_at: newUpdatedAt ?? prev.updated_at } : prev
        );
        const statusLabel = newStatus === "Delivered" ? "Your order has been delivered!" :
            newStatus === "On the way" ? "Your order is on the way!" :
            `Order status updated to ${newStatus}`;
        const toastType = newStatus === "Delivered" ? "success" : "info";
        toast({ type: toastType, title: statusLabel, duration: 7000 });
    }, [toast]);

    useConsumerOrderUpdates(consumerId, handleOrderUpdate);

    async function deleteOrder(orderId: string) {
        if (!consumerId) return;
        // Ownership enforced: both clauses required so neither succeeds alone
        await supabase.from("order_items").delete().eq("order_id", orderId);
        await supabase.from("orders").delete().eq("id", orderId).eq("consumer_id", consumerId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selected?.id === orderId) setSelected(null);
        setDeleteConfirm(null);
    }

    function formatUpdatedAt(iso: string | undefined) {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
        <ConsumerLayout activeHref="/consumer/orders">

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa", animation: "pulse 2s infinite" }} />
                            <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", letterSpacing: ".06em" }}>ORDER HISTORY · LIVE TRACKING</span>
                            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
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

                {loading && <AppLoadingState fullScreen={false} label="Loading your orders..." />}

                {!loading && orders.length === 0 && (
                    <div style={{ background: "#012e2f", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <AppEmptyState
                            icon="📦"
                            title="No orders yet!"
                            action={
                                <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                                    <div style={{ background: "#4ade80", color: "#0a0a0a", borderRadius: "12px", padding: "12px 28px", fontSize: "14px", fontWeight: "700", display: "inline-block" }}>Shop Now →</div>
                                </a>
                            }
                        />
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
                                    ? order.items.map((item: OrderItem) => item.crop_name).join(", ")
                                    : "Order";

                                return (
                                    <div key={order.id} style={{ display: "flex", gap: "16px" }}>
                                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: isSelected ? st.bg : "rgba(0,0,0,0.3)", border: `2px solid ${isSelected ? st.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                                            {st.icon}
                                        </div>
                                        <div role="button" tabIndex={0} aria-label={`View details for order ${order.id?.slice(0, 8)}`} onClick={() => setSelected(order)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(order); } }} style={{ flex: 1, background: isSelected ? "rgba(96,165,250,0.05)" : "#012e2f", border: isSelected ? "2px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", position: "relative" }}>

                                            {/* Delete button */}
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(order.id); }} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", padding: "3px 10px", color: "#f87171", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>✕ Delete</button>

                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", paddingRight: "70px" }}>
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>Order #{order.id?.slice(0, 8)}</div>
                                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>{itemNames}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "4px" }}>₹{order.total || 0}</div>
                                                    <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 10px", borderRadius: "999px", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.icon} {order.status}</div>
                                                    {formatUpdatedAt(order.updated_at) && (
                                                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>Updated {formatUpdatedAt(order.updated_at)}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Items summary */}
                                            {order.items.length > 0 && (
                                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                                    {order.items.map((item: OrderItem, i: number) => (
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
                                    {selected.items.length > 0 ? selected.items.map((item: OrderItem, i: number) => (
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
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>🚚 Order Tracking</div>
                                        {formatUpdatedAt(selected.updated_at) && (
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Last updated {formatUpdatedAt(selected.updated_at)}</div>
                                        )}
                                    </div>
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

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#012e2f', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '20px', padding: '28px', maxWidth: '360px', width: '90%', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>Discard this order?</div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>This will permanently remove the order and all its items.</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                Keep Order
                            </button>
                            <button onClick={() => deleteOrder(deleteConfirm)} style={{ flex: 1, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '12px', padding: '12px', color: '#f87171', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                Discard ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConsumerLayout>
    );
}
