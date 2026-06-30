"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "order";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    const duration = t.duration ?? 5000;
    setToasts(prev => [...prev.slice(-4), { ...t, id }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
  order: "📦",
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: "rgba(74,222,128,0.4)", icon: "#4ade80", bg: "rgba(74,222,128,0.08)" },
  error:   { border: "rgba(248,113,113,0.4)", icon: "#f87171", bg: "rgba(248,113,113,0.08)" },
  warning: { border: "rgba(251,191,36,0.4)",  icon: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
  info:    { border: "rgba(96,165,250,0.4)",  icon: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
  order:   { border: "rgba(167,139,250,0.4)", icon: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
};

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", top: "20px", right: "20px",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px",
        maxWidth: "360px", width: "100%",
      }}
    >
      {toasts.map(t => {
        const c = COLORS[t.type];
        return (
          <div key={t.id} style={{
            background: "#0a1a1a", border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.icon}`, borderRadius: "12px",
            padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)",
            animation: "slideIn 0.25s ease-out",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: c.bg, border: `1px solid ${c.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", color: c.icon, flexShrink: 0, fontWeight: "700",
            }}>{ICONS[t.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "white", marginBottom: t.message ? "3px" : 0 }}>{t.title}</div>
              {t.message && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{t.message}</div>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", fontSize: "16px", padding: "0", lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
    </div>
  );
}
