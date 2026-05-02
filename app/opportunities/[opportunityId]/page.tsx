import { notFound } from "next/navigation";
import { DecisionBadge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatBooleanState,
  formatCount,
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatText,
  humanizeToken,
} from "@/lib/formatting";
import {
  buildOpportunityExplanation,
  getOpportunityActionDecision,
  getOpportunityActionLabel,
  getOpportunityBrand,
  getOpportunityListingUrl,
  getOpportunityModel,
  getOpportunitySourceLabel,
  getOpportunitySpecialItemLabel,
  getOpportunitySpecialItemType,
  getOpportunityTotalPrice,
  getOpportunityUiScore,
  getOpportunityUpdatedAt,
  getOpportunityVisibilityLabel,
} from "@/lib/opportunities/presentation";
import { alertService } from "@/lib/server/alert-service";
import { opportunityService } from "@/lib/server/opportunity-service";
import { isDatabaseConfigured } from "@/lib/server/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getActionToneClass(actionDecision: ReturnType<typeof getOpportunityActionDecision>): string {
  if (actionDecision === "buy_now") {
    return "status-pill-good";
  }

  if (actionDecision === "make_offer") {
    return "status-pill-warning";
  }

  return "status-pill-muted";
}

function renderReasonList(reasons: string[], emptyLabel: string) {
  if (reasons.length === 0) {
    return (
      <div className="empty-state">
        <p className="m-0">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="list-block">
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const opportunity = await opportunityService.getOpportunity(decodeURIComponent(opportunityId));

  if (!opportunity) {
    notFound();
  }

  const relatedAlerts = isDatabaseConfigured()
    ? await alertService.listRelatedAlerts(opportunity.listingRaw.id, opportunity.profile.id)
    : [];
  const explanation = buildOpportunityExplanation(opportunity);
  const listingUrl = getOpportunityListingUrl(opportunity);
  const actionDecision = getOpportunityActionDecision(opportunity);
  const specialItemType = getOpportunitySpecialItemType(opportunity);
  const brand = getOpportunityBrand(opportunity) ?? "Sin dato";
  const model = getOpportunityModel(opportunity) ?? "Sin dato";
  const totalPrice = getOpportunityTotalPrice(opportunity);
  const uiScore = getOpportunityUiScore(opportunity);

  return (
    <div className="grid">
      <SectionCard title={opportunity.listingRaw.title} subtitle={`Perfil ${opportunity.profile.name}`}>
        <div className="section-stack">
          <div className="split-row row-start">
            <div className="chips">
              <span className={`status-pill ${getActionToneClass(actionDecision)}`}>{getOpportunityActionLabel(actionDecision)}</span>
              <DecisionBadge status={opportunity.decision.status} />
              <span className="chip">{getOpportunityVisibilityLabel(opportunity.visibility.visibilityLevel)}</span>
              {specialItemType !== "none" ? <span className="chip">{getOpportunitySpecialItemLabel(specialItemType)}</span> : null}
            </div>
            <div className="metric-chip">
              <span className="metric-label">uiScore</span>
              <strong>{formatText(uiScore)}</strong>
            </div>
          </div>

          <p className="compact-text m-0">{explanation.summary}</p>

          <div className="cta-row">
            {listingUrl ? (
              <a href={listingUrl} target="_blank" rel="noreferrer" className="button-link">
                Ver en eBay
              </a>
            ) : (
              <span className="button-link button-link-disabled">Anuncio original no disponible</span>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="detail-grid">
        <div className="grid">
          <SectionCard title="Por que comprarlo?">
            <div className="section-stack">
              <div className="notice notice-info">
                <h3 className="notice-title">{explanation.headline}</h3>
                <p className="compact-text">{explanation.summary}</p>
              </div>

              <div className="grid grid-2">
                <div>
                  <p className="section-kicker">Motivos para considerarlo</p>
                  {renderReasonList(explanation.reasons, "No hay suficientes senales explicativas todavia.")}
                </div>
                <div>
                  <p className="section-kicker">Riesgos o dudas</p>
                  {renderReasonList(explanation.risks, "No se detectaron riesgos fuertes con la informacion actual.")}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Identificacion del listing">
            <div className="field-grid">
              <div className="field-card field-card-wide">
                <span className="field-label">Titulo</span>
                <strong className="field-value">{opportunity.listingRaw.title}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Brand</span>
                <strong className="field-value">{brand}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Model</span>
                <strong className="field-value">{model}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Perfil</span>
                <strong className="field-value">{opportunity.profile.name}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Source</span>
                <strong className="field-value">{getOpportunitySourceLabel(opportunity)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Precio total</span>
                <strong className="field-value">{formatCurrency(totalPrice, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Precio listado</span>
                <strong className="field-value">{formatCurrency(opportunity.listingRaw.price, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Actualizado</span>
                <strong className="field-value">{formatDateTime(getOpportunityUpdatedAt(opportunity))}</strong>
              </div>
              <div className="field-card field-card-wide">
                <span className="field-label">Anuncio original</span>
                <strong className="field-value">
                  {listingUrl ? (
                    <a href={listingUrl} target="_blank" rel="noreferrer">
                      Abrir anuncio en eBay
                    </a>
                  ) : (
                    "No disponible"
                  )}
                </strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Decision y oferta">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Accion sugerida</span>
                <strong className="field-value">{getOpportunityActionLabel(actionDecision)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Decision del motor</span>
                <strong className="field-value">{opportunity.decision.status}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Confianza de decision</span>
                <strong className="field-value">{formatPercent(opportunity.decision.confidence)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Offer strategy</span>
                <strong className="field-value">{humanizeToken(opportunity.offer.offerStrategy)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Anchor offer</span>
                <strong className="field-value">{formatCurrency(opportunity.offer.anchorOffer, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Oferta recomendada</span>
                <strong className="field-value">
                  {formatCurrency(opportunity.offer.recommendedOffer, opportunity.listingRaw.currency)}
                </strong>
              </div>
              <div className="field-card">
                <span className="field-label">Walk away price</span>
                <strong className="field-value">{formatCurrency(opportunity.offer.walkAwayPrice, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Margen esperado</span>
                <strong className="field-value">{formatCurrency(opportunity.decision.expectedMargin, opportunity.listingRaw.currency)}</strong>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Clasificacion y visibilidad">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Visibility level</span>
                <strong className="field-value">{getOpportunityVisibilityLabel(opportunity.visibility.visibilityLevel)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Special item type</span>
                <strong className="field-value">{getOpportunitySpecialItemLabel(specialItemType)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Comparable match confidence</span>
                <strong className="field-value">{formatPercent(opportunity.inspection?.comparableMatchConfidence)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Profile compatibility</span>
                <strong className="field-value">{formatPercent(opportunity.inspection?.profileCompatibility)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Confianza de clasificacion</span>
                <strong className="field-value">{formatPercent(opportunity.classification.confidence)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Subtitulo</span>
                <strong className="field-value">{formatText(opportunity.listingRaw.subtitle)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Scoring">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">uiScore</span>
                <strong className="field-value">{formatText(uiScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">rawScore</span>
                <strong className="field-value">{formatText(opportunity.inspection?.rawScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Price score</span>
                <strong className="field-value">{formatText(opportunity.scoring.priceScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Demand score</span>
                <strong className="field-value">{formatText(opportunity.scoring.demandScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Trust score</span>
                <strong className="field-value">{formatText(opportunity.scoring.trustScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Fit score</span>
                <strong className="field-value">{formatText(opportunity.scoring.fitScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Liquidity score</span>
                <strong className="field-value">{formatText(opportunity.scoring.liquidityScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Risk penalty</span>
                <strong className="field-value">{formatText(opportunity.scoring.riskPenalty)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Confidence penalty</span>
                <strong className="field-value">{formatText(opportunity.scoring.confidencePenalty)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Alertas relacionadas">
            {relatedAlerts.length > 0 ? (
              <div className="section-stack">
                {relatedAlerts.map((alert) => (
                  <article className="notice notice-info" key={alert.id}>
                    <div className="split-row">
                      <h3 className="notice-title">{alert.title}</h3>
                      <span className="status-pill status-pill-muted">{humanizeToken(alert.severity)}</span>
                    </div>
                    <p className="compact-text">{alert.message}</p>
                    <p className="muted compact-text">Creada: {formatDateTime(alert.createdAt)}</p>
                  </article>
                ))}
              </div>
            ) : opportunity.alerts.length > 0 ? (
              <ul className="list-block">
                {opportunity.alerts.map((alert) => (
                  <li key={alert.id}>
                    {humanizeToken(alert.severity)}: {alert.message}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p className="m-0">No hay alertas relacionadas para esta oportunidad.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Contexto adicional">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Seller rating</span>
                <strong className="field-value">{formatText(opportunity.listingRaw.sellerRating)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Seller sales</span>
                <strong className="field-value">{formatCount(opportunity.listingRaw.sellerSalesCount)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Location</span>
                <strong className="field-value">{formatText(opportunity.listingRaw.location)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Acepta devoluciones</span>
                <strong className="field-value">{formatBooleanState(opportunity.listingRaw.returnsAccepted)}</strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
