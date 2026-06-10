"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type Crop = {
    id: any;
    name: string;
    price: number;
    marketPrice: number;
    quantity: number;
    location: string;
    img: string;
    status: string;
    badge: string;
    demand: string;
    season: string;
};

export default function MyCrops() {
    const { user, loading: authLoading } = useAuth();
    const [crops, setCrops] = useState<Crop[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("");
    const [uploadedImg, setUploadedImg] = useState<string | null>(null);
    const [selected, setSelected] = useState<Crop | null>(null);
    const [loadingCrops, setLoadingCrops] = useState(true);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) loadCrops();
    }, [user]);

    async function loadCrops() {
        setLoadingCrops(true);
        const { data } = await supabase
            .from("crops")
            .select("*")
            .eq("farmer_id", user.id) as { data: any[] };

        if (data && data.length > 0) {
            setCrops(data.map((c: any) => ({
                id: c.id, name: c.name,
                price: c.price, marketPrice: Math.round(c.price * 0.65),
                quantity: c.quantity,
                location: c.location,
                img: c.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                status: c.status || "Active",
                badge: c.badge || "🆕 New",
                demand: c.demand || "Medium",
                season: c.season || "Year round"
            })));
        }
        setLoadingCrops(false);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setUploadedImg(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function addCrop() {
        if (!name || !price || !quantity || !location) return;
        const p = parseFloat(price);
        const q = parseFloat(quantity);

        const { data, error } = await supabase
            .from("crops")
            .insert([{
                name, price: p, quantity: q, location,
                image_url: uploadedImg || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                badge: "🆕 New", demand: "Medium",
                season: "Year round", status: "Active",
                farmer_id: user.id,
            }] as any)
            .select()
            .single() as { data: any, error: any };

        if (error) { alert("Error: " + error.message); return; }

        setCrops([...crops, {
            id: data.id, name: data.name,
            price: data.price, marketPrice: Math.round(data.price * 0.65),
            quantity: data.quantity,
            location: data.location,
            img: data.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
            status: "Active",
            badge: data.badge,
            demand: data.demand,
            season: data.season
        }]);

        setName(""); setPrice(""); setQuantity(""); setLocation("");
        setUploadedImg(null); setShowForm(false);
    }

    async function deleteCrop(id: any) {
        await supabase.from("crops").delete().eq("id", id);
        setCrops(crops.filter(c => c.id !== id));
        if (selected?.id === id) setSelected(null);
    }

    if (authLoading) return (
        <div style={{ minHeight: "100vh", background: "#014D4E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading...</div>
        </div>
    );

    return (
        <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>
            <div style={{ width: "200px", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 12px", position: "fixed", height: "100vh", backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>Gro<span style={{ color: "#4ade80" }}>Wise</span></span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/farmer" },
                        { icon: "🌱", label: "My Crops", href: "/farmer/crops", active: true },
                        { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
                        { icon: "📸", label: "Disease Scan", href: "/farmer/disease" },
                        { icon: "🌤️", label: "Weather", href: "/farmer/weather" },
                        { icon: "💰", label: "Income", href: "/farmer/income" },
                        { icon: "📊", label: "Sales", href: "/farmer/sales" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 10px", borderRadius: "8px", background: item.active ? "rgba(74,222,128,0.12)" : "transparent", border: item.active ? "1px solid rgba(74,222,128,0.22)" : "1px solid transparent" }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#4ade80" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
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

            <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · {crops.length} CROPS IN DATABASE</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>My Crop Marketplace</h1>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? "rgba(74,222,128,0.1)" : "#4ade80", border: showForm ? "1px solid rgba(74,222,128,0.3)" : "none", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: "700", color: showForm ? "#4ade80" : "#0a0a0a", cursor: "pointer" }}>
                        {showForm ? "✕ Cancel" : "+ List New Crop"}
                    </button>
                </div>

                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=300&fit=crop" alt="revenue" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>YOUR LIVE GROWISE LISTINGS</div>
                            <div style={{ fontSize: "24px", fontWeight: "800", color: "white" }}>{crops.length} crops <span style={{ fontSize: "13px", color: "#4ade80" }}>listed on marketplace</span></div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[
                                { label: "Total Crops", value: crops.length, color: "#60a5fa" },
                                { label: "Active", value: crops.filter(c => c.status === "Active").length, color: "#4ade80" },
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

                {showForm && (
                    <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#4ade80", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌱 New Crop Listing</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                            {[
                                { label: "Crop Name", value: name, set: setName, placeholder: "e.g. Tomato" },
                                { label: "Location", value: location, set: setLocation, placeholder: "e.g. Chennai" },
                                { label: "Price/kg (₹)", value: price, set: setPrice, placeholder: "e.g. 25" },
                                { label: "Quantity (kg)", value: quantity, set: setQuantity, placeholder: "e.g. 100" },
                            ].map((f, i) => (
                                <div key={i}>
                                    <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", display: "block" }}>{f.label}</label>
                                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "white", outline: "none", fontFamily: "'Segoe UI', sans-serif" }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", display: "block" }}>Crop Photo</label>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div onClick={() => fileRef.current?.click()} style={{ width: "100px", height: "80px", background: uploadedImg ? "transparent" : "rgba(255,255,255,0.04)", border: uploadedImg ? "none" : "2px dashed rgba(74,222,128,0.25)", borderRadius: "10px", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {uploadedImg ? <img src={uploadedImg} alt="crop" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center" }}><div style={{ fontSize: "22px" }}>📸</div><div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Upload</div></div>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>Upload a clear photo of your crop.<br />Good photos get <span style={{ color: "#4ade80", fontWeight: "600" }}>3x more orders!</span></div>
                            </div>
                        </div>
                        <button onClick={addCrop} style={{ background: "#4ade80", border: "none", borderRadius: "10px", padding: "10px 22px", fontSize: "13px", fontWeight: "700", color: "#0a0a0a", cursor: "pointer" }}>
                            Publish to Marketplace →
                        </button>
                    </div>
                )}

                {loadingCrops ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Loading your crops...</div>
                ) : crops.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌱</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>No crops listed yet</div>
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Click "+ List New Crop" to add your first crop!</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: selected ? "1.3fr 0.7fr" : "1fr", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: selected ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "12px", alignContent: "start" }}>
                            {crops.map((crop) => (
                                <div key={crop.id} onClick={() => setSelected(selected?.id === crop.id ? null : crop)} style={{ background: selected?.id === crop.id ? "rgba(74,222,128,0.06)" : "#012e2f", border: selected?.id === crop.id ? "2px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", cursor: "pointer" }}>
                                    <div style={{ position: "relative", height: "110px" }}>
                                        <img src={crop.img} alt={crop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.85) 0%, transparent 55%)" }} />
                                        <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                                            <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "600" }}>{crop.badge}</div>
                                        </div>
                                        <div style={{ position: "absolute", bottom: "6px", left: "10px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{crop.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "10px 12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <div style={{ fontSize: "16px", fontWeight: "800", color: "#4ade80" }}>₹{crop.price}/kg</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>📍 {crop.location}</div>
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <div style={{ flex: 1, textAlign: "center", padding: "5px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "10px", color: "#4ade80", fontWeight: "600" }}>✅ {crop.status}</div>
                                            <div style={{ padding: "5px 8px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "6px", fontSize: "10px", color: "#60a5fa" }}>{crop.quantity}kg</div>
                                            <button onClick={e => { e.stopPropagation(); deleteCrop(crop.id); }} style={{ padding: "5px 10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", fontSize: "10px", color: "#f87171", cursor: "pointer", fontWeight: "600" }}>✕</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selected && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ borderRadius: "14px", overflow: "hidden", position: "relative", height: "140px" }}>
                                    <img src={selected.img} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.95) 0%, rgba(0,0,0,0.2) 60%)" }} />
                                    <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
                                        <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "2px" }}>{selected.name}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>📍 {selected.location} · {selected.season}</div>
                                    </div>
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>💰 Price Intelligence</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                                        <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: "#4ade80" }}>₹{selected.price}</div>
                                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>Your price</div>
                                        </div>
                                        <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "800", color: "#f87171" }}>₹{selected.marketPrice}</div>
                                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>Middleman rate</div>
                                        </div>
                                    </div>
                                    <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                                        <div style={{ fontSize: "16px", fontWeight: "800", color: "#fbbf24" }}>+₹{selected.price - selected.marketPrice}/kg extra income!</div>
                                    </div>
                                </div>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "14px", padding: "14px" }}>
                                    <div style={{ fontSize: "11px", color: "#a78bfa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>💡 Selling Tips</div>
                                    {[
                                        { tip: `Demand is ${selected.demand} — good time to sell!`, icon: "📈" },
                                        { tip: `+₹${selected.price - selected.marketPrice}/kg vs middleman`, icon: "💰" },
                                        { tip: "Add photos for 3x more views", icon: "📸" },
                                        { tip: "Reply to orders fast for better ratings", icon: "⚡" },
                                    ].map((t, i) => (
                                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "14px", flexShrink: 0 }}>{t.icon}</span>
                                            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: "1.5" }}>{t.tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
