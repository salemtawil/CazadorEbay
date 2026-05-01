import type { DecisionStatus } from "@/lib/modules/contracts";

export function DecisionBadge({ status }: { status: DecisionStatus }) {
  return <span className="decision-badge" data-status={status}>{status}</span>;
}
