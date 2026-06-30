"use client";
import AppLoadingState from "../components/ui/AppLoadingState";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabase";
import { useFarmerOrderStream } from "../lib/useRealtime";
import { useToast } from "../lib/useToast";
import AiDecisionPanel from "../components/AiDecisionCard";
import FarmerLayout from "../components/FarmerLayout";
import AppCard from "../components/ui/AppCard";
import AppEmptyState from "../components/ui/AppEmptyState";
import type { Crop, OrderWithItems } from "../lib/types";

type DashboardCrop = Pick<Crop, "id" | "name" | "price" | "quantity" | "location" | "image_url">;
type DashboardOrder = Pick<OrderWithItems, "id" | "total" | "quantity" | "amount_saved" | "status" | "created_at"> & {
    order_items?: Array<{ crop_name: string }>;
};

type PricePrediction = {
    crop: string;
    predicted_price: number;
    confidence_score: number;
    weeks_ahead: number;
    model: string;
};

type CropRecommendation = {
    crop: string;
    composite_score: number;
    demand_score: number;
    profitability_score: number;
    risk_score: number;
    grow_days: number;
    reason: string;
};

export default function FarmerDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [crops, setCrops] = useState<DashboardCrop[]>([]);
    const [orders, setOrders] = useState<DashboardOrder[]>([]);
    const [stats, setStats] = useState({ totalCrops: 0, totalOrders: 0, totalRevenue: 0, totalKg: 0 });
    const [loading, setLoading] = useState(true);
    const [pricePredictions, setPricePredictions] = useState<PricePrediction[]>([]);
    const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
    const [mlLoading, setMlLoading] = useState(false);
    const [liveOrderCount, setLiveOrderCount] = useState(0);

    const loadMlPredictions = useCallback(async (cropsData: DashboardCrop[]) => {
        setMlLoading(true);
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const season = month >= 6 && month <= 10 ? "Kharif" : month >= 11 || month <= 3 ? "Rabi" : "Zaid";

            const predPromises = cropsData.slice(0, 4).map(crop =>
                fetch("/api/ml/price-prediction", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        crop_name: crop.name,
                        location: crop.location || "Chennai",
                        month,
                        season,
                        quantity_kg: crop.quantity || 500,
                        weeks_ahead: 1,
                    }),
                }).then(r => r.ok ? r.json() : null).catch(() => null)
            );

            const recPromise = fetch("/api/ml/crop-recommendation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location: cropsData[0]?.location || "Chennai", season, month, top_k: 5 }),
            }).then(r => r.ok ? r.json() : null).catch(() => null);

            const [predResults, recResult] = await Promise.all([Promise.all(predPromises), recPromise]);
            setPricePredictions(predResults.filter(Boolean) as PricePrediction[]);
            setRecommendations(recResult?.recommendations || []);
        } catch {
            // ML service not running — silently skip
        }
        setMlLoading(false);
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const [cropsRes, ordersRes] = await Promise.all([
            supabase.from("crops").select("id, name, price, quantity, location, image_url").eq("farmer_id", user.id),
            supabase.from("orders").select("id, total, quantity, amount_saved, status, created_at, order_items(crop_name)").eq("farmer_id", user.id).order("created_at", { ascending: false }).limit(5),
        ]);

        const cropsData = (cropsRes.data || []) as DashboardCrop[];
        const ordersData = (ordersRes.data || []) as DashboardOrder[];

        setCrops(cropsData);
        setOrders(ordersData);

        const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalKg = ordersData.reduce((sum, o) => sum + (o.quantity || 0), 0);

        setStats({
            totalCrops: cropsData.length,
            totalOrders: ordersData.length,
            totalRevenue,
            totalKg,
        });

        setLoading(false);

        // Load ML predictions after core data
        loadMlPredictions(cropsData);
    }, [user, loadMlPredictions]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (user) loadData();
    }, [user, loadData]);

    // Supabase Realtime — live order notifications
    const handleNewOrder = useCallback((order: Record<string, unknown>) => {
        const total = order.total as number;
        const qty = order.quantity as number;
        toast({
            type: "order",
            title: "New Order Received!",
            message: `₹${total} · ${qty}kg — check your sales dashboard`,
            duration: 8000,
        });
        setLiveOrderCount(n => n + 1);
        // Refresh order list so it appears immediately
        setOrders(prev => {
            const newOrder: DashboardOrder = {
                id: order.id as string,
                total: total,
                quantity: qty,
                amount_saved: order.amount_saved as number ?? 0,
                status: (order.status as "Processing" | "On the way" | "Delivered") ?? "Processing",
                created_at: order.created_at as string ?? new Date().toISOString(),
            };
            return [newOrder, ...prev.slice(0, 4)];
        });
        setStats(prev => ({
            ...prev,
            totalOrders: prev.totalOrders + 1,
            totalRevenue: prev.totalRevenue + (total ?? 0),
            totalKg: prev.totalKg + (qty ?? 0),
        }));
    }, [toast]);

    useFarmerOrderStream(user?.id, handleNewOrder);

    if (authLoading) return <AppLoadingState />;

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Farmer";

    return (
        <FarmerLayout activeHref="/farmer" firstName={firstName}>

            {/* Main */}

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>FARMER DASHBOARD · LIVE</span>
                            {liveOrderCount > 0 && (
                                <span style={{ background: "#a78bfa", color: "white", fontSize: "9px", fontWeight: "800", borderRadius: "10px", padding: "2px 7px" }}>
                                    +{liveOrderCount} new
                                </span>
                            )}
                        </div>
                        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
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

                {/* AI Decision Engine — proactive insights */}
                {crops.length > 0 && (
                    <AiDecisionPanel
                        location={crops[0]?.location ?? "Chennai"}
                        crops={crops.map(c => ({ name: c.name, price: c.price, quantity: c.quantity }))}
                    />
                )}

                {/* ML Intelligence Panel */}
                {(pricePredictions.length > 0 || recommendations.length > 0) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>

                        {/* Price Predictions */}
                        {pricePredictions.length > 0 && (
                            <AppCard role="farmer" style={{ background: "rgba(0,0,0,0.3)", padding: "18px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                    <span style={{ fontSize: "16px" }}>🤖</span>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>ML Price Forecast</div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>XGBoost + Random Forest Ensemble</div>
                                    </div>
                                    <div style={{ marginLeft: "auto", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "700" }}>AI-POWERED</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {pricePredictions.map((p, i) => {
                                        const confPct = Math.round(p.confidence_score * 100);
                                        return (
                                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 12px" }}>
                                                <div>
                                                    <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{p.crop}</div>
                                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Next week forecast</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#4ade80" }}>₹{p.predicted_price.toFixed(1)}/kg</div>
                                                    <div style={{ fontSize: "9px", color: confPct >= 80 ? "#4ade80" : "#fbbf24" }}>Confidence: {confPct}%</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AppCard>
                        )}

                        {/* Crop Recommendations */}
                        {recommendations.length > 0 && (
                            <AppCard accent="rgba(168,139,250,0.2)" style={{ background: "rgba(0,0,0,0.3)", padding: "18px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                    <span style={{ fontSize: "16px" }}>🎯</span>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>Crop Recommendations</div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>GradientBoosting Ranking Model</div>
                                    </div>
                                    <div style={{ marginLeft: "auto", background: "rgba(168,139,250,0.12)", border: "1px solid rgba(168,139,250,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "9px", color: "#a78bfa", fontWeight: "700" }}>ML MODEL</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {recommendations.slice(0, 4).map((rec, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "7px 12px" }}>
                                            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: i === 0 ? "#a78bfa" : "rgba(168,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: "white", flexShrink: 0 }}>{i + 1}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{rec.crop}</div>
                                                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.reason}</div>
                                            </div>
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#a78bfa" }}>{Math.round(rec.composite_score * 100)}%</div>
                                                <div style={{ fontSize: "9px", color: rec.risk_score < 0.3 ? "#4ade80" : rec.risk_score < 0.5 ? "#fbbf24" : "#f87171" }}>
                                                    Risk: {rec.risk_score < 0.3 ? "Low" : rec.risk_score < 0.5 ? "Med" : "High"}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AppCard>
                        )}
                    </div>
                )}

                {/* ML Loading State */}
                {mlLoading && (
                    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: "12px", padding: "12px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "14px" }}>🤖</span>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Loading ML predictions — XGBoost price forecast, GBR recommendations...</span>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>

                    {/* My Crops */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 My Active Crops</div>
                            <a href="/farmer/crops" style={{ fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}>View all →</a>
                        </div>
                        {loading ? (
                            <AppLoadingState fullScreen={false} />
                        ) : crops.length === 0 ? (
                            <AppEmptyState
                                icon="🌱"
                                title="No crops listed yet"
                                action={
                                    <a href="/farmer/crops" style={{ textDecoration: "none" }}>
                                        <div style={{ background: "#4ade80", borderRadius: "10px", padding: "8px 16px", fontSize: "12px", color: "#0a0a0a", fontWeight: "700", display: "inline-block" }}>+ Add First Crop</div>
                                    </a>
                                }
                            />
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
                                <AppLoadingState fullScreen={false} />
                            ) : orders.length === 0 ? (
                                <AppEmptyState icon="📦" title="No orders yet" description="List your crops to start selling!" />
                            ) : orders.map((order, i) => {
                                const itemNames = order.order_items?.map((it: { crop_name: string }) => it.crop_name).join(", ") || "Order";
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
        </FarmerLayout>
    );
}
