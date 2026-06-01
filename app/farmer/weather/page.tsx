"use client";
import { useState } from "react";

export default function WeatherPage() {
    const [city, setCity] = useState("");
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function getWeather() {
        if (!city.trim()) return;
        setLoading(true);
        setError("");
        setWeather(null);
        const res = await fetch(`/api/weather?city=${city}`);
        const data = await res.json();
        if (data.error) setError("City not found. Try again.");
        else setWeather(data);
        setLoading(false);
    }

    function getCropAlert(temp: number, desc: string) {
        const d = desc.toLowerCase();
        if (d.includes("rain") || d.includes("storm"))
            return { alert: "⚠️ Rain expected — harvest crops early to avoid spoilage!", color: "#f87171", bg: "rgba(220,38,38,0.1)", border: "rgba(248,113,113,0.2)" };
        if (temp > 38)
            return { alert: "🔥 Extreme heat — water crops early morning and evening!", color: "#fbbf24", bg: "rgba(217,119,6,0.1)", border: "rgba(251,191,36,0.2)" };
        if (temp < 15)
            return { alert: "🥶 Cold warning — protect sensitive crops at night!", color: "#60a5fa", bg: "rgba(2,132,199,0.1)", border: "rgba(96,165,250,0.2)" };
        return { alert: "✅ Good farming weather — ideal for field work today!", color: "#4ade80", bg: "rgba(22,163,74,0.1)", border: "rgba(74,222,128,0.2)" };
    }

    function getIcon(desc: string) {
        const d = desc.toLowerCase();
        if (d.includes("rain")) return "🌧️";
        if (d.includes("storm")) return "⛈️";
        if (d.includes("cloud")) return "☁️";
        if (d.includes("clear")) return "☀️";
        if (d.includes("mist") || d.includes("fog")) return "🌫️";
        return "🌤️";
    }

    return (
        <main style={{
            minHeight: "100vh",
            background: "#014D4E",
            fontFamily: "'Segoe UI', sans-serif",
            display: "flex",
        }}>

            {/* Sidebar */}
            <div style={{
                width: "200px", flexShrink: 0,
                background: "rgba(0,0,0,0.25)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column",
                padding: "20px 12px", position: "fixed", height: "100vh",
                backdropFilter: "blur(20px)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", padding: "0 8px" }}>
                    <span style={{ fontSize: "18px" }}>🌿</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
                        Gro<span style={{ color: "#4ade80" }}>Wise</span>
                    </span>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", padding: "0 8px", marginBottom: "20px" }}>Farmer Portal</div>
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                        { icon: "⚡", label: "Dashboard", href: "/farmer" },
                        { icon: "🌱", label: "My Crops", href: "/farmer/crops" },
                        { icon: "🤖", label: "AI Advisor", href: "/farmer/advisor" },
                        { icon: "📸", label: "Disease Scan", href: "/farmer/disease" },
                        { icon: "🌤️", label: "Weather", href: "/farmer/weather", active: true },
                        { icon: "💰", label: "Income", href: "/farmer/income" },
                        { icon: "📊", label: "Sales", href: "/farmer/sales" },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "9px 10px", borderRadius: "8px",
                                background: item.active ? "rgba(96,165,250,0.12)" : "transparent",
                                border: item.active ? "1px solid rgba(96,165,250,0.22)" : "1px solid transparent",
                            }}>
                                <span style={{ fontSize: "14px" }}>{item.icon}</span>
                                <span style={{ fontSize: "12px", fontWeight: item.active ? "600" : "400", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.4)" }}>
                                    {item.label}
                                </span>
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

                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
                            <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "600", letterSpacing: ".06em" }}>LIVE WEATHER STATION</span>
                        </div>
                        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white", letterSpacing: "-.5px" }}>Farm Weather Command</h1>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginRight: "8px" }}>
                            {["Chennai", "Madurai", "Coimbatore", "Trichy"].map(c => (
                                <button key={c} onClick={() => setCity(c)} style={{
                                    background: city === c ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
                                    border: city === c ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: "999px", padding: "4px 12px",
                                    fontSize: "11px", color: city === c ? "#60a5fa" : "rgba(255,255,255,0.5)",
                                    cursor: "pointer", fontFamily: "'Segoe UI', sans-serif"
                                }}>{c}</button>
                            ))}
                        </div>
                        <input
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && getWeather()}
                            placeholder="Enter city..."
                            style={{
                                background: "#012e2f", border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px", padding: "9px 14px",
                                fontSize: "13px", color: "white", outline: "none",
                                fontFamily: "'Segoe UI', sans-serif", width: "160px"
                            }}
                        />
                        <button onClick={getWeather} style={{
                            background: "#4ade80", color: "#0a0a0a",
                            border: "none", borderRadius: "10px",
                            padding: "9px 18px", fontSize: "13px",
                            fontWeight: "700", cursor: "pointer"
                        }}>
                            {loading ? "..." : "Search"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "12px", padding: "14px 18px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
                        {error}
                    </div>
                )}

                {/* Default state */}
                {!weather && !error && (
                    <div>
                        <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", height: "160px", marginBottom: "20px" }}>
                            <img src="https://images.unsplash.com/photo-1504608524841-42584120d693?w=1400&h=400&fit=crop" alt="sky" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(1,77,78,0.95) 0%, rgba(0,0,0,0.4) 100%)" }} />
                            <div style={{ position: "absolute", inset: 0, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ fontSize: "13px", color: "#60a5fa", fontWeight: "600", marginBottom: "6px" }}>KHARIF SEASON 2026 · TAMIL NADU</div>
                                    <div style={{ fontSize: "22px", fontWeight: "800", color: "white", marginBottom: "4px" }}>Southwest Monsoon Active</div>
                                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Enter your city above to get live weather data</div>
                                </div>
                                <div style={{ display: "flex", gap: "28px" }}>
                                    {[
                                        { label: "Avg Temp", value: "32°C" },
                                        { label: "Humidity", value: "78%" },
                                        { label: "Rainfall", value: "High" },
                                        { label: "Season", value: "Kharif" },
                                    ].map((s, i) => (
                                        <div key={i} style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: "20px", fontWeight: "700", color: "#60a5fa" }}>{s.value}</div>
                                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                            {[
                                { month: "May–Jun", crop: "Rice, Groundnut", status: "Sowing", color: "#4ade80" },
                                { month: "Jul–Aug", crop: "Maize, Sorghum", status: "Growing", color: "#60a5fa" },
                                { month: "Sep–Oct", crop: "Tomato, Onion", status: "Harvest", color: "#fbbf24" },
                            ].map((c, i) => (
                                <div key={i} style={{ background: "#012e2f", border: `1px solid ${c.color}22`, borderTop: `3px solid ${c.color}`, borderRadius: "14px", padding: "16px" }}>
                                    <div style={{ fontSize: "11px", color: c.color, fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".05em" }}>{c.status}</div>
                                    <div style={{ fontSize: "14px", fontWeight: "700", color: "white", marginBottom: "4px" }}>{c.month}</div>
                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{c.crop}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" }}>
                                <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 Crop Weather Guide</div>
                                {[
                                    { crop: "Rice", temp: "22–32°C", rain: "High", icon: "🌾" },
                                    { crop: "Tomato", temp: "20–28°C", rain: "Medium", icon: "🍅" },
                                    { crop: "Chilli", temp: "25–30°C", rain: "Low", icon: "🌶️" },
                                    { crop: "Groundnut", temp: "25–35°C", rain: "Medium", icon: "🥜" },
                                ].map((c, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", paddingBottom: "10px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <span style={{ fontSize: "18px" }}>{c.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{c.crop}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>Ideal: {c.temp}</div>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Rain: {c.rain}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" }}>
                                <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>⚠️ Weather Alerts This Week</div>
                                {[
                                    { type: "Heavy Rain", district: "Coimbatore", severity: "High", color: "#f87171", icon: "🌧️" },
                                    { type: "Heat Wave", district: "Madurai", severity: "Medium", color: "#fbbf24", icon: "🔥" },
                                    { type: "Strong Winds", district: "Chennai", severity: "Low", color: "#60a5fa", icon: "💨" },
                                    { type: "Clear Skies", district: "Trichy", severity: "Good", color: "#4ade80", icon: "☀️" },
                                ].map((a, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", paddingBottom: "10px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <span style={{ fontSize: "18px" }}>{a.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{a.type}</div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{a.district}</div>
                                        </div>
                                        <div style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", color: a.color, background: `${a.color}15`, border: `1px solid ${a.color}30` }}>{a.severity}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Live weather */}
                {weather && (() => {
                    const temp = Math.round(weather.main.temp - 273.15);
                    const feels = Math.round(weather.main.feels_like - 273.15);
                    const tempMin = Math.round(weather.main.temp_min - 273.15);
                    const tempMax = Math.round(weather.main.temp_max - 273.15);
                    const desc = weather.weather[0].description;
                    const humidity = weather.main.humidity;
                    const wind = weather.wind.speed;
                    const pressure = weather.main.pressure;
                    const clouds = weather.clouds?.all || 0;
                    const cropAlert = getCropAlert(temp, desc);

                    return (
                        <div>
                            <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
                                <img src="https://images.unsplash.com/photo-1504608524841-42584120d693?w=1400&h=300&fit=crop" alt="sky" style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
                                <div style={{ position: "absolute", inset: 0, background: "rgba(1,46,47,0.85)" }} />
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                        <div style={{ fontSize: "64px" }}>{getIcon(desc)}</div>
                                        <div>
                                            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>📍 {weather.name}, India</div>
                                            <div style={{ fontSize: "52px", fontWeight: "800", color: "white", lineHeight: 1, marginBottom: "4px" }}>{temp}°C</div>
                                            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", textTransform: "capitalize" }}>{desc}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "28px" }}>
                                        {[
                                            { label: "Feels Like", value: `${feels}°C` },
                                            { label: "Min / Max", value: `${tempMin}° / ${tempMax}°` },
                                            { label: "Humidity", value: `${humidity}%` },
                                            { label: "Wind", value: `${wind} m/s` },
                                        ].map((s, i) => (
                                            <div key={i} style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "white" }}>{s.value}</div>
                                                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: cropAlert.bg, border: `1px solid ${cropAlert.border}`, borderRadius: "14px", padding: "14px 20px", marginBottom: "16px" }}>
                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>🌾 Crop Advisory</div>
                                <div style={{ fontSize: "15px", fontWeight: "600", color: cropAlert.color }}>{cropAlert.alert}</div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                                {[
                                    { label: "Pressure", value: `${pressure} hPa`, icon: "🌡️", color: "#a78bfa" },
                                    { label: "Visibility", value: "10 km", icon: "👁️", color: "#60a5fa" },
                                    { label: "Cloud Cover", value: `${clouds}%`, icon: "☁️", color: "#94a3b8" },
                                    { label: "UV Index", value: temp > 35 ? "High · 8" : "Moderate · 5", icon: "☀️", color: temp > 35 ? "#f87171" : "#fbbf24" },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px", textAlign: "center" }}>
                                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>{s.icon}</div>
                                        <div style={{ fontSize: "16px", fontWeight: "700", color: s.color, marginBottom: "3px" }}>{s.value}</div>
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div style={{ background: "#012e2f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "18px" }}>
                                    <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>✅ Good to grow now</div>
                                    {[
                                        { crop: "Rice", reason: `${temp}°C is ideal`, icon: "🌾" },
                                        { crop: "Groundnut", reason: "Good humidity levels", icon: "🥜" },
                                        { crop: "Maize", reason: "Wind helps pollination", icon: "🌽" },
                                    ].map((c, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                            <span style={{ fontSize: "18px" }}>{c.icon}</span>
                                            <div>
                                                <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{c.crop}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{c.reason}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ background: "#012e2f", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "16px", padding: "18px" }}>
                                    <div style={{ fontSize: "12px", color: "#f87171", fontWeight: "600", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".06em" }}>⚠️ Be careful today</div>
                                    {[
                                        { action: "Check soil moisture", reason: `${humidity}% humidity`, icon: "💧" },
                                        { action: "Inspect for pests", reason: "Warm weather increases risk", icon: "🐛" },
                                        { action: "Avoid spraying", reason: wind > 5 ? "Wind too strong" : "Check wind speed", icon: "💨" },
                                    ].map((a, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                            <span style={{ fontSize: "18px" }}>{a.icon}</span>
                                            <div>
                                                <div style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{a.action}</div>
                                                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{a.reason}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </main>
    );
}