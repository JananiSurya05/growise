"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const farms = [
    {
        id: 1, name: "Tomato", price: 25, freshness: "2 days old",
        img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=400&fit=crop",
        farmerImg: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=200&h=200&fit=crop",
        farmer: "Ravi Kumar", age: 42, experience: "15 years",
        location: "Thiruvallur, Tamil Nadu", farmSize: "3.5 acres",
        harvestDate: "17 May 2026", method: "Organic · No pesticides",
        story: "Ravi has been farming tomatoes for 15 years using traditional organic methods passed down from his father. He grows his tomatoes without any chemical pesticides, making them safe for your family.",
        badge: "🌿 Eco Certified", rating: 4.8, totalSales: "2,400kg",
        certifications: ["Organic", "No Pesticide", "Eco Badge"],
        nutrients: ["Vitamin C", "Lycopene", "Potassium"],
    },
    {
        id: 2, name: "Rice", price: 40, freshness: "5 days old",
        img: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=600&h=400&fit=crop",
        farmerImg: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&h=200&fit=crop",
        farmer: "Suresh Babu", age: 55, experience: "30 years",
        location: "Thanjavur, Tamil Nadu", farmSize: "8 acres",
        harvestDate: "14 May 2026", method: "Traditional paddy farming",
        story: "Suresh farms in the fertile Cauvery delta region of Thanjavur, known as the rice bowl of Tamil Nadu. His family has farmed this land for three generations using traditional methods.",
        badge: "⭐ Top Seller", rating: 4.9, totalSales: "12,000kg",
        certifications: ["Traditional Farming", "Water Efficient", "Top Seller"],
        nutrients: ["Carbohydrates", "B Vitamins", "Iron"],
    },
    {
        id: 3, name: "Chilli", price: 80, freshness: "1 day old",
        img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&h=400&fit=crop",
        farmerImg: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=200&h=200&fit=crop",
        farmer: "Murugan", age: 38, experience: "12 years",
        location: "Ramanathapuram, Tamil Nadu", farmSize: "2 acres",
        harvestDate: "18 May 2026", method: "Drip irrigation · Low water",
        story: "Murugan switched to drip irrigation 5 years ago, reducing his water usage by 40%. His chillies are known for their rich colour and strong flavour across Tamil Nadu markets.",
        badge: "🌿 Eco Certified", rating: 4.7, totalSales: "1,800kg",
        certifications: ["Drip Irrigation", "Water Saver", "Eco Badge"],
        nutrients: ["Vitamin C", "Capsaicin", "Vitamin A"],
    },
    {
        id: 4, name: "Spinach", price: 30, freshness: "Fresh today",
        img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=400&fit=crop",
        farmerImg: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop",
        farmer: "Lakshmi Devi", age: 45, experience: "10 years",
        location: "Krishnagiri, Tamil Nadu", farmSize: "1.5 acres",
        harvestDate: "19 May 2026", method: "Natural compost · Zero chemicals",
        story: "Lakshmi is one of the few women farmers on GroWise. She grows spinach using only natural compost made from farm waste, making her produce completely chemical free and nutrient rich.",
        badge: "🆕 New Farmer", rating: 4.6, totalSales: "800kg",
        certifications: ["Zero Chemicals", "Natural Compost", "Women Farmer"],
        nutrients: ["Iron", "Vitamin K", "Folate"],
    },
];

