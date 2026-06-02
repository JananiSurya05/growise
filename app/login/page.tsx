"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const LOGO_TEXT = "GroWise";

const quotes = [
    "\"The farmer is the only man in our economy who buys everything at retail, sells everything at wholesale.\" — John F. Kennedy",
    "\"To forget how to dig the earth and tend the soil is to forget ourselves.\" — Mahatma Gandhi",
    "\"Agriculture is the most healthful, most useful and most noble employment of man.\" — George Washington",
    "\"The discovery of agriculture was the first big step toward a civilized life.\" — Arthur Keith",
];

export default function Login() {
    const [typedText, setTypedText] = useState("");
    const [typewriterDone, setTypewriterDone] = useState(false);
    const [cardsVisible, setCardsVisible] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const [step, setStep] = useState<"signin" | "role">("signin");
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Typewriter
    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setTypedText(LOGO_TEXT.slice(0, i));
            if (i >= LOGO_TEXT.length) {
                clearInterval(interval);
                setTypewriterDone(true);
                setTimeout(() => setCardsVisible(true), 300);
            }
        }, 120);
        return () => clearInterval(interval);
    }, []);

    // Quote rotation
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

    // Check if user just came back from Google OAuth
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                // Check if user already has a role
                supabase
                    .from("users")
                    .select("*")
                    .eq("email", session.user.email)
                    .single()
                    .then(({ data }: { data: any }) => {
                        if (data?.role) {
                            localStorage.setItem("growise_user", JSON.stringify(data));
                            window.location.href = `/${data.role}`;
                        } else {
                            setStep("role");
                        }
                    });
            }
        });
    }, []);

    async function handleGoogleSignIn() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/login`,
                queryParams: {
                    prompt: "select_account",
                },
            },
        });
        if (error) {
            alert("Error: " + error.message);
            setLoading(false);
        }
    }

    async function handleRolePick(role: string) {
        if (!user) return;
        setLoading(true);

        const { data: newUser, error } = await supabase
            .from("users")
            .upsert([{
                email: user.email,
                name: user.user_metadata?.full_name || user.email,
                role,
                location: "Tamil Nadu",
            }] as any)
            .select()
            .single() as { data: any; error: any };

        if (error) {
            alert("Error: " + error.message);
            setLoading(false);
            return;
        }

        localStorage.setItem("growise_user", JSON.stringify(newUser));
        window.location.href = `/${role}`;
    }

    const roles = [
        { role: "farmer", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=300&fit=crop", label: "Farmer", desc: "List crops, get AI advice, sell directly to consumers.", color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(22,163,74,0.06)", badge: "🌾 FOR FARMERS" },
        { role: "consumer", img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=300&fit=crop", label: "Consumer", desc: "Shop fresh produce, scan QR and track your orders.", color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(2,132,199,0.06)", badge: "🛒 FOR CONSUMERS" },
        { role: "government", img: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=600&h=300&fit=crop", label: "Admin Portal", desc: "Monitor analytics, sustainability and farmer welfare.", color: "#a78bfa", border: "rgba(167,139,250,0.3)", bg: "rgba(124,58,237,0.06)", badge: "🏛️ ADMIN PORTAL" },
    ];

    return (
        <>
            <style>{`
        @keyframes dropDown {
          0% { opacity: 0; transform: translateY(-60px); }
          60% { transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes subtitleFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 0.5; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .role-card {
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .role-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.12) !important;
          transform: translateY(-1px);
        }
      `}</style>

            <main style={{
                minHeight: "100vh",
                background: "#014D4E",
                fontFamily: "'Segoe UI', sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "32px 40px",
                position: "relative",
                overflow: "hidden",
            }}>

                {/* Background */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

                {/* Logo */}
                <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "100%" }}>
                    <a href="/" style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "28px" }}>🌿</span>
                            <span style={{ fontSize: "44px", fontWeight: "800", letterSpacing: "-2px", lineHeight: 1, color: "white" }}>
                                {typedText.slice(0, 3)}
                                <span style={{ color: "#4ade80" }}>{typedText.slice(3)}</span>
                                {!typewriterDone && (
                                    <span style={{ display: "inline-block", width: "3px", height: "40px", background: "#4ade80", marginLeft: "2px", verticalAlign: "middle", animation: "cursorBlink 0.7s infinite" }} />
                                )}
                            </span>
                        </div>
                        {typewriterDone && (
                            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", fontStyle: "italic", animation: "subtitleFade 0.6s ease forwards" }}>
                                Sow Smart. Grow Wise.
                            </div>
                        )}
                    </a>
                </div>

                {/* Main Content */}
                <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "960px" }}>

                    {/* STEP 1 — Google Sign In */}
                    {step === "signin" && (
                        <div style={{
                            maxWidth: "420px",
                            margin: "0 auto",
                            animation: cardsVisible ? "fadeUp 0.6s ease forwards" : "none",
                            opacity: cardsVisible ? 1 : 0,
                        }}>
                            <div style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "24px",
                                padding: "40px 32px",
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🌱</div>
                                <div style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "8px" }}>
                                    Welcome to GroWise
                                </div>
                                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", marginBottom: "32px", lineHeight: "1.6" }}>
                                    Sign in securely with your Google account to continue
                                </div>

                                <button
                                    className="google-btn"
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.08)",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        borderRadius: "14px",
                                        padding: "14px 20px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        color: "white",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "12px",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {/* Google Icon */}
                                    <svg width="20" height="20" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
                                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.7 39.7 16.3 44 24 44z" />
                                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
                                    </svg>
                                    {loading ? "Signing in..." : "Continue with Google"}
                                </button>

                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", marginTop: "20px" }}>
                                    🔒 Secured by Google OAuth 2.0
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Pick Role */}
                    {step === "role" && (
                        <div>
                            <div style={{ textAlign: "center", marginBottom: "28px", animation: "fadeUp 0.5s ease forwards" }}>
                                <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
                                    Welcome, <span style={{ color: "#4ade80", fontWeight: "700" }}>{user?.user_metadata?.full_name || user?.email}</span>!
                                </div>
                                <div style={{ fontSize: "22px", fontWeight: "800", color: "white" }}>
                                    How are you using GroWise today?
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                                {roles.map((item, i) => (
                                    <div
                                        key={i}
                                        className="role-card"
                                        onClick={() => !loading && handleRolePick(item.role)}
                                        style={{
                                            border: `1px solid ${item.border}`,
                                            animation: `dropDown 0.6s ease forwards`,
                                            animationDelay: `${i * 0.15}s`,
                                            animationFillMode: "both",
                                            opacity: 0,
                                        }}
                                    >
                                        <div style={{ position: "relative", height: "180px" }}>
                                            <img src={item.img} alt={item.role} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />
                                            <div style={{ position: "absolute", bottom: "12px", left: "16px", fontSize: "11px", fontWeight: "600", color: item.color, background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: "999px", border: `1px solid ${item.border}` }}>
                                                {item.badge}
                                            </div>
                                        </div>
                                        <div style={{ background: item.bg, backdropFilter: "blur(10px)", padding: "20px" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: "white", marginBottom: "8px" }}>{item.label}</div>
                                            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.6", marginBottom: "16px" }}>{item.desc}</div>
                                            <div style={{ background: item.color, color: "#0a0a0a", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: "700", textAlign: "center" }}>
                                                {loading ? "Loading..." : `Enter as ${item.label} →`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
        </>
    );
}