import Link from "next/link";
import { DecisionBadge } from "@/components/ui/badge";
import type { EvaluationResult } from "@/lib/modules/contracts";

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `$${value}`;
}

function getUiScore(opportunity: EvaluationResult): string {
  return `${opportunity.scoring.totalScore} pts`;
}

function getSpecialItemType(opportunity: EvaluationResult): string | null {
  return opportunity.listingNormalized.itemType === "STANDARD"
    ? null
    : opportunity.listingNormalized.itemType.toLowerCase();
}

export function OpportunityCard({
  opportunity,
  compact = false,
}: {
  opportunity: EvaluationResult;
  compact?: boolean;
}) {
  const specialItemType = getSpecialItemType(opportunity);

  return (
    <div className="row">
      <div>
        <Link href={`/opportunities/${encodeURIComponent(opportunity.id)}`}>
          <h3 className="m-0">{opportunity.listingRaw.title}</h3>
        </Link>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {opportunity.profile.name} - {opportunity.visibility.visibilityLevel} - uiScore {getUiScore(opportunity)}
        </p>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {opportunity.listingRaw.location} - {opportunity.listingRaw.sellerName} - rating {opportunity.listingRaw.sellerRating}
        </p>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Oferta recomendada {formatCurrency(opportunity.offer.recommendedOffer)}
          {specialItemType ? ` - ${specialItemType}` : ""}
        </p>
      </div>
      <div className="text-right" style={{ minWidth: compact ? 140 : 180 }}>
        <DecisionBadge status={opportunity.decision.status} />
        <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{getUiScore(opportunity)}</p>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {opportunity.offer.offerStrategy}
        </p>
      </div>
    </div>
  );
}
