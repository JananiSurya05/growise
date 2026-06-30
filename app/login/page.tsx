"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { registerNativeAuthListener } from "../lib/capacitor-auth";

const quotes = [
    "\"The farmer is the only man in our economy who buys everything at retail, sells everything at wholesale.\" — John F. Kennedy",
    "\"To forget how to dig the earth and tend the soil is to forget ourselves.\" — Mahatma Gandhi",
    "\"Agriculture is the most healthful, most useful and most noble employment of man.\" — George Washington",
    "\"The discovery of agriculture was the first big step toward a civilized life.\" — Arthur Keith",
];

const LOGO_TEXT = "GroWise";

export default function Login() {
    const router = useRouter();
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState("");
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [typedText, setTypedText] = useState("");
    const [typewriterDone, setTypewriterDone] = useState(false);
    const [cardsVisible, setCardsVisible] = useState(false);

    // Register the native deep-link handler once on mount (no-op on web)
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        const cleanup = registerNativeAuthListener(
            (role) => router.replace(`/${role}`),
            (msg) => { alert("Sign-in failed: " + msg); setLoading(null); }
        );
        return cleanup;
    }, []);

    // Typewriter effect
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

    async function handleGoogleLogin() {
        if (!selectedRole) return;
        setLoading(selectedRole);

        if (Capacitor.isNativePlatform()) {
            // Native Android: redirect to the app's deep link scheme so Android
            // intercepts the callback and the appUrlOpen listener handles it.
            // Role is passed in the URL because server cookies are not available
            // in the Chrome Custom Tabs → WebView handoff.
            const redirectTo = `growise://auth/callback?role=${selectedRole}`;

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo, skipBrowserRedirect: true },
            });

            if (error || !data.url) {
                alert("Google sign-in failed: " + (error?.message ?? "No URL returned"));
                setLoading(null);
                return;
            }

            // Opens in Chrome Custom Tabs — avoids Google's WebView OAuth block.
            // The appUrlOpen listener (registered above) handles the callback.
            await Browser.open({ url: data.url });
        } else {
            // Web: use cookie-based role tracking and server-side /auth/callback
            document.cookie = `growise_pending_role=${selectedRole}; path=/; SameSite=Lax`;
            const redirectTo = `${window.location.origin}/auth/callback`;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo },
            });

            if (error) {
                alert("Google sign-in failed: " + error.message);
                setLoading(null);
            }
        }
    }

    function pickRole(role: string) {
        setSelectedRole(role);
        setShowRoleSelect(true);
    }

    const roleColors: Record<string, { color: string; border: string; bg: string }> = {
        farmer: { color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(22,163,74,0.06)" },
        consumer: { color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(2,132,199,0.06)" },
        government: { color: "#a78bfa", border: "rgba(167,139,250,0.3)", bg: "rgba(124,58,237,0.06)" },
    };

    const current = roleColors[selectedRole] || roleColors.farmer;

    return (
        <>
            <style>{`
        @keyframes dropDown {
          0%   { opacity: 0; transform: translateY(-60px); }
          60%  { transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes subtitleFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 0.5; transform: translateY(0); }
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
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: white;
          border: none;
          border-radius: 12px;
          padding: 13px;
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
        }
        .google-btn:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }
        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .role-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 767px) {
          .role-cards-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        .login-main {
          padding: 32px 40px;
        }
        @media (max-width: 767px) {
          .login-main {
            padding: 24px 16px;
          }
        }
      `}</style>

            <main className="login-main" style={{
                minHeight: "100vh", background: "#014D4E",
                fontFamily: "'Segoe UI', sans-serif",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "space-between",
                position: "relative", overflow: "hidden",
            }}>

                {/* Grid background */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

                {/* Logo */}
                <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "100%" }}>
                    <Link href="/" style={{ textDecoration: "none" }}>
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
                    </Link>
                </div>

                {/* Cards or Google Sign-in */}
                <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "960px" }}>

                    {!showRoleSelect ? (
                        <div className="role-cards-grid">
                            {[
                                { role: "farmer", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=300&fit=crop", label: "Farmer", desc: "List crops, get AI advice, sell directly to consumers.", color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(22,163,74,0.06)", badge: "🌾 FOR FARMERS" },
                                { role: "consumer", img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=300&fit=crop", label: "Consumer", desc: "Shop fresh produce, scan QR and track your orders.", color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(2,132,199,0.06)", badge: "🛒 FOR CONSUMERS" },
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="role-card"
                                    onClick={() => pickRole(item.role)}
                                    aria-label={`Continue as ${item.label}`}
                                    style={{
                                        display: "block",
                                        textAlign: "left",
                                        background: "none",
                                        font: "inherit",
                                        width: "100%",
                                        border: `1px solid ${item.border}`,
                                        opacity: cardsVisible ? 1 : 0,
                                        animation: cardsVisible ? `dropDown 0.6s ease ${i * 0.15}s both` : "none",
                                    }}
                                >
                                    <div style={{ position: "relative", height: "180px" }}>
                                        <img src={item.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />
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
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
                            <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${current.border}`, borderRadius: "20px", padding: "32px" }}>
                                <div style={{ fontSize: "16px", fontWeight: "700", color: "white", marginBottom: "4px", textAlign: "center" }}>
                                    {selectedRole === "farmer" ? "🌾" : selectedRole === "consumer" ? "🛒" : "🏛️"} Sign in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                                </div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "28px" }}>
                                    Use your Google account to continue
                                </div>

                                {/* Google Sign In Button */}
                                <button
                                    className="google-btn"
                                    onClick={handleGoogleLogin}
                                    disabled={!!loading}
                                >
                                    {/* Google SVG icon */}
                                    <svg width="18" height="18" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
                                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.8 40 16.4 44 24 44z" />
                                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.7 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z" />
                                    </svg>
                                    {loading ? "Redirecting to Google..." : "Continue with Google"}
                                </button>

                                <button
                                    onClick={() => setShowRoleSelect(false)}
                                    style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px", fontSize: "13px", color: "rgba(255,255,255,0.4)", cursor: "pointer", marginTop: "10px" }}
                                >
                                    ← Back
                                </button>

                                <div style={{ marginTop: "16px", fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
                                    By continuing, you agree to GroWise&apos;s terms of service
                                </div>
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
