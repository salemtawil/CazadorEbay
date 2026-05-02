import Link from "next/link";
import { DecisionBadge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import {
  buildOpportunityShortSummary,
  getOpportunityActionDecision,
  getOpportunityActionLabel,
  getOpportunityBrandModelLabel,
  getOpportunityListingUrl,
  getOpportunitySourceLabel,
  getOpportunitySpecialItemLabel,
  getOpportunitySpecialItemType,
  getOpportunityTotalPrice,
  getOpportunityUiScore,
  getOpportunityUpdatedAt,
  getOpportunityVisibilityLabel,
} from "@/lib/opportunities/presentation";
import type { EvaluationResult } from "@/lib/modules/contracts";

function getActionToneClass(actionDecision: ReturnType<typeof getOpportunityActionDecision>): string {
  if (actionDecision === "buy_now") {
    return "status-pill-good";
  }

  if (actionDecision === "make_offer") {
    return "status-pill-warning";
  }

  return "status-pill-muted";
}

export function OpportunityCard({
  opportunity,
  compact = false,
}: {
  opportunity: EvaluationResult;
  compact?: boolean;
}) {
  const actionDecision = getOpportunityActionDecision(opportunity);
  const actionLabel = getOpportunityActionLabel(actionDecision);
  const brandModel = getOpportunityBrandModelLabel(opportunity);
  const specialItemType = getOpportunitySpecialItemType(opportunity);
  const summary = buildOpportunityShortSummary(opportunity);
  const listingUrl = getOpportunityListingUrl(opportunity);
  const detailHref = `/opportunities/${opportunity.id}`;
    
  const visibilityLabel = getOpportunityVisibilityLabel(opportunity.visibility.visibilityLevel);
  const totalPrice = formatCurrency(getOpportunityTotalPrice(opportunity), opportunity.listingRaw.currency);
  const uiScore = getOpportunityUiScore(opportunity);
  const updatedAt = formatDateTime(getOpportunityUpdatedAt(opportunity));

  return (
    <article className={`opportunity-card${compact ? " opportunity-card-compact" : ""}`}>
      <div className="opportunity-card-main">
        <div className="split-row">
          <div className="chips">
            <span className={`status-pill ${getActionToneClass(actionDecision)}`}>{actionLabel}</span>
            <DecisionBadge status={opportunity.decision.status} />
            {opportunity.visibility.visibilityLevel !== "primary_feed" || !compact ? (
              <span className="chip">{visibilityLabel}</span>
            ) : null}
            {specialItemType !== "none" ? <span className="chip">{getOpportunitySpecialItemLabel(specialItemType)}</span> : null}
          </div>
          <p className="muted compact-text">Actualizado {updatedAt}</p>
        </div>

        <Link href={detailHref}>
		  <h3 className="opportunity-card-title">{opportunity.listingRaw.title}</h3>
		</Link>

        <div className="opportunity-card-meta">
          <span>Perfil: {opportunity.profile.name}</span>
          <span>Source: {getOpportunitySourceLabel(opportunity)}</span>
          {brandModel ? <span>{brandModel}</span> : null}
        </div>

        <p className={`compact-text${compact ? " muted" : ""}`}>{summary}</p>
      </div>

      <div className="opportunity-card-side">
        <div className="metric-chip">
          <span className="metric-label">Precio total</span>
          <strong>{totalPrice}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">uiScore</span>
          <strong>{uiScore}</strong>
        </div>

        <div className="cta-row">
          <Link href={detailHref} className="button-link">
            Ver detalle
          </Link>
          {listingUrl ? (
            <a href={listingUrl} target="_blank" rel="noreferrer" className="button-link button-link-secondary">
              Ver en eBay
            </a>
          ) : (
            <span className="button-link button-link-disabled">Anuncio no disponible</span>
          )}
        </div>
      </div>
    </article>
  );
}
