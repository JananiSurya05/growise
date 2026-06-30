import { ReactNode } from "react";

interface AppEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function AppEmptyState({ icon = "📭", title, description, action }: AppEmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 20px",
        color: "rgba(255,255,255,0.5)",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "10px" }} aria-hidden="true">{icon}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: description ? "4px" : 0 }}>{title}</div>
      {description && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{description}</div>}
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}
