import { CSSProperties, ReactNode } from "react";
import FarmerSidebar from "./FarmerSidebar";

interface FarmerLayoutProps {
  activeHref: string;
  firstName: string;
  contentStyle?: CSSProperties;
  children: ReactNode;
}

export default function FarmerLayout({ activeHref, firstName, contentStyle, children }: FarmerLayoutProps) {
  return (
    <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>
      <FarmerSidebar activeHref={activeHref} firstName={firstName} />
      <div style={{ marginLeft: "200px", flex: 1, padding: "24px 28px", ...contentStyle }}>{children}</div>
    </main>
  );
}
