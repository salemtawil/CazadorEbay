import Link from "next/link";
import type { Route } from "next";
import { SavedToggleButton } from "@/components/saved-toggle-button";
import { formatCurrency } from "@/lib/formatting";
import {
  getOpportunityActionDecision,
  getOpportunityActionLabel,
  getOpportunityEstimatedSavings,
  getOpportunityImageUrl,
  getOpportunityListingUrl,
  getOpportunityPrimaryReasons,
  getOpportunityRiskLabel,
  getOpportunityRiskLevel,
  getOpportunityTotalPrice,
} from "@/lib/opportunities/presentation";
import type { EvaluationResult } from "@/lib/modules/contracts";

function getActionToneClass(actionDecision: ReturnType<typeof getOpportunityActionDecision>): string {
  if (actionDecision === "buy_now") {
    return "status-pill-good";
  }

  if (actionDecision === "make_offer") {
    return "status-pill-warning";
  }

  return "status-pill-info";
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
  const listingUrl = getOpportunityListingUrl(opportunity);
  const imageUrl = getOpportunityImageUrl(opportunity);
  const detailHref = `/opportunities/${encodeURIComponent(opportunity.id)}` as Route;
  const totalPrice = formatCurrency(getOpportunityTotalPrice(opportunity), opportunity.listingRaw.currency);
  const estimatedSavings = getOpportunityEstimatedSavings(opportunity);
  const reasons = getOpportunityPrimaryReasons(opportunity, 2);
  const riskLabel = getOpportunityRiskLabel(getOpportunityRiskLevel(opportunity));

  return (
    <article className={`opportunity-card${compact ? " opportunity-card-compact" : ""}`}>
      <div className="opportunity-card-main">
        <div className="split-row">
          <div className="chips">
            <span className={`status-pill ${getActionToneClass(actionDecision)}`}>{actionLabel}</span>
            <span className="chip">{riskLabel}</span>
          </div>
          {estimatedSavings !== null ? (
            <p className="opportunity-savings">
              Ahorro estimado {formatCurrency(estimatedSavings, opportunity.listingRaw.currency)}
            </p>
          ) : null}
        </div>

        <div className="opportunity-topline">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={opportunity.listingRaw.title} className="opportunity-thumb" />
          ) : (
            <div className="opportunity-thumb opportunity-thumb-placeholder">
              <span>eBay</span>
            </div>
          )}

          <div className="section-stack">
            <Link href={detailHref}>
              <h3 className="opportunity-card-title">{opportunity.listingRaw.title}</h3>
            </Link>
            <p className="opportunity-price">{totalPrice}</p>
          </div>
        </div>

        <div className="reason-list">
          {reasons.length > 0 ? (
            reasons.map((reason) => (
              <p key={reason} className="reason-line">
                {reason}
              </p>
            ))
          ) : (
            <p className="reason-line">No hay suficientes motivos claros todavia.</p>
          )}
        </div>
      </div>

      <div className="opportunity-card-side">
        <div className="cta-row opportunity-actions">
          {listingUrl ? (
            <a href={listingUrl} target="_blank" rel="noreferrer" className="button-link button-link-secondary">
              Ver en eBay
            </a>
          ) : (
            <span className="button-link button-link-disabled">Anuncio no disponible</span>
          )}
          <SavedToggleButton opportunityId={opportunity.id} className="button-ghost" />
          <Link href={detailHref} className="button-link">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
