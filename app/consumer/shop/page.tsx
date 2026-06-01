"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

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
    reviews: number;
    freshness: string;
    delivery: string;
};

export default function ConsumerShop() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [added, setAdded] = useState<any>(null);
    const [selected, setSelected] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        setLoading(true);
        const { data } = await supabase
            .from("crops")
            .select("*, users(name, location)")
            .eq("status", "Active") as { data: any[] };

        if (data) {
            setProducts(data.map((c: any) => ({
                id: c.id,
                name: c.name,
                price: c.price,
                marketPrice: Math.round(c.price * 1.35),
                quantity: c.quantity,
                farmer: c.users?.name || "Local Farmer",
                farmer_id: c.farmer_id,
                location: c.location,
                img: c.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                badge: c.badge || "🌿 Eco",
                rating: 4.8,
                reviews: Math.floor(Math.random() * 200) + 20,
                freshness: "Harvested recently",
                delivery: "Tomorrow",
            })));
        }
        setLoading(false);
    }

    async function addToCart(product: Product) {
        const userStr = localStorage.getItem("growise_user");
        const user = userStr ? JSON.parse(userStr) : null;

        setCart([...cart, product.id]);
        setAdded(product.id);
        setTimeout(() => setAdded(null), 1500);

        if (user) {
            await supabase.from("orders").insert([{
                consumer_id: user.id,
                farmer_id: product.farmer_id,
                crop_id: product.id,
                quantity: 1,
                total: product.price,
                status: "Processing",
            }] as any);
        }
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.farmer.toLowerCase().includes(search.toLowerCase()) ||
            p.location.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "All" || p.badge.includes(filter);
        return matchSearch && matchFilter;
    });

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
                <a href="/login" style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "14px" }}>🚪</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Logout</span>
                    </div>
                </a>
            </div>

            {/* Main */}
            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · {products.length} PRODUCTS FROM REAL FARMERS</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>🥦 Fresh Produce Shop</h1>
                    </div>
                    <div style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: "10px", padding: "8px 16px", fontSize: "13px", color: "#60a5fa", fontWeight: "600" }}>
                        🛒 Cart ({cart.length})
                    </div>
                </div>

                {/* Banner */}
                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                    <img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&h=300&fit=crop" alt="fresh produce" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>REAL FARMERS · REAL FOOD · REAL PRICES</div>
                            <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>Fresh from Tamil Nadu farms — direct to you</div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[
                                { label: "Live Products", value: products.length, color: "#4ade80" },
                                { label: "No Middlemen", value: "0", color: "#60a5fa" },
                                { label: "Platform Fee", value: "₹0", color: "#fbbf24" },
                            ].map((s, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Search + filters */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by crop, farmer or location..." style={{ flex: 1, background: "#012e2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 16px", fontSize: "13px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                        {["All", "Eco", "Top", "New"].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: filter === f ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "7px 14px", fontSize: "12px", color: filter === f ? "#60a5fa" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Segoe UI', sans-serif", fontWeight: filter === f ? "600" : "400" }}>{f}</button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Loading fresh produce from farmers...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🥦</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>No products yet</div>
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Farmers haven't listed any crops yet. Check back soon!</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: selected ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "12px", alignContent: "start" }}>
                            {filtered.map((product) => (
                                <div key={product.id} onClick={() => setSelected(selected?.id === product.id ? null : product)} style={{ background: selected?.id === product.id ? "rgba(96,165,250,0.06)" : "#012e2f", border: selected?.id === product.id ? "2px solid rgba(96,165,250,0.35)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", cursor: "pointer" }}>
                                    <div style={{ position: "relative", height: "110px" }}>
                                        <img src={product.img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.85) 0%, transparent 55%)" }} />
                                        <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                                            <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "600" }}>{product.badge}</div>
                                        </div>
                                        <div style={{ position: "absolute", bottom: "6px", left: "10px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{product.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "10px 12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                            <div style={{ fontSize: "16px", fontWeight: "800", color: "#60a5fa" }}>₹{product.price}/kg</div>
                                            <div style={{ fontSize: "10px", color: "#f87171", textDecoration: "line-through" }}>₹{product.marketPrice}</div>
                                        </div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>👨‍🌾 {product.farmer} · 📍 {product.location}</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <div style={{ fontSize: "10px", color: "#fbbf24" }}>⭐ {product.rating}</div>
                                            <div style={{ fontSize: "10px", color: "#4ade80", fontWeight: "600" }}>Save ₹{product.marketPrice - product.price}/kg</div>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); addToCart(product); }} style={{ width: "100%", border: "none", borderRadius: "8px", padding: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer", background: added === product.id ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #0284c7, #0369a1)", color: "white" }}>
                                            {added === product.id ? "✅ Added!" : "Add to Cart →"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selected && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ borderRadius: "14px", overflow: "hidden", position: "relative", height: "160px" }}>
                                    <img src={selected.img} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.95) 0%, rgba(0,0,0,0.2) 60%)" }} />
                                    <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                            <div>
                                                <div style={{ fontSize: "20px", fontWeight: "800", color: "white", marginBottom: "2px" }}>{selected.name}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>📍 {selected.location}</div>
                                            </div>
                                            <div style={{ fontSize: "22px", fontWeight: "800", color: "#60a5fa" }}>₹{selected.price}/kg</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>💰 Price Breakdown</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                        <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: "#60a5fa" }}>₹{selected.price}</div>
                                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>GroWise price</div>
                                        </div>
                                        <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: "#f87171", textDecoration: "line-through" }}>₹{selected.marketPrice}</div>
                                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>Supermarket price</div>
                                        </div>
                                    </div>
                                    <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#4ade80" }}>You save ₹{selected.marketPrice - selected.price}/kg!</div>
                                    </div>
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>📋 Product Details</div>
                                    {[
                                        { label: "Farmer", value: selected.farmer, icon: "👨‍🌾" },
                                        { label: "Location", value: selected.location, icon: "📍" },
                                        { label: "Stock", value: `${selected.quantity}kg`, icon: "📦" },
                                        { label: "Rating", value: `⭐ ${selected.rating}`, icon: "⭐" },
                                    ].map((d, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{d.icon} {d.label}</span>
                                            <span style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => addToCart(selected)} style={{ border: "none", borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", background: added === selected.id ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #0284c7, #0369a1)", color: "white" }}>
                                    {added === selected.id ? "✅ Added to Cart!" : "🛒 Add to Cart →"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}