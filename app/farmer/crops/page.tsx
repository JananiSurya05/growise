"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import FarmerLayout from "../../components/FarmerLayout";
import AppEmptyState from "../../components/ui/AppEmptyState";
import AppInput from "../../components/ui/AppInput";

type DbCrop = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    location: string;
    image_url: string | null;
    status: string | null;
    badge: string | null;
    demand: string | null;
    season: string | null;
};

type Crop = {
    id: string;
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

    async function loadCrops() {
        if (!user) return;
        setLoadingCrops(true);
        const { data } = await supabase
            .from("crops")
            .select("id, name, price, quantity, location, image_url, status, badge, demand, season")
            .eq("farmer_id", user.id) as { data: DbCrop[] | null };

        if (data && data.length > 0) {
            setCrops(data.map((c) => ({
                id: c.id, name: c.name,
                price: c.price, marketPrice: Math.round(c.price * 0.65),
                quantity: c.quantity,
                location: c.location,
                img: c.image_url ?? "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                status: c.status ?? "Active",
                badge: c.badge ?? "🆕 New",
                demand: c.demand ?? "Medium",
                season: c.season ?? "Year round"
            })));
        }
        setLoadingCrops(false);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (user) loadCrops();
    }, [user]);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setUploadedImg(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function addCrop() {
        if (!user || !name || !price || !quantity || !location) return;
        const p = parseFloat(price);
        const q = parseFloat(quantity);
        if (!p || p <= 0 || p > 100000) { alert("Price must be between ₹1 and ₹1,00,000."); return; }
        if (!q || q <= 0 || q > 100000) { alert("Quantity must be between 1 and 1,00,000 kg."); return; }

        const insertResult = await supabase
            .from("crops")
            .insert([{
                name, price: p, quantity: q, location,
                image_url: uploadedImg ?? "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
                badge: "🆕 New", demand: "Medium",
                season: "Year round", status: "Active",
                farmer_id: user.id,
            }] as never[])
            .select("id, name, price, quantity, location, image_url, status, badge, demand, season")
            .single();

        const error = insertResult.error;
        const data = insertResult.data as DbCrop | null;

        if (error || !data) { alert("Error: " + (error?.message ?? "Insert failed")); return; }

        setCrops([...crops, {
            id: data.id, name: data.name,
            price: data.price, marketPrice: Math.round(data.price * 0.65),
            quantity: data.quantity,
            location: data.location,
            img: data.image_url ?? "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
            status: data.status ?? "Active",
            badge: data.badge ?? "🆕 New",
            demand: data.demand ?? "Medium",
            season: data.season ?? "Year round"
        }]);

        setName(""); setPrice(""); setQuantity(""); setLocation("");
        setUploadedImg(null); setShowForm(false);
    }

    async function deleteCrop(id: string) {
        if (!user) return;
        await supabase.from("crops").delete().eq("id", id).eq("farmer_id", user.id);
        setCrops(crops.filter(c => c.id !== id));
        if (selected?.id === id) setSelected(null);
    }

    if (authLoading) return <AppLoadingState />;

    return (
        <FarmerLayout activeHref="/farmer/crops" firstName={user?.user_metadata?.full_name?.split(" ")[0] || "Farmer"}>
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
                                <AppInput key={i} label={f.label} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
                            ))}
                        </div>
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", display: "block" }}>Crop Photo</label>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Upload crop photo" style={{ width: "100px", height: "80px", background: uploadedImg ? "transparent" : "rgba(255,255,255,0.04)", border: uploadedImg ? "none" : "2px dashed rgba(74,222,128,0.25)", borderRadius: "10px", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0, font: "inherit" }}>
                                    {uploadedImg ? <img src={uploadedImg} alt="crop" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center" }}><div style={{ fontSize: "22px" }}>📸</div><div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Upload</div></div>}
                                </button>
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
                    <AppLoadingState fullScreen={false} label="Loading your crops..." />
                ) : crops.length === 0 ? (
                    <div style={{ background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <AppEmptyState icon="🌱" title="No crops listed yet" description='Click "+ List New Crop" to add your first crop!' />
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: selected ? "1.3fr 0.7fr" : "1fr", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: selected ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "12px", alignContent: "start" }}>
                            {crops.map((crop) => (
                                <div key={crop.id} role="button" tabIndex={0} aria-label={`View details for ${crop.name}`} onClick={() => setSelected(selected?.id === crop.id ? null : crop)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(selected?.id === crop.id ? null : crop); } }} style={{ background: selected?.id === crop.id ? "rgba(74,222,128,0.06)" : "#012e2f", border: selected?.id === crop.id ? "2px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", cursor: "pointer" }}>
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
                                            <button type="button" onClick={e => { e.stopPropagation(); deleteCrop(crop.id); }} aria-label={`Delete ${crop.name}`} style={{ padding: "5px 10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", fontSize: "10px", color: "#f87171", cursor: "pointer", fontWeight: "600" }}>✕</button>
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
        </FarmerLayout>
    );
}
