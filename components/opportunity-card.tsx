import Link from "next/link";
import { SavedToggleButton } from "@/components/saved-toggle-button";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import {
  getOpportunityActionDecision,
  getOpportunityActionDescription,
  getOpportunityActionLabel,
  getOpportunityBrandModelLabel,
  getOpportunityEstimatedSavings,
  getOpportunityImageUrl,
  getOpportunityListingUrl,
  getOpportunityMarketReference,
  getOpportunityPriceContext,
  getOpportunityPrimaryReasons,
  getOpportunityRecommendedOfferLabel,
  getOpportunityRiskLabel,
  getOpportunityRiskLevel,
  getOpportunityRiskSummary,
  getOpportunitySourceLabel,
  getOpportunityTotalPrice,
  getOpportunityUpdatedAt,
  getOpportunityWhatToDoNow,
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
  const actionDescription = getOpportunityActionDescription(actionDecision);
  const brandModel = getOpportunityBrandModelLabel(opportunity);
  const listingUrl = getOpportunityListingUrl(opportunity);
  const imageUrl = getOpportunityImageUrl(opportunity);
  const detailHref = {
    pathname: "/opportunities/[opportunityId]",
    query: { opportunityId: opportunity.id },
  } as const;
  const totalPrice = formatCurrency(getOpportunityTotalPrice(opportunity), opportunity.listingRaw.currency);
  const marketReference = getOpportunityMarketReference(opportunity);
  const estimatedSavings = getOpportunityEstimatedSavings(opportunity);
  const updatedAt = formatDateTime(getOpportunityUpdatedAt(opportunity));
  const reasons = getOpportunityPrimaryReasons(opportunity, compact ? 2 : 3);
  const riskLabel = getOpportunityRiskLabel(getOpportunityRiskLevel(opportunity));
  const riskSummary = getOpportunityRiskSummary(opportunity);
  const recommendedOffer = getOpportunityRecommendedOfferLabel(opportunity);

  return (
    <article className={`opportunity-card${compact ? " opportunity-card-compact" : ""}`}>
      <div className="opportunity-card-main">
        <div className="split-row row-start">
          <div className="chips">
            <span className={`status-pill ${getActionToneClass(actionDecision)}`}>{actionLabel}</span>
            <span className="chip">{riskLabel}</span>
            <span className="chip">{opportunity.profile.name}</span>
          </div>
          <p className="muted compact-text">Actualizado {updatedAt}</p>
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
            <div className="opportunity-card-meta">
              <span>{getOpportunitySourceLabel(opportunity)}</span>
              {brandModel ? <span>{brandModel}</span> : null}
              <span>{getOpportunityPriceContext(opportunity)}</span>
            </div>
            <p className="compact-text">{actionDescription}</p>
          </div>
        </div>

        <div className="opportunity-why-grid">
          <div className="opportunity-why-block">
            <p className="section-kicker">Por que podria valer la pena</p>
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
          <div className="opportunity-risk-block">
            <p className="section-kicker">Riesgo resumido</p>
            <p className="compact-text">{riskSummary}</p>
          </div>
        </div>
      </div>

      <div className="opportunity-card-side">
        <div className="metric-chip metric-chip-strong">
          <span className="metric-label">Precio total</span>
          <strong>{totalPrice}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Referencia</span>
          <strong>{marketReference ? formatCurrency(marketReference, opportunity.listingRaw.currency) : "Sin referencia"}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Ahorro estimado</span>
          <strong>
            {estimatedSavings !== null ? formatCurrency(estimatedSavings, opportunity.listingRaw.currency) : "Sin dato"}
          </strong>
        </div>
        {recommendedOffer ? (
          <div className="metric-chip">
            <span className="metric-label">Oferta sugerida</span>
            <strong>{recommendedOffer}</strong>
          </div>
        ) : null}
        <div className="helper-panel">
          <span className="metric-label">Que haria ahora</span>
          <p className="compact-text">{getOpportunityWhatToDoNow(opportunity)}</p>
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
          <SavedToggleButton opportunityId={opportunity.id} className="button-ghost" />
        </div>
      </div>
    </article>
  );
}
