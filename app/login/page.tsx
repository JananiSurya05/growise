"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const quotes = [
    "\"The farmer is the only man in our economy who buys everything at retail, sells everything at wholesale.\" — John F. Kennedy",
    "\"To forget how to dig the earth and tend the soil is to forget ourselves.\" — Mahatma Gandhi",
    "\"Agriculture is the most healthful, most useful and most noble employment of man.\" — George Washington",
    "\"The discovery of agriculture was the first big step toward a civilized life.\" — Arthur Keith",
];

export default function Login() {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [selectedRole, setSelectedRole] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setQuoteIndex(i => (i + 1) % quotes.length);
                setFade(true);
            }, 600);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    async function handleLogin() {
        if (!name.trim() || !email.trim()) return;
        setLoading(selectedRole);

        // Check if user exists
        const { data: existing } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single() as { data: any };

        if (existing) {
            // User exists — save to localStorage and redirect
            localStorage.setItem("growise_user", JSON.stringify(existing));
            window.location.href = `/${existing.role}`;
            return;
        }

        // Create new user
        const { data: newUser, error } = await supabase
            .from("users")
            .insert([{ name, email, role: selectedRole, location: "Tamil Nadu" }] as any)
            .select()
            .single() as { data: any, error: any };

        if (error) {
            alert("Error: " + error.message);
            setLoading(null);
            return;
        }

        localStorage.setItem("growise_user", JSON.stringify(newUser));
        window.location.href = `/${selectedRole}`;
    }

    function pickRole(role: string) {
        setSelectedRole(role);
        setShowForm(true);
    }

    return (
        <main style={{
            minHeight: "100vh", background: "#014D4E",
            fontFamily: "'Segoe UI', sans-serif",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "space-between",
            padding: "32px 40px", position: "relative", overflow: "hidden",
        }}>

            {/* Grid */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

            {/* Logo */}
            <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "100%" }}>
                <a href="/" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "28px" }}>🌿</span>
                        <span style={{ fontSize: "44px", fontWeight: "800", color: "white", letterSpacing: "-2px", lineHeight: 1 }}>
                            Gro<span style={{ color: "#4ade80" }}>Wise</span>
                        </span>
                    </div>
                    <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>Sow Smart. Grow Wise.</div>
                </a>
            </div>

            {/* Cards or Form */}
            <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "960px" }}>

                {!showForm ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>

                        {[
                            { role: "farmer", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=300&fit=crop", label: "Farmer", desc: "List crops, get AI advice, sell directly to consumers.", color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(22,163,74,0.06)", badge: "🌾 FOR FARMERS" },
                            { role: "consumer", img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=300&fit=crop", label: "Consumer", desc: "Shop fresh produce, scan QR and track your orders.", color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(2,132,199,0.06)", badge: "🛒 FOR CONSUMERS" },
                            { role: "government", img: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=600&h=300&fit=crop", label: "Admin Portal", desc: "Monitor analytics, sustainability and farmer welfare.", color: "#a78bfa", border: "rgba(167,139,250,0.3)", bg: "rgba(124,58,237,0.06)", badge: "🏛️ ADMIN PORTAL" },
                        ].map((item, i) => (
                            <div key={i} onClick={() => pickRole(item.role)} style={{ borderRadius: "20px", overflow: "hidden", border: `1px solid ${item.border}`, cursor: "pointer" }}>
                                <div style={{ position: "relative", height: "180px" }}>
                                    <img src={item.img} alt={item.role} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)` }} />
                                    <div style={{ position: "absolute", bottom: "12px", left: "16px", fontSize: "11px", fontWeight: "600", color: item.color, background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: "999px", border: `1px solid ${item.border}` }}>
                                        {item.badge}
                                    </div>
                                </div>
                                <div style={{ background: item.bg, backdropFilter: "blur(10px)", padding: "20px" }}>
                                    <div style={{ fontSize: "20px", fontWeight: "800", color: "white", marginBottom: "8px" }}>{item.label}</div>
                                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.6", marginBottom: "16px" }}>{item.desc}</div>
                                    <div style={{ background: item.color, color: "#0a0a0a", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: "700", textAlign: "center" }}>
                                        Enter as {item.label} →
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ maxWidth: "420px", margin: "0 auto" }}>
                        <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px" }}>
                            <div style={{ fontSize: "16px", fontWeight: "700", color: "white", marginBottom: "4px", textAlign: "center" }}>
                                {selectedRole === "farmer" ? "🌾" : selectedRole === "consumer" ? "🛒" : "🏛️"} Enter as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "24px" }}>
                                Enter your details to continue
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", display: "block" }}>Your Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Ravi Kumar"
                                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", display: "block" }}>Email Address</label>
                                <input
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="e.g. ravi@gmail.com"
                                    type="email"
                                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }}
                                />
                            </div>

                            <button onClick={handleLogin} disabled={!!loading} style={{
                                width: "100%", background: loading ? "rgba(74,222,128,0.3)" : "#4ade80",
                                border: "none", borderRadius: "12px", padding: "13px",
                                fontSize: "14px", fontWeight: "700",
                                color: loading ? "#4ade80" : "#0a0a0a",
                                cursor: loading ? "not-allowed" : "pointer"
                            }}>
                                {loading ? "Signing in..." : "Continue →"}
                            </button>

                            <button onClick={() => setShowForm(false)} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px", fontSize: "13px", color: "rgba(255,255,255,0.4)", cursor: "pointer", marginTop: "10px" }}>
                                ← Back
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quote */}
            <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "700px", textAlign: "center" }}>
                <div style={{ opacity: fade ? 1 : 0, transition: "opacity 0.6s ease" }}>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontStyle: "italic", lineHeight: "1.7" }}>
                        {quotes[quoteIndex]}
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
                    {quotes.map((_, i) => (
                        <div key={i} style={{ width: i === quoteIndex ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i === quoteIndex ? "#4ade80" : "rgba(255,255,255,0.2)", transition: "all 0.3s ease" }} />
                    ))}
                </div>
            </div>

        </main>
    );
}