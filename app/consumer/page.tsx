"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { AppUser } from "../lib/types";
import PersonalizedFeed from "../components/PersonalizedFeed";
import ConsumerSidebar from "../components/ConsumerSidebar";
import AppLoadingState from "../components/ui/AppLoadingState";
import AppEmptyState from "../components/ui/AppEmptyState";

type RecentOrder = { id: string; status: string; total: number; quantity: number; crop_id: string; crop_name?: string; product_name?: string };
type StatsOrder = { total: number; amount_saved: number; farmer_id: string };

export default function ConsumerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<AppUser | null>(null);
    const [orders, setOrders] = useState<RecentOrder[]>([]);
    const [stats, setStats] = useState({ totalOrders: 0, totalSaved: 0, totalFarmers: 0 });
    const [loading, setLoading] = useState(true);
    const [consumerId, setConsumerId] = useState("");

    useEffect(() => {
        async function loadData() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.replace("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("users")
                .select("id, name, email, location, role")
                .eq("id", authUser.id)
                .single();

            setConsumerId(authUser.id);
            setUser((profile as AppUser | null) ?? {
                id: authUser.id,
                role: "consumer",
                name: authUser.user_metadata?.full_name ?? authUser.email ?? "User",
                email: authUser.email ?? "",
                location: "Tamil Nadu",
            });

            const { data: orderData } = await supabase
                .from("orders")
                .select("id, status, total, quantity, crop_id")
                .eq("consumer_id", authUser.id)
                .order("created_at", { ascending: false })
                .limit(3);

            setOrders((orderData as RecentOrder[] | null) ?? []);

            const { data: allOrders } = await supabase
                .from("orders")
                .select("total, amount_saved, farmer_id")
                .eq("consumer_id", authUser.id);

            if (allOrders) {
                const typed = allOrders as StatsOrder[];
                const totalSaved = typed.reduce((sum, o) => sum + (o.amount_saved ?? 0), 0);
                const farmerIds = new Set(typed.map((o) => o.farmer_id));
                setStats({ totalOrders: typed.length, totalSaved, totalFarmers: farmerIds.size });
            }

            setLoading(false);
        }

        loadData();
    }, [router]);

    const firstName = user?.name?.split(" ")[0] || "there";
    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const statusColor: Record<string, string> = {
        delivered: "#4ade80",
        "on the way": "#fbbf24",
        processing: "#60a5fa",
        cancelled: "#f87171",
    };

    return (
        <main style={{
            minHeight: "100vh",
            background: "#014D4E",
            fontFamily: "'Segoe UI', sans-serif",
            display: "flex",
        }}>
            <ConsumerSidebar activeHref="/consumer" firstName={loading ? "Consumer" : (user?.name?.split(" ")[0] || user?.email || "Consumer")} />

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, display: "flex", flexDirection: "column", gap: "14px", padding: "20px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "white", marginBottom: "3px" }}>
                            Welcome back, {loading ? "..." : firstName}! 👋
                        </h1>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{today}</p>
                    </div>
                    <div style={{
                        background: "rgba(96,165,250,0.1)",
                        border: "1px solid rgba(96,165,250,0.25)",
                        borderRadius: "10px", padding: "8px 16px",
                        fontSize: "12px", color: "#60a5fa", fontWeight: "600"
                    }}>🛒 {stats.totalOrders} total orders</div>
                </div>

                {/* Personalized Feed */}
                {consumerId && (
                    <PersonalizedFeed consumerId={consumerId} location={user?.location} />
                )}

                {/* Bento grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gridTemplateRows: "200px 200px",
                    gap: "12px",
                    flex: 1
                }}>

                    {/* Big shop card */}
                    <a href="/consumer/shop" style={{
                        textDecoration: "none", gridRow: "1/3",
                        borderRadius: "20px", overflow: "hidden",
                        position: "relative", display: "block"
                    }}>
                        <img
                            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop"
                            alt="shop"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.15) 60%)"
                        }} />
                        <div style={{ position: "absolute", bottom: "20px", left: "20px", right: "20px" }}>
                            <div style={{
                                fontSize: "10px", color: "#4ade80", fontWeight: "600",
                                marginBottom: "6px", letterSpacing: "0.08em"
                            }}>🥦 FRESH FROM TAMIL NADU FARMS</div>
                            <div style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "6px" }}>
                                Fresh Produce Shop
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "14px" }}>
                                Buy directly from Tamil Nadu farmers. No middlemen.
                            </div>
                            <div style={{
                                background: "#4ade80", color: "#0a0a0a",
                                borderRadius: "10px", padding: "10px 20px",
                                fontSize: "13px", fontWeight: "700",
                                display: "inline-block"
                            }}>Shop Now →</div>
                        </div>
                    </a>

                    {/* QR card */}
                    <a href="/consumer/qr" style={{
                        textDecoration: "none", borderRadius: "20px",
                        overflow: "hidden", position: "relative", display: "block"
                    }}>
                        <img
                            src="https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=250&fit=crop"
                            alt="qr"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)"
                        }} />
                        <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "white", marginBottom: "3px" }}>📱 QR Farm Story</div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Scan to see farm details</div>
                        </div>
                    </a>

                    {/* Stats card — real data */}
                    <div style={{
                        borderRadius: "20px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        padding: "16px",
                        backdropFilter: "blur(10px)",
                        display: "flex", flexDirection: "column", justifyContent: "space-between"
                    }}>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            This Month
                        </div>
                        <div>
                            <div style={{ fontSize: "32px", fontWeight: "800", color: "#fbbf24" }}>
                                {loading ? "..." : `₹${stats.totalSaved.toLocaleString()}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Money Saved</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {[
                                { num: loading ? "..." : stats.totalOrders.toString(), label: "Orders" },
                                { num: loading ? "..." : stats.totalFarmers.toString(), label: "Farmers" },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "8px", padding: "8px",
                                    textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "white" }}>{s.num}</div>
                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Nutrition card */}
                    <a href="/consumer/nutrition" style={{
                        textDecoration: "none", borderRadius: "20px",
                        overflow: "hidden", position: "relative", display: "block"
                    }}>
                        <img
                            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=250&fit=crop"
                            alt="nutrition"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)"
                        }} />
                        <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "white", marginBottom: "3px" }}>🥗 Nutrition Guide</div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>AI seasonal recommendations</div>
                        </div>
                    </a>

                    {/* Orders card — real data */}
                    <a href="/consumer/orders" style={{
                        textDecoration: "none", borderRadius: "20px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(167,139,250,0.2)",
                        padding: "16px", display: "flex",
                        flexDirection: "column", justifyContent: "space-between",
                        backdropFilter: "blur(10px)"
                    }}>
                        <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", letterSpacing: "0.06em" }}>
                            📦 MY ORDERS
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {loading ? (
                                <AppLoadingState fullScreen={false} label="Loading orders..." />
                            ) : orders.length === 0 ? (
                                <AppEmptyState icon="📦" title="No orders yet" description="Start shopping!" />
                            ) : orders.map((o, i) => {
                                const status = (o.status || "processing").toLowerCase();
                                const color = statusColor[status] || "#60a5fa";
                                return (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                                            {o.crop_name || o.product_name || "Order"} · {o.quantity || ""}
                                        </div>
                                        <div style={{
                                            fontSize: "10px", color,
                                            background: `${color}18`,
                                            padding: "2px 8px", borderRadius: "999px",
                                            border: `1px solid ${color}30`
                                        }}>{o.status || "Processing"}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600" }}>View all orders →</div>
                    </a>

                </div>
            </div>
        </main>
    );
}