export default function QRPage() {
    const [selected, setSelected] = useState<typeof farms[0] | null>(null);

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
                        { icon: "🥦", label: "Shop", href: "/consumer/shop" },
                        { icon: "📱", label: "Scan QR", href: "/consumer/qr", active: true },
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

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
                            <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", letterSpacing: ".06em" }}>FOOD TRANSPARENCY · FARM TO TABLE</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>📱 QR Farm Story</h1>
                    </div>
                    {selected && (
                        <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", fontSize: "12px", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                            ← Back to products
                        </button>
                    )}
                </div>

                {!selected ? (
                    <div>
                        {/* Info banner */}
                        <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                            <img src="https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=1200&h=300&fit=crop" alt="farmer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "4px" }}>KNOW YOUR FARMER</div>
                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>Click any product to see its full Farm Story</div>
                                </div>
                                <div style={{ display: "flex", gap: "28px" }}>
                                    {[
                                        { label: "Verified Farmers", value: "500+" },
                                        { label: "Transparent", value: "100%" },
                                        { label: "Farm Stories", value: farms.length },
                                    ].map((s, i) => (
                                        <div key={i} style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#60a5fa" }}>{s.value}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Product grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                            {farms.map((farm) => (
                                <div key={farm.id} onClick={() => setSelected(farm)} style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", cursor: "pointer", display: "flex" }}>
                                    <div style={{ width: "130px", flexShrink: 0, position: "relative" }}>
                                        <img src={farm.img} alt={farm.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />
                                    </div>
                                    <div style={{ flex: 1, padding: "14px 16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                            <div style={{ fontSize: "16px", fontWeight: "700", color: "white" }}>{farm.name}</div>
                                            <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>{farm.badge}</div>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>👨‍🌾 {farm.farmer} · {farm.experience}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>📍 {farm.location}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>🗓️ Harvested: {farm.harvestDate} · {farm.freshness}</div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#60a5fa" }}>₹{farm.price}/kg</div>
                                            <div style={{ fontSize: "11px", color: "#fbbf24" }}>⭐ {farm.rating}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{farm.totalSales} sold</div>
                                        </div>
                                        <div style={{ marginTop: "10px", fontSize: "11px", color: "#60a5fa", fontWeight: "600" }}>📱 Tap to scan QR Farm Story →</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                        {/* Left — Farm story */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                            {/* Hero */}
                            <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative", height: "180px" }}>
                                <img src={selected.img} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.95) 0%, rgba(0,0,0,0.2) 60%)" }} />
                                <div style={{ position: "absolute", bottom: "16px", left: "16px", right: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                        <div style={{ fontSize: "22px", fontWeight: "800", color: "white" }}>{selected.name}</div>
                                        <div style={{ fontSize: "10px", fontWeight: "600", padding: "3px 10px", borderRadius: "999px", background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}>{selected.badge}</div>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>₹{selected.price}/kg · {selected.freshness} · ⭐ {selected.rating}</div>
                                </div>
                            </div>

                            {/* Farmer profile */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>👨‍🌾 About the Farmer</div>
                                <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                                    <img src={selected.farmerImg} alt={selected.farmer} style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "2px solid rgba(74,222,128,0.3)" }} />
                                    <div>
                                        <div style={{ fontSize: "16px", fontWeight: "700", color: "white", marginBottom: "3px" }}>{selected.farmer}</div>
                                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "3px" }}>📍 {selected.location}</div>
                                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>🌾 {selected.experience} · {selected.farmSize}</div>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                                    {[
                                        { label: "Harvest Date", value: selected.harvestDate },
                                        { label: "Farming Method", value: selected.method },
                                        { label: "Total Sales", value: selected.totalSales },
                                        { label: "Rating", value: `⭐ ${selected.rating}` },
                                    ].map((d, i) => (
                                        <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px 10px" }}>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "2px" }}>{d.label}</div>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{d.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: "10px", padding: "12px" }}>
                                    <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "6px" }}>💬 Farmer's Story</div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: "1.7" }}>{selected.story}</div>
                                </div>
                            </div>

                            {/* Certifications + nutrients */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>✅ Certifications</div>
                                    {selected.certifications.map((c, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{c}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>🥗 Key Nutrients</div>
                                    {selected.nutrients.map((n, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
                                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{n}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right — QR code */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                            {/* QR card */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                                <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>📱 Product QR Code</div>
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>Scan to verify authenticity of this product</div>
                                <div style={{ display: "inline-block", background: "white", padding: "16px", borderRadius: "16px", marginBottom: "16px" }}>
                                    <QRCodeSVG value={`https://growise-rho.vercel.app/consumer/qr`} size={180} bgColor="white" fgColor="#014D4E" />
                                </div>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginBottom: "16px" }}>growise.app/farm-story/{selected.id}</div>
                                <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "10px", padding: "10px" }}>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6" }}>
                                        This QR code links directly to {selected.farmer}'s farm profile. Consumers can scan it to verify the product is genuinely from this farm.
                                    </div>
                                </div>
                            </div>

                            {/* Trust indicators */}
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🛡️ Trust & Transparency</div>
                                {[
                                    { icon: "✅", label: "Verified Farmer", desc: `${selected.farmer} is a verified GroWise seller` },
                                    { icon: "📍", label: "Location Confirmed", desc: `Farm located in ${selected.location}` },
                                    { icon: "🗓️", label: "Harvest Date", desc: `Harvested on ${selected.harvestDate}` },
                                    { icon: "🌿", label: "Growing Method", desc: selected.method },
                                    { icon: "⭐", label: "Customer Rating", desc: `${selected.rating}/5 from verified buyers` },
                                ].map((t, i) => (
                                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px", paddingBottom: "12px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <span style={{ fontSize: "16px", flexShrink: 0 }}>{t.icon}</span>
                                        <div>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white", marginBottom: "2px" }}>{t.label}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{t.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Buy button */}
                            <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                                <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "12px", padding: "14px", textAlign: "center", fontSize: "14px", fontWeight: "700", color: "white", boxShadow: "0 4px 20px rgba(2,132,199,0.3)", cursor: "pointer" }}>
                                    🛒 Buy {selected.name} from {selected.farmer} →
                                </div>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}