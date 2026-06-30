"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/useAuth";
import FarmerSidebar from "../../components/FarmerSidebar";
import AppTextarea from "../../components/ui/AppTextarea";

const suggestions = [
    "My tomato leaves are turning yellow",
    "Best crop for Tamil Nadu in June?",
    "How often should I water rice?",
    "White insects on my chilli plant",
    "How to improve soil fertility naturally?",
    "My brinjal plant is wilting",
];

export default function CropAdvisor() {
    const { user, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([
        { role: "ai", text: "Hello! I'm your AI Crop Advisor. Ask me anything about your crops — diseases, soil, weather, fertiliser, or farming techniques. I'm here to help! 🌱" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (authLoading) return <AppLoadingState />;

    async function sendMessage(question?: string) {
        const q = question || input.trim();
        if (!q) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: q }]);
        setLoading(true);
        const res = await fetch("/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: q }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
        setLoading(false);
    }

    return (
        <main style={{ height: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex", overflow: "hidden" }}>

            <FarmerSidebar activeHref="/farmer/advisor" firstName={user?.user_metadata?.full_name?.split(" ")[0] || "Farmer"} />

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#013a3b" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, #014D4E, #016b6c)", border: "2px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🤖</div>
                            <div>
                                <h1 style={{ fontSize: "17px", fontWeight: "800", color: "white", marginBottom: "3px" }}>AI Crop Advisor</h1>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                                    <span style={{ fontSize: "11px", color: "#4ade80" }}>Online · Powered by Llama AI</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "24px" }}>
                            {[{ num: "500+", label: "Questions answered" }, { num: "98%", label: "Accuracy rate" }, { num: "24/7", label: "Available" }].map((s, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#4ade80" }}>{s.num}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: "10px 24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => sendMessage(s)} style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "999px", padding: "5px 12px", fontSize: "11px", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontFamily: "'Segoe UI', sans-serif", whiteSpace: "nowrap" }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(0,0,0,0.08)" }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: "10px", alignItems: "flex-start" }}>
                            {msg.role === "ai" && (
                                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#013a3b", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🤖</div>
                            )}
                            <div style={{ maxWidth: "68%", background: msg.role === "user" ? "#015f60" : "#012e2f", border: msg.role === "user" ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.1)", borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px", padding: "14px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
                                {msg.role === "ai" && <div style={{ fontSize: "10px", color: "#4ade80", fontWeight: "600", marginBottom: "6px", letterSpacing: ".05em" }}>🤖 AI CROP ADVISOR</div>}
                                <div style={{ fontSize: "13px", color: "white", lineHeight: "1.75", whiteSpace: "pre-wrap" }}>{msg.text}</div>
                            </div>
                            {msg.role === "user" && (
                                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#015f60", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>👨‍🌾</div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#013a3b", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🤖</div>
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px 18px 18px 18px", padding: "14px 18px" }}>
                                <div style={{ fontSize: "10px", color: "#4ade80", fontWeight: "600", marginBottom: "8px" }}>🤖 AI CROP ADVISOR</div>
                                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                    {[0, 1, 2].map(j => (
                                        <div key={j} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", animation: `bounce 1s infinite ${j * 0.2}s` }} />
                                    ))}
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "6px" }}>Analyzing your crop problem...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div style={{ flexShrink: 0, padding: "14px 28px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#013a3b" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", background: "#012e2f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "12px 16px" }}>
                        <span style={{ fontSize: "20px", marginBottom: "2px" }}>🌱</span>
                        <AppTextarea aria-label="Describe your crop problem" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Describe your crop problem... (Enter to send)" rows={2} style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", lineHeight: "1.6" }} />
                        <button onClick={() => sendMessage()} disabled={loading} style={{ background: loading ? "rgba(74,222,128,0.2)" : "#4ade80", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", color: loading ? "#4ade80" : "#0a0a0a", cursor: loading ? "not-allowed" : "pointer", flexShrink: 0 }}>
                            {loading ? "..." : "Send →"}
                        </button>
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "6px", textAlign: "center" }}>Powered by Llama AI · Press Enter to send</div>
                </div>
            </div>

            <style>{`
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.2); border-radius: 2px; }
            `}</style>
        </main>
    );
}
