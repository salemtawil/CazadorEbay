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
    <section className="section-card">
      <div className="section-card-header">
        <h2 className="section-card-title">{title}</h2>
        {subtitle ? <p className="section-card-subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
