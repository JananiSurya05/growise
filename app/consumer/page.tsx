"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";

type Product = {
    id: any;
    name: string;
    price: number;
    marketPrice: number;
    quantity: number;
    farmer: string;
    farmer_id: string;
    location: string;
    img: string;
    badge: string;
    rating: number;
};

type CartItem = Product & { qty: number };

export default function ConsumerShop() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<any>(null);
    const [showCart, setShowCart] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [ordered, setOrdered] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.href = "/login"; return; }
            setAuthUser(user);
            loadProducts();
        }
        init();
    }, []);

    async function loadProducts() {
        setLoading(true);
        const { data } = await supabase
            .from("crops")
            .select("*")
            .eq("status", "Active") as { data: any[] };

        if (data) {
            setProducts(data.map((c: any) => ({
                id: c.id,
                name: c.name,
                price: c.price,
                marketPrice: Math.round(c.price * 1.35),
                quantity: c.quantity,
                farmer: "Local Farmer",
                farmer_id: c.farmer_id,
                location: c.location || "Tamil Nadu",
                img: c.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                badge: c.badge || "🌿 Eco",
                rating: 4.8,
            })));
        }
        setLoading(false);
    }

    function addToCart(product: Product) {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...product, qty: 1 }];
        });
        setShowCart(true);
    }

    function removeFromCart(id: any) {
        setCart(prev => prev.filter(i => i.id !== id));
    }

    function updateQty(id: any, qty: number) {
        if (qty < 1) { removeFromCart(id); return; }
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    }

    async function placeOrder() {
        if (!authUser || cart.length === 0) return;
        setPlacing(true);

        for (const item of cart) {
            await supabase.from("orders").insert([{
                consumer_id: authUser.id,
                farmer_id: item.farmer_id,
                crop_id: item.id,
                quantity: item.qty,
                total: item.price * item.qty,
                amount_saved: (item.marketPrice - item.price) * item.qty,
                status: "Processing",
            }] as any);
        }

        setCart([]);
        setPlacing(false);
        setOrdered(true);
        setTimeout(() => {
            setOrdered(false);
            setShowCart(false);
            window.location.href = "/consumer/orders";
        }, 2000);
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.location.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "All" || p.badge.includes(filter);
        return matchSearch && matchFilter;
    });

    const totalAmount = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalSaved = cart.reduce((sum, i) => sum + (i.marketPrice - i.price) * i.qty, 0);

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>

            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh", backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Consumer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/consumer" },
                        { icon: "🥦", label: "Shop", href: "/consumer/shop", active: true },
                        { icon: "📱", label: "Scan QR", href: "/consumer/qr" },
                        { icon: "🥗", label: "Nutrition", href: "/consumer/nutrition" },
                        { icon: "📦", label: "My Orders", href: "/consumer/orders" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(96,165,250,0.12)" : "transparent", border: item.active ? "1px solid rgba(96,165,250,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
                            </div>
                        </a>
                    ))}
                </nav>
                <div onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "14px" }}>🚪</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                    </div>
                </div>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · {products.length} PRODUCTS</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>🥦 Fresh Produce Shop</h1>
                    </div>
                    <div onClick={() => setShowCart(!showCart)} style={{ background: cart.length > 0 ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.1)", border: cart.length > 0 ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(96,165,250,0.25)", borderRadius: "10px", padding: "8px 16px", fontSize: "13px", color: cart.length > 0 ? "#4ade80" : "#60a5fa", fontWeight: "600", cursor: "pointer" }}>
                        🛒 Cart ({cart.length}) {cart.length > 0 ? "→" : ""}
                    </div>
                </div>

                {/* Cart Panel */}
                {showCart && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "13px", color: "#4ade80", fontWeight: "700", marginBottom: "14px" }}>🛒 Your Cart</div>

                        {cart.length === 0 ? (
                            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "16px" }}>Cart is empty — add some veggies! 🥦</div>
                        ) : (
                            <>
                                {cart.map((item, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <img src={item.img} alt={item.name} style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{item.name}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>₹{item.price}/kg</div>
                                        </div>
                                        {/* Qty controls */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "14px" }}>-</button>
                                            <span style={{ fontSize: "13px", color: "white", minWidth: "20px", textAlign: "center" }}>{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "14px" }}>+</button>
                                        </div>
                                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#60a5fa", minWidth: "50px", textAlign: "right" }}>₹{item.price * item.qty}</div>
                                        {/* Discard button */}
                                        <button onClick={() => removeFromCart(item.id)} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "4px 10px", color: "#f87171", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
                                            ✕ Remove
                                        </button>
                                    </div>
                                ))}

                                {/* Total */}
                                <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Total: <span style={{ color: "white", fontWeight: "700" }}>₹{totalAmount}</span></div>
                                        <div style={{ fontSize: "11px", color: "#4ade80" }}>You save ₹{totalSaved} vs supermarket!</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button onClick={() => setCart([])} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "10px 16px", color: "#f87171", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                                            🗑️ Clear All
                                        </button>
                                        <button onClick={placeOrder} disabled={placing || ordered} style={{ background: ordered ? "#16a34a" : "#4ade80", border: "none", borderRadius: "10px", padding: "10px 20px", color: "#0a0a0a", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                                            {ordered ? "✅ Order Placed!" : placing ? "Placing..." : "Place Order →"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Search + filters */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by crop or location..." style={{ flex: 1, background: "#012e2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                        {["All", "Eco", "Top", "New"].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: filter === f ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "7px 14px", fontSize: "12px", color: filter === f ? "#60a5fa" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Segoe UI', sans-serif" }}>{f}</button>
                        ))}
                    </div>
                </div>

                {/* Products grid */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.4)" }}>Loading fresh produce...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🥦</div>
                        <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>No products yet</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                        {filtered.map((product) => {
                            const inCart = cart.find(i => i.id === product.id);
                            return (
                                <div key={product.id} style={{ background: "#012e2f", border: inCart ? "2px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                                    <div style={{ position: "relative", height: "110px" }}>
                                        <img src={product.img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.85) 0%, transparent 55%)" }} />
                                        <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                                            <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "600" }}>{product.badge}</div>
                                        </div>
                                        {inCart && (
                                            <div style={{ position: "absolute", top: "8px", right: "8px", background: "#4ade80", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#0a0a0a", fontWeight: "700" }}>✓ {inCart.qty} in cart</div>
                                        )}
                                        <div style={{ position: "absolute", bottom: "6px", left: "10px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{product.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "10px 12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                            <div style={{ fontSize: "16px", fontWeight: "800", color: "#60a5fa" }}>₹{product.price}/kg</div>
                                            <div style={{ fontSize: "10px", color: "#f87171", textDecoration: "line-through" }}>₹{product.marketPrice}</div>
                                        </div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>📍 {product.location}</div>
                                        <button onClick={() => addToCart(product)} style={{ width: "100%", border: "none", borderRadius: "8px", padding: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer", background: inCart ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #0284c7, #0369a1)", color: "white" }}>
                                            {inCart ? `✅ Add More (${inCart.qty})` : "Add to Cart →"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
