import type { DecisionStatus } from "@/lib/modules/contracts";

const palette: Record<DecisionStatus, { background: string; color: string }> = {
  BUY: { background: "#dcfce7", color: "#166534" },
  NEGOTIATE: { background: "#fef3c7", color: "#92400e" },
  REVIEW: { background: "#e0f2fe", color: "#075985" },
  WATCH: { background: "#e2e8f0", color: "#334155" },
  SKIP: { background: "#ffe4e6", color: "#9f1239" },
};

export function DecisionBadge({ status }: { status: DecisionStatus }) {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        background: palette[status].background,
        color: palette[status].color,
      }}
    >
      {status}
    </span>
  );
}

