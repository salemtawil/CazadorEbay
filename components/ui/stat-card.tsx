export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article
      style={{
        borderRadius: 24,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: 20,
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em" }}>
        {value}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14, color: "#475569" }}>{hint}</p>
    </article>
  );
}

