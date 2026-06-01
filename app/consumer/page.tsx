export default function ConsumerDashboard() {
    return (
        <main style={{
            minHeight: "100vh",
            background: "#014D4E",
            fontFamily: "'Segoe UI', sans-serif",
            display: "flex",
            padding: "20px",
            gap: "16px",
        }}>

            {/* Sidebar */}
            <div style={{
                width: "200px", flexShrink: 0,
                background: "rgba(0,0,0,0.25)",
                borderRadius: "16px", padding: "20px",
                display: "flex", flexDirection: "column",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.06)"
            }}>
                {/* Logo */}
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "18px" }}>🌿</span>
                        <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
                            Gro<span style={{ color: "#4ade80" }}>Wise</span>
                        </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", paddingLeft: "26px" }}>Consumer Portal</div>
                </div>

                {/* Profile */}
                <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <img
                        src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80&h=80&fit=crop"
                        alt="consumer"
                        style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", marginBottom: "8px", border: "2px solid rgba(96,165,250,0.3)" }}
                    />
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>Priya Singh</div>
                    <div style={{ fontSize: "11px", color: "#60a5fa" }}>● Online · Chennai</div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/consumer", active: true },
                        { icon: "🥦", label: "Shop", href: "/consumer/shop" },
                        { icon: "📱", label: "Scan QR", href: "/consumer/qr" },
                        { icon: "🥗", label: "Nutrition", href: "/consumer/nutrition" },
                        { icon: "📦", label: "My Orders", href: "/consumer/orders" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "9px 10px", borderRadius: "9px",
                                background: item.active ? "rgba(96,165,250,0.15)" : "transparent",
                                border: item.active ? "1px solid rgba(96,165,250,0.25)" : "1px solid transparent",
                            }}>
                                <span style={{ fontSize: "15px" }}>{item.icon}</span>
                                <span style={{
                                    fontSize: "13px",
                                    fontWeight: item.active ? "600" : "400",
                                    color: item.active ? "#60a5fa" : "rgba(255,255,255,0.45)"
                                }}>{item.label}</span>
                            </div>
                        </a>
                    ))}
                </nav>

                <a href="/login" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "9px", marginTop: "8px" }}>
                        <span style={{ fontSize: "15px" }}>🚪</span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                    </div>
                </a>
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "white", marginBottom: "3px" }}>
                            Welcome back, Priya! 👋
                        </h1>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Monday, 19 May 2026 · Chennai</p>
                    </div>
                    <div style={{
                        background: "rgba(96,165,250,0.1)",
                        border: "1px solid rgba(96,165,250,0.25)",
                        borderRadius: "10px", padding: "8px 16px",
                        fontSize: "12px", color: "#60a5fa", fontWeight: "600"
                    }}>🛒 3 items in cart</div>
                </div>

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
                            }}>🥦 142 PRODUCTS AVAILABLE</div>
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

                    {/* Stats card */}
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
                            <div style={{ fontSize: "32px", fontWeight: "800", color: "#fbbf24" }}>₹1.8k</div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Money Saved</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {[
                                { num: "24", label: "Orders" },
                                { num: "18", label: "Farmers" },
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

                    {/* Orders card */}
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
                            {[
                                { name: "Tomato · 5kg", status: "Delivered", color: "#4ade80" },
                                { name: "Rice · 10kg", status: "On the way", color: "#fbbf24" },
                                { name: "Spinach · 2kg", status: "Processing", color: "#60a5fa" },
                            ].map((o, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{o.name}</div>
                                    <div style={{
                                        fontSize: "10px", color: o.color,
                                        background: `${o.color}18`,
                                        padding: "2px 8px", borderRadius: "999px",
                                        border: `1px solid ${o.color}30`
                                    }}>{o.status}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600" }}>View all orders →</div>
                    </a>

                </div>
            </div>
        </main>
    );
}