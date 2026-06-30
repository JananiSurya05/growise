"use client";
import AppLoadingState from "../components/ui/AppLoadingState";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useGovernmentOrderStream } from "../lib/useRealtime";
import { useToast } from "../lib/useToast";
import GovernmentSidebar from "../components/GovernmentSidebar";
import AppEmptyState from "../components/ui/AppEmptyState";

type ActivityEntry = { status: string; total: number; date: string };
type CropStat = { location: string; count: number };
type AnomalyResult = { order_id: string; is_anomaly: boolean; anomaly_score: number; risk_level: string; alert_reasons: string[] };
type AnomalyScan = { total_orders: number; anomalies_detected: number; anomaly_rate: number; results: AnomalyResult[] };

type LiveOrderEntry = { id: string; total: number; status: string; timestamp: string };
type EcosystemCrop = { crop: string; currentPrice: number; predictedPrice: number | null; priceChange: number | null; diseaseRisk: { disease: string; severity: string; probability: number } | null; ecosystemRiskScore: number; riskLevel: string; recommendation: string };
type EcosystemData = { location: string; season: string; crops: EcosystemCrop[]; overallEcosystemRisk: number; generatedAt: string };

export default function GovernmentDashboard() {
    const { loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [time, setTime] = useState("");
    const [stats, setStats] = useState({ farmers: 0, crops: 0, orders: 0, consumers: 0, totalRevenue: 0, totalSaved: 0 });
    const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
    const [cropStats, setCropStats] = useState<CropStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [anomalyScan, setAnomalyScan] = useState<AnomalyScan | null>(null);
    const [anomalyLoading, setAnomalyLoading] = useState(false);
    const [liveOrders, setLiveOrders] = useState<LiveOrderEntry[]>([]);
    const [liveOrderCount, setLiveOrderCount] = useState(0);
    const [ecosystemData, setEcosystemData] = useState<EcosystemData | null>(null);
    const [ecosystemLoading, setEcosystemLoading] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    async function runAnomalyScan(ordersData: { total: number; amount_saved: number; status: string; created_at: string }[]) {
        setAnomalyLoading(true);
        try {
            const orders = ordersData.map((o, i) => ({
                order_id: `order_${i}`,
                price_per_kg: Math.round(o.total / 25),
                quantity_kg: 25,
                total: o.total,
                amount_saved: o.amount_saved,
            }));
            const res = await fetch("/api/ml/anomaly-detection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orders }),
            });
            if (res.ok) setAnomalyScan(await res.json());
        } catch {
            // ML service not running
        }
        setAnomalyLoading(false);
    }

    async function loadEcosystem(crops: { name: string; price: number; quantity: number }[], location: string) {
        setEcosystemLoading(true);
        try {
            const res = await fetch("/api/market-intelligence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location, crops }),
            });
            if (res.ok) setEcosystemData(await res.json());
        } catch { /* ML/weather not available */ }
        setEcosystemLoading(false);
    }

    async function loadData() {
        setLoading(true);

        const [farmersRes, cropsRes, ordersRes, consumersRes] = await Promise.all([
            supabase.from("users").select("id", { count: "exact" }).eq("role", "farmer"),
            supabase.from("crops").select("name, price, quantity, location, status"),
            supabase.from("orders").select("total, amount_saved, status, created_at").order("created_at", { ascending: false }),
            supabase.from("users").select("id", { count: "exact" }).eq("role", "consumer"),
        ]);

        type OrderRow = { total: number; amount_saved: number; status: string; created_at: string };
        type CropRow = { name: string; price: number; quantity: number; location: string; status: string };
        const ordersData = (ordersRes.data || []) as OrderRow[];
        const cropsData = (cropsRes.data || []) as CropRow[];

        const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalSaved = ordersData.reduce((sum, o) => sum + (o.amount_saved || 0), 0);

        setStats({
            farmers: farmersRes.count || 0,
            crops: cropsData.filter(c => c.status === "Active").length,
            orders: ordersData.length,
            consumers: consumersRes.count || 0,
            totalRevenue,
            totalSaved,
        });

        // Recent activity (no private data)
        setRecentActivity(ordersData.slice(0, 8).map((o) => ({
            status: o.status,
            total: o.total,
            date: new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        })));

        // Crop stats by location
        const locationMap: Record<string, number> = {};
        cropsData.forEach((c) => {
            if (c.location) locationMap[c.location] = (locationMap[c.location] || 0) + 1;
        });
        setCropStats(Object.entries(locationMap).map(([loc, count]) => ({ location: loc, count })).sort((a, b) => b.count - a.count));

        setLoading(false);

        // Run anomaly scan on recent orders
        runAnomalyScan(ordersData.slice(0, 50));

        // Load ecosystem intelligence (top 5 crops by volume)
        const topCrops = cropsData
            .filter(c => c.status === "Active")
            .slice(0, 5)
            .map(c => ({ name: c.name, price: c.price, quantity: c.quantity }));
        if (topCrops.length > 0) loadEcosystem(topCrops, "Chennai");
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, []);

    // Live order stream via Supabase Realtime
    const handleLiveOrder = useCallback((order: Record<string, unknown>) => {
        const total = order.total as number ?? 0;
        const entry: LiveOrderEntry = {
            id: order.id as string ?? `live-${Date.now()}`,
            total,
            status: order.status as string ?? "Processing",
            timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        setLiveOrders(prev => [entry, ...prev.slice(0, 9)]);
        setLiveOrderCount(n => n + 1);
        setStats(prev => ({ ...prev, orders: prev.orders + 1, totalRevenue: prev.totalRevenue + total }));
        // Quick anomaly check on live order
        const pricePerKg = total / 25;
        if (pricePerKg > 500 || total > 50000) {
            toast({ type: "warning", title: "Anomaly Alert", message: `Suspicious order — ₹${total} (₹${Math.round(pricePerKg)}/kg). Review required.`, duration: 10000 });
        }
    }, [toast]);

    useGovernmentOrderStream(handleLiveOrder, !authLoading);

    if (authLoading) return <AppLoadingState />;

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const ordersByStatus = {
        Processing: recentActivity.filter(o => o.status === "Processing").length,
        "On the way": recentActivity.filter(o => o.status === "On the way").length,
        Delivered: recentActivity.filter(o => o.status === "Delivered").length,
    };

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            <GovernmentSidebar activeHref="/government" />

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "20px 24px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · GROWISE ANALYTICS DASHBOARD</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>Agricultural Command Center</h1>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "white" }}>{time}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{today}</div>
                    </div>
                </div>

                {/* KPI Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                        { label: "Farmers", value: loading ? "..." : stats.farmers, color: "#4ade80", icon: "👨‍🌾" },
                        { label: "Active Crops", value: loading ? "..." : stats.crops, color: "#60a5fa", icon: "🌾" },
                        { label: "Total Orders", value: loading ? "..." : stats.orders, color: "#fbbf24", icon: "📦" },
                        { label: "Consumers", value: loading ? "..." : stats.consumers, color: "#a78bfa", icon: "🛒" },
                        { label: "Revenue Generated", value: loading ? "..." : `₹${stats.totalRevenue}`, color: "#f87171", icon: "💰" },
                        { label: "Consumer Savings", value: loading ? "..." : `₹${stats.totalSaved}`, color: "#4ade80", icon: "🎯" },
                    ].map((k, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${k.color}22`, borderTop: `3px solid ${k.color}`, borderRadius: "12px", padding: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "16px" }}>{k.icon}</span>
                                <span style={{ fontSize: "8px", color: k.color, fontWeight: "600" }}>LIVE</span>
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: "800", color: k.color, lineHeight: 1, marginBottom: "3px" }}>{k.value}</div>
                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)" }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Live Order Stream */}
                {liveOrders.length > 0 && (
                    <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "14px 18px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "pulse 1.5s infinite" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "700", letterSpacing: ".06em" }}>LIVE ORDER STREAM</span>
                            <span style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", padding: "1px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "700" }}>{liveOrderCount} since login</span>
                            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {liveOrders.map((o, i) => (
                                <div key={o.id} style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "8px", padding: "6px 10px", opacity: Math.max(0.4, 1 - i * 0.08) }}>
                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#4ade80" }}>₹{o.total}</div>
                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>{o.timestamp}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ML Anomaly Detection Panel */}
                {(anomalyScan || anomalyLoading) && (
                    <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${anomalyScan && anomalyScan.anomalies_detected > 0 ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.15)"}`, borderRadius: "16px", padding: "18px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "18px" }}>🛡️</span>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#f87171", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>AI Anomaly Detection Engine</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Isolation Forest + Z-Score • Real-time fraud & market manipulation detection</div>
                                </div>
                            </div>
                            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", padding: "3px 10px", fontSize: "9px", color: "#f87171", fontWeight: "700" }}>ML MODEL ACTIVE</div>
                        </div>
                        {anomalyLoading ? (
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Scanning transactions with Isolation Forest...</div>
                        ) : anomalyScan && (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" }}>
                                    {[
                                        { label: "Orders Scanned", value: anomalyScan.total_orders, color: "#60a5fa" },
                                        { label: "Anomalies Found", value: anomalyScan.anomalies_detected, color: anomalyScan.anomalies_detected > 0 ? "#f87171" : "#4ade80" },
                                        { label: "Anomaly Rate", value: `${(anomalyScan.anomaly_rate * 100).toFixed(1)}%`, color: anomalyScan.anomaly_rate > 0.1 ? "#f87171" : "#fbbf24" },
                                    ].map((s, i) => (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 14px", textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                {anomalyScan.results.filter(r => r.is_anomaly).slice(0, 3).map((r, i) => (
                                    <div key={i} style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "8px", padding: "10px 14px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.risk_level === "HIGH" ? "#f87171" : "#fbbf24", flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "11px", fontWeight: "600", color: "white" }}>{r.order_id} — Risk: <span style={{ color: r.risk_level === "HIGH" ? "#f87171" : "#fbbf24" }}>{r.risk_level}</span></div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>{r.alert_reasons.join(" • ")}</div>
                                        </div>
                                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#f87171" }}>Score: {(r.anomaly_score * 100).toFixed(0)}</div>
                                    </div>
                                ))}
                                {anomalyScan.anomalies_detected === 0 && (
                                    <div style={{ fontSize: "12px", color: "#4ade80", textAlign: "center", padding: "8px" }}>No anomalies detected. Market activity appears normal.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Ecosystem Intelligence Panel */}
                {(ecosystemData || ecosystemLoading) && (
                    <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "16px", padding: "18px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "18px" }}>🌐</span>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>Ecosystem Intelligence</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
                                        {ecosystemData ? `${ecosystemData.location} · ${ecosystemData.season} season · Weather × ML × Disease risk` : "Loading cross-module analysis..."}
                                    </div>
                                </div>
                            </div>
                            {ecosystemData && (
                                <div style={{ background: ecosystemData.overallEcosystemRisk > 0.6 ? "rgba(248,113,113,0.1)" : "rgba(96,165,250,0.1)", border: `1px solid ${ecosystemData.overallEcosystemRisk > 0.6 ? "rgba(248,113,113,0.3)" : "rgba(96,165,250,0.3)"}`, borderRadius: "8px", padding: "4px 12px", textAlign: "center" }}>
                                    <div style={{ fontSize: "14px", fontWeight: "800", color: ecosystemData.overallEcosystemRisk > 0.6 ? "#f87171" : ecosystemData.overallEcosystemRisk > 0.35 ? "#fbbf24" : "#4ade80" }}>
                                        {(ecosystemData.overallEcosystemRisk * 100).toFixed(0)}%
                                    </div>
                                    <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)" }}>ECOSYSTEM RISK</div>
                                </div>
                            )}
                        </div>
                        {ecosystemLoading ? (
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Correlating weather, ML prices, and disease risk across all crops...</div>
                        ) : ecosystemData && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                                {ecosystemData.crops.map((c, i) => (
                                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.riskLevel === "HIGH" ? "rgba(248,113,113,0.2)" : c.riskLevel === "MEDIUM" ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.15)"}`, borderLeft: `3px solid ${c.riskLevel === "HIGH" ? "#f87171" : c.riskLevel === "MEDIUM" ? "#fbbf24" : "#4ade80"}`, borderRadius: "10px", padding: "12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "white" }}>{c.crop}</div>
                                            <div style={{ fontSize: "9px", fontWeight: "700", color: c.riskLevel === "HIGH" ? "#f87171" : c.riskLevel === "MEDIUM" ? "#fbbf24" : "#4ade80", background: c.riskLevel === "HIGH" ? "rgba(248,113,113,0.12)" : c.riskLevel === "MEDIUM" ? "rgba(251,191,36,0.12)" : "rgba(74,222,128,0.12)", padding: "1px 6px", borderRadius: "4px" }}>
                                                {c.riskLevel}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
                                            <div>
                                                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>Current</div>
                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "white" }}>₹{c.currentPrice}</div>
                                            </div>
                                            {c.predictedPrice && (
                                                <div>
                                                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>ML Forecast</div>
                                                    <div style={{ fontSize: "12px", fontWeight: "700", color: c.priceChange !== null && c.priceChange > 0 ? "#4ade80" : "#f87171" }}>
                                                        ₹{c.predictedPrice.toFixed(1)} {c.priceChange !== null ? `(${c.priceChange > 0 ? "+" : ""}${c.priceChange}%)` : ""}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {c.diseaseRisk && (
                                            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "5px", padding: "4px 8px", marginBottom: "6px", fontSize: "9px", color: "#f87171" }}>
                                                ⚠️ {c.diseaseRisk.disease} · {(c.diseaseRisk.probability * 100).toFixed(0)}% risk
                                            </div>
                                        )}
                                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{c.recommendation}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Main grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", marginBottom: "16px" }}>

                    {/* Order Status Breakdown */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>📦 Order Status Overview</div>
                        {[
                            { label: "Processing", value: ordersByStatus["Processing"], color: "#60a5fa", icon: "⏳" },
                            { label: "On the way", value: ordersByStatus["On the way"], color: "#fbbf24", icon: "🚛" },
                            { label: "Delivered", value: ordersByStatus["Delivered"], color: "#4ade80", icon: "✅" },
                        ].map((s, i) => (
                            <div key={i} style={{ marginBottom: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{s.icon} {s.label}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: s.color }}>{s.value} orders</span>
                                </div>
                                <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                    <div style={{ width: `${stats.orders > 0 ? (s.value / stats.orders) * 100 : 0}%`, height: "100%", background: s.color, borderRadius: "3px" }} />
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>Recent Activity</div>
                            {recentActivity.slice(0, 4).map((a, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>🛒 New order · {a.date}</div>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#4ade80" }}>₹{a.total}</span>
                                        <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "999px", color: a.status === "Delivered" ? "#4ade80" : a.status === "On the way" ? "#fbbf24" : "#60a5fa", background: "rgba(255,255,255,0.06)" }}>{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Crops by Location */}
                    <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: ".06em" }}>📍 Crops by Location</div>
                        {loading ? (
                            <AppLoadingState fullScreen={false} />
                        ) : cropStats.length === 0 ? (
                            <AppEmptyState icon="🌱" title="No crops listed yet" />
                        ) : cropStats.map((loc, i) => (
                            <div key={i} style={{ marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>📍 {loc.location}</span>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80" }}>{loc.count} crops</span>
                                </div>
                                <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                    <div style={{ width: `${(loc.count / (cropStats[0]?.count || 1)) * 100}%`, height: "100%", background: "linear-gradient(90deg, #16a34a, #4ade80)", borderRadius: "3px" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Platform Impact + System Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 Platform Impact</div>
                        {[
                            { label: "Middlemen Eliminated", value: "100%", color: "#4ade80" },
                            { label: "Platform Fee", value: "₹0", color: "#4ade80" },
                            { label: "Direct Farmer Pay", value: "100%", color: "#60a5fa" },
                            { label: "Consumer Savings", value: `₹${stats.totalSaved}`, color: "#fbbf24" },
                            { label: "Food Transparency", value: "QR Verified", color: "#a78bfa" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: s.color }}>{s.value}</span>
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
                            { label: "QR System", status: "Active", color: "#4ade80" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "10px", fontWeight: "600", color: s.color }}>● {s.status}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#012e2f", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "16px", padding: "18px" }}>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>📊 Platform Summary</div>
                        {[
                            { label: "Total Users", value: stats.farmers + stats.consumers, color: "#60a5fa" },
                            { label: "Active Crops", value: stats.crops, color: "#4ade80" },
                            { label: "Completed Orders", value: ordersByStatus["Delivered"], color: "#4ade80" },
                            { label: "Pending Orders", value: ordersByStatus["Processing"], color: "#fbbf24" },
                            { label: "Total Revenue", value: `₹${stats.totalRevenue}`, color: "#f87171" },
                        ].map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: s.color }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
