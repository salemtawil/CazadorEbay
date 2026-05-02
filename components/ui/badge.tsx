import type { DecisionStatus } from "@/lib/modules/contracts";

const DECISION_LABELS: Record<DecisionStatus, string> = {
  BUY: "Comprar",
  NEGOTIATE: "Negociar",
  REVIEW: "Revisar",
  WATCH: "Seguir",
  SKIP: "Ignorar",
};

export function DecisionBadge({ status }: { status: DecisionStatus }) {
  return (
    <span className="decision-badge" data-status={status}>
      {DECISION_LABELS[status]}
    </span>
  );
}
