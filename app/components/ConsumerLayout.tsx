import { CSSProperties, ReactNode } from "react";
import ConsumerSidebar from "./ConsumerSidebar";

interface ConsumerLayoutProps {
  activeHref: string;
  firstName?: string;
  contentStyle?: CSSProperties;
  children: ReactNode;
}

export default function ConsumerLayout({ activeHref, firstName, contentStyle, children }: ConsumerLayoutProps) {
  return (
    <main style={{ minHeight: "100vh", background: "#014D4E", fontFamily: "'Segoe UI', sans-serif", display: "flex" }}>
      <ConsumerSidebar activeHref={activeHref} firstName={firstName} />
      <div className="main-content" style={{ marginLeft: "200px", flex: 1, padding: "24px 28px", ...contentStyle }}>
        {children}
      </div>
    </main>
  );
}
