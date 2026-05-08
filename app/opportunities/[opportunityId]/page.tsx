import { notFound } from "next/navigation";
import { SectionCard } from "@/components/ui/section-card";
import { formatBooleanState, formatCount, formatCurrency, formatDateTime, formatPercent, formatText, humanizeToken } from "@/lib/formatting";
import {
  buildOpportunityExplanation,
  getOpportunityActionDecision,
  getOpportunityActionDescription,
  getOpportunityActionLabel,
  getOpportunityBrand,
  getOpportunityListingUrl,
  getOpportunityMarketReference,
  getOpportunityMaxReasonablePriceLabel,
  getOpportunityModel,
  getOpportunityRecommendedOfferLabel,
  getOpportunityRiskLabel,
  getOpportunityRiskLevel,
  getOpportunityRiskSummary,
  getOpportunitySellerSummary,
  getOpportunitySourceLabel,
  getOpportunitySpecialItemLabel,
  getOpportunitySpecialItemType,
  getOpportunityTotalPrice,
  getOpportunityUiScore,
  getOpportunityUpdatedAt,
  getOpportunityVisibilityLabel,
  getOpportunityWhatToDoNow,
} from "@/lib/opportunities/presentation";
import { alertService } from "@/lib/server/alert-service";
import { opportunityService } from "@/lib/server/opportunity-service";
import { isDatabaseConfigured } from "@/lib/server/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderReasonList(reasons: string[], emptyLabel: string) {
  if (reasons.length === 0) {
    return (
      <div className="empty-state">
        <p className="m-0">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="reason-list">
      {reasons.map((reason) => (
        <p key={reason} className="reason-line">
          {reason}
        </p>
      ))}
    </div>
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
  const marketReference = getOpportunityMarketReference(opportunity);
  const uiScore = getOpportunityUiScore(opportunity);
  const recommendedOffer = getOpportunityRecommendedOfferLabel(opportunity);
  const maxReasonablePrice = getOpportunityMaxReasonablePriceLabel(opportunity);

  return (
    <div className="grid stack-gap-lg">
      <SectionCard title={opportunity.listingRaw.title} subtitle={`Asociada a ${opportunity.profile.name}`}>
        <div className="section-stack">
          <div className="split-row row-start">
            <div className="chips">
              <span className="status-pill status-pill-good">{getOpportunityActionLabel(actionDecision)}</span>
                <span className="chip">{getOpportunityRiskLabel(getOpportunityRiskLevel(opportunity))}</span>
              <span className="chip">{getOpportunitySourceLabel(opportunity)}</span>
            </div>
            <p className="muted compact-text">Actualizado {formatDateTime(getOpportunityUpdatedAt(opportunity))}</p>
          </div>
          <p className="lead-text">{getOpportunityActionDescription(actionDecision)}</p>
          <div className="metric-strip">
            <div className="metric-chip metric-chip-strong">
              <span className="metric-label">Precio total</span>
              <strong>{formatCurrency(totalPrice, opportunity.listingRaw.currency)}</strong>
            </div>
            <div className="metric-chip">
              <span className="metric-label">Referencia de mercado</span>
              <strong>{marketReference ? formatCurrency(marketReference, opportunity.listingRaw.currency) : "Sin referencia"}</strong>
            </div>
            <div className="metric-chip">
              <span className="metric-label">Que haria ahora</span>
              <strong>{getOpportunityWhatToDoNow(opportunity)}</strong>
            </div>
          </div>
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
          <SectionCard title="A. Que es?" subtitle="Lo esencial para ubicar rapido el producto y su contexto.">
            <div className="field-grid">
              <div className="field-card field-card-wide">
                <span className="field-label">Producto</span>
                <strong className="field-value">{opportunity.listingRaw.title}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Precio total</span>
                <strong className="field-value">{formatCurrency(totalPrice, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Vendedor</span>
                <strong className="field-value">{getOpportunitySellerSummary(opportunity)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Marca</span>
                <strong className="field-value">{brand}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Modelo</span>
                <strong className="field-value">{model}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Fecha</span>
                <strong className="field-value">{formatDateTime(getOpportunityUpdatedAt(opportunity))}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Busqueda asociada</span>
                <strong className="field-value">{opportunity.profile.name}</strong>
              </div>
              <div className="field-card field-card-wide">
                <span className="field-label">Link original</span>
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

          <SectionCard title="B. Por que interesa?" subtitle="Explicacion corta en lenguaje natural.">
            <div className="section-stack">
              <div className="notice notice-info">
                <h3 className="notice-title">{explanation.headline}</h3>
                <p className="compact-text">{explanation.summary}</p>
              </div>
              <div>
                <p className="section-kicker">Motivos principales</p>
                {renderReasonList(explanation.reasons, "Todavia no hay motivos suficientemente claros en esta evaluacion.")}
              </div>
              <div className="field-card field-card-wide">
                <span className="field-label">Como encaja con la busqueda</span>
                <strong className="field-value">
                  {opportunity.profile.name} busca {opportunity.profile.keywords.slice(0, 3).join(", ") || "productos similares"} y esta oportunidad encaja con esa estrategia.
                </strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="C. Que riesgos tiene?" subtitle="Resumen util antes de decidir si mover ficha o esperar.">
            <div className="section-stack">
              <div className="notice notice-warning">
                <h3 className="notice-title">{getOpportunityRiskLabel(getOpportunityRiskLevel(opportunity))}</h3>
                <p className="compact-text">{getOpportunityRiskSummary(opportunity)}</p>
              </div>
              <div>
                <p className="section-kicker">Dudas o senales negativas</p>
                {renderReasonList(explanation.risks, "No se detectaron senales negativas fuertes con la informacion actual.")}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="D. Que hago ahora?" subtitle="La app propone una accion y un rango de precio razonable cuando existe.">
            <div className="field-grid">
              <div className="field-card field-card-wide">
                <span className="field-label">Accion principal</span>
                <strong className="field-value">{getOpportunityWhatToDoNow(opportunity)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Recomendacion</span>
                <strong className="field-value">{getOpportunityActionLabel(actionDecision)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Oferta recomendada</span>
                <strong className="field-value">{recommendedOffer ?? "No aplica"}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Precio maximo razonable</span>
                <strong className="field-value">{maxReasonablePrice ?? "No aplica"}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Margen esperado</span>
                <strong className="field-value">{formatCurrency(opportunity.decision.expectedMargin, opportunity.listingRaw.currency)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="E. Mas detalles" subtitle="La capa tecnica queda aqui para validar o auditar la evaluacion.">
            <details className="technical-details" open>
              <summary>Ver datos tecnicos</summary>
              <div className="section-stack mt-16">
                <div className="field-grid">
                  <div className="field-card">
                    <span className="field-label">Prioridad interna</span>
                    <strong className="field-value">{formatText(uiScore)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Raw score</span>
                    <strong className="field-value">{formatText(opportunity.inspection?.rawScore)}</strong>
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
                    <span className="field-label">Visibilidad</span>
                    <strong className="field-value">{getOpportunityVisibilityLabel(opportunity.visibility.visibilityLevel)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Tipo especial</span>
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
                    <span className="field-label">Offer strategy</span>
                    <strong className="field-value">{humanizeToken(opportunity.offer.offerStrategy)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Anchor offer</span>
                    <strong className="field-value">{formatCurrency(opportunity.offer.anchorOffer, opportunity.listingRaw.currency)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Walk away price</span>
                    <strong className="field-value">{formatCurrency(opportunity.offer.walkAwayPrice, opportunity.listingRaw.currency)}</strong>
                  </div>
                </div>

                <div className="field-grid">
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
              </div>
            </details>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Contexto del anuncio" subtitle="Señales operativas y comerciales de apoyo.">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Precio listado</span>
                <strong className="field-value">{formatCurrency(opportunity.listingRaw.price, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Envio</span>
                <strong className="field-value">{formatCurrency(opportunity.listingRaw.shippingCost, opportunity.listingRaw.currency)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Devoluciones</span>
                <strong className="field-value">{formatBooleanState(opportunity.listingRaw.returnsAccepted)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Ubicacion</span>
                <strong className="field-value">{formatText(opportunity.listingRaw.location)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Muestras de mercado</span>
                <strong className="field-value">{formatCount(opportunity.market.sampleSize)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Demanda</span>
                <strong className="field-value">{formatPercent(opportunity.market.sellThroughRate)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Cambios relacionados" subtitle="Historial cercano para entender si la oportunidad se esta moviendo.">
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
              <div className="reason-list">
                {opportunity.alerts.map((alert) => (
                  <p key={alert.id} className="reason-line">
                    {humanizeToken(alert.severity)}: {alert.message}
                  </p>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="m-0">No hay cambios relacionados para esta oportunidad.</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
