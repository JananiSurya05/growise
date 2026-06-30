"use client";
import { useState, useEffect } from "react";
import type { Insight, DailyBriefResponse } from "../api/insights/route";

interface AiDecisionPanelProps {
  location: string;
  crops: Array<{ name: string; price: number; quantity: number }>;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#60a5fa",
};

const TYPE_BG: Record<string, string> = {
  price_opportunity: "rgba(74,222,128,0.06)",
  price_risk:        "rgba(248,113,113,0.06)",
  weather_alert:     "rgba(251,191,36,0.06)",
  demand_signal:     "rgba(167,139,250,0.06)",
  action_required:   "rgba(248,113,113,0.06)",
  revenue_trend:     "rgba(96,165,250,0.06)",
};

const TYPE_BORDER: Record<string, string> = {
  price_opportunity: "rgba(74,222,128,0.18)",
  price_risk:        "rgba(248,113,113,0.18)",
  weather_alert:     "rgba(251,191,36,0.18)",
  demand_signal:     "rgba(167,139,250,0.18)",
  action_required:   "rgba(248,113,113,0.18)",
  revenue_trend:     "rgba(96,165,250,0.18)",
};

export default function AiDecisionPanel({ location, crops }: AiDecisionPanelProps) {
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (crops.length === 0) return;
    loadInsights();
  }, [crops.length, location]);

  async function loadInsights() {
    setLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, crops }),
      });
      if (res.ok) setBrief(await res.json());
    } catch { /* ML/API not available */ }
    setLoading(false);
  }

  const visibleInsights = brief?.insights.filter(i => !dismissed.has(i.id)) ?? [];

  if (!loading && visibleInsights.length === 0 && !brief) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🧠</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>
              {loading ? "Analyzing your farm data..." : brief?.greeting ?? "AI Farm Intelligence"}
            </div>
            {brief && !loading && (
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>{brief.summary}</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {!loading && (
            <button
              onClick={loadInsights}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", cursor: "pointer" }}
            >
              Refresh
            </button>
          )}
          <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "6px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "700" }}>
            {loading ? "ANALYZING..." : "AI DECISION ENGINE"}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px", animation: "shimmer 1.5s infinite" }}>
              <div style={{ width: "40%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", marginBottom: "8px" }} />
              <div style={{ width: "80%", height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px" }} />
              <style>{`@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
            </div>
          ))}
        </div>
      )}

      {/* Insight cards */}
      {!loading && visibleInsights.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
          {visibleInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={expanded === insight.id}
              onExpand={() => setExpanded(expanded === insight.id ? null : insight.id)}
              onDismiss={() => setDismissed(prev => new Set([...prev, insight.id]))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  expanded,
  onExpand,
  onDismiss,
}: {
  insight: Insight;
  expanded: boolean;
  onExpand: () => void;
  onDismiss: () => void;
}) {
  const pColor = PRIORITY_COLOR[insight.priority];
  const bg = TYPE_BG[insight.type] ?? "rgba(255,255,255,0.03)";
  const border = TYPE_BORDER[insight.type] ?? "rgba(255,255,255,0.08)";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderLeft: `3px solid ${pColor}`,
      borderRadius: "12px",
      padding: "14px",
      cursor: "pointer",
      transition: "all 0.15s",
    }}
      onClick={onExpand}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>{insight.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "white", lineHeight: 1.3 }}>{insight.title}</div>
            {insight.value && (
              <span style={{ fontSize: "11px", fontWeight: "800", color: pColor, flexShrink: 0 }}>{insight.value}</span>
            )}
          </div>
          {expanded && (
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "10px" }}>{insight.detail}</div>
          )}
          {!expanded && (
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insight.detail}</div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss insight"
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: "14px", padding: "0", flexShrink: 0 }}
        >×</button>
      </div>

      {expanded && insight.action && (
        <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
          <a href={insight.actionHref ?? "#"} onClick={e => e.stopPropagation()} style={{ textDecoration: "none" }}>
            <div style={{ background: pColor, color: "#0a0a0a", borderRadius: "6px", padding: "5px 14px", fontSize: "11px", fontWeight: "700" }}>
              {insight.action}
            </div>
          </a>
          {insight.change !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", fontSize: "11px", color: insight.change > 0 ? "#4ade80" : "#f87171", fontWeight: "700" }}>
              {insight.change > 0 ? "+" : ""}{insight.change}%
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: pColor }} />
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: ".04em" }}>{insight.priority} priority · {insight.type.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
}
