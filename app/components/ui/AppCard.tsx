import { HTMLAttributes, ReactNode } from "react";

const ROLE_ACCENT = {
  farmer: "rgba(74,222,128,0.2)",
  consumer: "rgba(96,165,250,0.2)",
  government: "rgba(167,139,250,0.2)",
  neutral: "rgba(255,255,255,0.06)",
} as const;

type Role = keyof typeof ROLE_ACCENT;

interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Named role accent, for the common case of a card matching its portal's color. */
  role?: Role;
  /** Arbitrary border accent color, for cards that need a color independent of portal role
   *  (e.g. multiple differently-accented panels on the same dashboard). Overrides `role`. */
  accent?: string;
  children: ReactNode;
}

export default function AppCard({ role = "neutral", accent, style, children, ...rest }: AppCardProps) {
  return (
    <div
      {...rest}
      style={{
        background: "rgba(0,0,0,0.25)",
        border: `1px solid ${accent ?? ROLE_ACCENT[role]}`,
        borderRadius: "var(--radius-card)",
        padding: "20px",
        backdropFilter: "blur(20px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
