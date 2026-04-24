import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: 28,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: 24,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
        {subtitle ? <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

