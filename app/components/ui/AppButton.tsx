"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";
type Role = "farmer" | "consumer" | "government";

const ROLE_COLOR: Record<Role, string> = {
  farmer: "var(--color-brand-farmer)",
  consumer: "var(--color-brand-consumer)",
  government: "var(--color-brand-government)",
};

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  role?: Role;
  children: ReactNode;
}

export default function AppButton({
  variant = "primary",
  role = "farmer",
  style,
  children,
  ...rest
}: AppButtonProps) {
  const accent = ROLE_COLOR[role];

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? { background: accent, color: "#0a0a0a", border: "none" }
      : variant === "danger"
      ? { background: "rgba(248,113,113,0.1)", color: "var(--color-danger)", border: "1px solid rgba(248,113,113,0.3)" }
      : { background: "transparent", color: accent, border: `1px solid ${accent}55` };

  return (
    <button
      type="button"
      {...rest}
      style={{
        borderRadius: "var(--radius-control)",
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: 700,
        fontFamily: "'Segoe UI', sans-serif",
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.6 : 1,
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
