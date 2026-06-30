"use client";
import { useState, useEffect, useCallback } from "react";

interface Crop {
  id: string;
  name: string;
  price: number;
  farmer_name?: string;
  location?: string;
  quantity?: number;
}

interface PersonalizedFeedProps {
  consumerId: string;
  location?: string;
}

interface FeedItem {
  crop: Crop;
  reason: string;
  score: number;
  badge?: string;
}

export default function PersonalizedFeed({ consumerId, location }: PersonalizedFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPersonalized = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consumer/personalized", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumerId, location }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.recommendations ?? []);
      }
    } catch { /* API unavailable */ }
    setLoading(false);
  }, [consumerId, location]);

  useEffect(() => {
    if (!consumerId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPersonalized();
  }, [consumerId, loadPersonalized]);

  if (!loading && items.length === 0) return null;

  return (
    <div style={{
      background: "rgba(0,0,0,0.25)",
      border: "1px solid rgba(167,139,250,0.2)",
      borderRadius: "20px",
      padding: "18px 20px",
      marginBottom: "14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>✨</div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "white" }}>Recommended For You</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Based on your order history & location</div>
          </div>
        </div>
        <div style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "6px", padding: "2px 8px", fontSize: "9px", color: "#a78bfa", fontWeight: "700" }}>
          {loading ? "PERSONALIZING..." : "AI MATCHED"}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: "10px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px", animation: "shimmer 1.5s infinite" }}>
              <div style={{ width: "60%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", marginBottom: "8px" }} />
              <div style={{ width: "80%", height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px" }} />
              <style>{`@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
          {items.map((item, i) => (
            <a
              key={i}
              href="/consumer/shop"
              style={{ textDecoration: "none", flexShrink: 0, width: "160px" }}
            >
              <div style={{
                background: "rgba(167,139,250,0.05)",
                border: "1px solid rgba(167,139,250,0.15)",
                borderRadius: "14px",
                padding: "14px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ fontSize: "26px" }}>
                    {item.crop.name === "Tomato" ? "🍅" : item.crop.name === "Onion" ? "🧅" : item.crop.name === "Potato" ? "🥔" : item.crop.name === "Carrot" ? "🥕" : item.crop.name === "Banana" ? "🍌" : "🌾"}
                  </div>
                  {item.badge && (
                    <div style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "5px", padding: "1px 6px", fontSize: "8px", color: "#a78bfa", fontWeight: "700" }}>
                      {item.badge}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "white", marginBottom: "3px" }}>{item.crop.name}</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#4ade80", marginBottom: "4px" }}>₹{item.crop.price}/kg</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{item.reason}</div>
                {item.crop.location && (
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>📍 {item.crop.location}</div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
