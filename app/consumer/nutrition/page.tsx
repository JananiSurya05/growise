"use client";
import AppLoadingState from "../../components/ui/AppLoadingState";
import { useState } from "react";
import { useAuth } from "../../lib/useAuth";
import ConsumerLayout from "../../components/ConsumerLayout";

const seasonal = [
    { name: "Tomato", season: "Year round", calories: 18, protein: "0.9g", vitamin: "Vitamin C, K", benefits: "Boosts immunity, good for heart", img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop", score: 92 },
    { name: "Spinach", season: "Oct–Feb", calories: 23, protein: "2.9g", vitamin: "Vitamin K, A, C", benefits: "Rich in iron, great for bones", img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop", score: 98 },
    { name: "Carrot", season: "Nov–Feb", calories: 41, protein: "0.9g", vitamin: "Vitamin A, K1", benefits: "Improves eyesight, skin health", img: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop", score: 88 },
    { name: "Brinjal", season: "Year round", calories: 25, protein: "1g", vitamin: "Vitamin B6, C", benefits: "Good for digestion, heart health", img: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=300&fit=crop", score: 78 },
    { name: "Onion", season: "Year round", calories: 40, protein: "1.1g", vitamin: "Vitamin C, B6", benefits: "Anti-inflammatory, boosts immunity", img: "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop", score: 85 },
    { name: "Chilli", season: "Oct–Feb", calories: 40, protein: "1.9g", vitamin: "Vitamin C, A", benefits: "Boosts metabolism, pain relief", img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&h=300&fit=crop", score: 80 },
];

const diets = [
    { name: "Weight Loss", icon: "🏃", crops: ["Spinach", "Tomato", "Carrot"], tip: "Low calorie, high fibre crops help you feel full longer." },
    { name: "Muscle Gain", icon: "💪", crops: ["Spinach", "Brinjal", "Chilli"], tip: "High protein crops support muscle recovery and growth." },
    { name: "Heart Health", icon: "❤️", crops: ["Tomato", "Onion", "Carrot"], tip: "Antioxidant rich crops protect your cardiovascular system." },
    { name: "Immunity Boost", icon: "🛡️", crops: ["Chilli", "Spinach", "Tomato"], tip: "Vitamin C and antioxidants strengthen your immune system." },
];

export default function NutritionGuide() {
    const { loading: authLoading } = useAuth();
    const [selectedDiet, setSelectedDiet] = useState<typeof diets[0] | null>(null);
    const [selectedCrop, setSelectedCrop] = useState<typeof seasonal[0] | null>(null);

    if (authLoading) return <AppLoadingState />;

    return (
        <ConsumerLayout activeHref="/consumer/nutrition">
                <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                        <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>AI NUTRITION GUIDE · SEASONAL PRODUCE</span>
                    </div>
                    <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>🥗 Nutrition & Diet Guide</h1>
                </div>

                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", height: "100px" }}>
                    <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=300&fit=crop" alt="nutrition" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.97) 0%, rgba(0,0,0,0.5) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "4px" }}>EAT FRESH · EAT LOCAL · EAT SMART</div>
                            <div style={{ fontSize: "18px", fontWeight: "800", color: "white" }}>Fresh farm produce = better nutrition</div>
                        </div>
                        <div style={{ display: "flex", gap: "28px" }}>
                            {[{ label: "Crops Tracked", value: seasonal.length, color: "#4ade80" }, { label: "Diet Plans", value: diets.length, color: "#60a5fa" }, { label: "Avg Nutrition Score", value: "87/100", color: "#fbbf24" }].map((s, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🎯 Your Diet Goal</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                        {diets.map((diet, i) => (
                            <button type="button" key={i} onClick={() => setSelectedDiet(selectedDiet?.name === diet.name ? null : diet)} style={{ background: selectedDiet?.name === diet.name ? "rgba(74,222,128,0.1)" : "#012e2f", border: selectedDiet?.name === diet.name ? "2px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px", cursor: "pointer", textAlign: "center", font: "inherit", width: "100%" }}>
                                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{diet.icon}</div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "white", marginBottom: "6px" }}>{diet.name}</div>
                                <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
                                    {diet.crops.map((c, j) => (
                                        <div key={j} style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "999px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>{c}</div>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                    {selectedDiet && (
                        <div style={{ marginTop: "10px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "12px", padding: "14px 18px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#4ade80", marginBottom: "4px" }}>{selectedDiet.icon} {selectedDiet.name} Plan</div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>{selectedDiet.tip}</div>
                        </div>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: selectedCrop ? "1fr 320px" : "1fr", gap: "20px" }}>
                    <div>
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 Seasonal Crop Nutrition</div>
                        <div style={{ display: "grid", gridTemplateColumns: selectedCrop ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "12px" }}>
                            {seasonal.map((crop, i) => (
                                <button type="button" key={i} onClick={() => setSelectedCrop(selectedCrop?.name === crop.name ? null : crop)} style={{ background: selectedCrop?.name === crop.name ? "rgba(96,165,250,0.06)" : "#012e2f", border: selectedCrop?.name === crop.name ? "2px solid rgba(96,165,250,0.3)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", cursor: "pointer", padding: 0, font: "inherit", textAlign: "left", width: "100%", display: "block" }}>
                                    <div style={{ position: "relative", height: "100px" }}>
                                        <img src={crop.img} alt={crop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.9) 0%, transparent 55%)" }} />
                                        <div style={{ position: "absolute", top: "8px", right: "8px" }}>
                                            <div style={{ background: crop.score >= 90 ? "rgba(74,222,128,0.8)" : crop.score >= 80 ? "rgba(251,191,36,0.8)" : "rgba(96,165,250,0.8)", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "white", fontWeight: "700" }}>{crop.score}/100</div>
                                        </div>
                                        <div style={{ position: "absolute", bottom: "6px", left: "10px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{crop.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "10px 12px" }}>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>Season: {crop.season}</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                                            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 8px" }}>
                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#fbbf24" }}>{crop.calories}</div>
                                                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>kcal/100g</div>
                                            </div>
                                            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 8px" }}>
                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#60a5fa" }}>{crop.protein}</div>
                                                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>protein</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: "1.4" }}>{crop.benefits}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    {selectedCrop && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ borderRadius: "14px", overflow: "hidden", position: "relative", height: "140px" }}>
                                <img src={selectedCrop.img} alt={selectedCrop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.95) 0%, rgba(0,0,0,0.2) 60%)" }} />
                                <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "white", marginBottom: "2px" }}>{selectedCrop.name}</div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Season: {selectedCrop.season}</div>
                                </div>
                                <div style={{ position: "absolute", top: "12px", right: "12px", background: selectedCrop.score >= 90 ? "rgba(74,222,128,0.8)" : "rgba(251,191,36,0.8)", borderRadius: "999px", padding: "4px 12px", fontSize: "11px", color: "white", fontWeight: "700" }}>Score: {selectedCrop.score}/100</div>
                            </div>
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>📊 Nutrition Facts</div>
                                {[{ label: "Calories", value: `${selectedCrop.calories} kcal/100g`, color: "#fbbf24" }, { label: "Protein", value: selectedCrop.protein, color: "#60a5fa" }, { label: "Key Vitamins", value: selectedCrop.vitamin, color: "#4ade80" }, { label: "Season", value: selectedCrop.season, color: "#a78bfa" }].map((d, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{d.label}</span>
                                        <span style={{ fontSize: "12px", fontWeight: "600", color: d.color }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "14px", padding: "14px" }}>
                                <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>💚 Health Benefits</div>
                                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7" }}>{selectedCrop.benefits}</div>
                            </div>
                            <a href="/consumer/shop" style={{ textDecoration: "none" }}>
                                <div style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", borderRadius: "12px", padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "700", color: "white", cursor: "pointer" }}>
                                    🛒 Buy Fresh {selectedCrop.name} →
                                </div>
                            </a>
                        </div>
                    )}
                </div>
        </ConsumerLayout>
    );
}
