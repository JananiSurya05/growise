export default function AppLoadingState({ label = "Loading...", fullScreen = true }: { label?: string; fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: fullScreen ? "100vh" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: fullScreen ? 0 : "40px 0",
        background: fullScreen ? "#014D4E" : undefined,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.15)",
          borderTopColor: "var(--color-brand-farmer)",
          animation: "app-spin 0.8s linear infinite",
        }}
      />
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", fontFamily: "'Segoe UI', sans-serif" }}>{label}</span>
      <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
