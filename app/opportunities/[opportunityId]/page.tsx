import { notFound } from "next/navigation";
import { DecisionBadge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatCount,
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatText,
  humanizeToken,
} from "@/lib/formatting";
import { alertService } from "@/lib/server/alert-service";
import { opportunityService } from "@/lib/server/opportunity-service";
import { isDatabaseConfigured } from "@/lib/server/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeIdentityValue(value: string | undefined, fallbackTokens: string[]): string {
  if (!value || fallbackTokens.includes(value.toLowerCase())) {
    return "not set";
  }

  return value;
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
  const inspection = opportunity.inspection;
  const totalPrice = opportunity.listingNormalized.totalAcquisitionCost;
  const brand = normalizeIdentityValue(opportunity.classification.brand, ["generic", "unknown-brand"]);
  const model = normalizeIdentityValue(opportunity.classification.model, ["unspecified", "unknown-model"]);

  return (
    <div className="grid">
      <SectionCard title={opportunity.listingRaw.title} subtitle={`Perfil ${opportunity.profile.name}`}>
        <div className="split-row row-start">
          <div className="chips">
            <DecisionBadge status={opportunity.decision.status} />
            <span className="chip">{humanizeToken(opportunity.listingRaw.marketplace)}</span>
            <span className="chip">{humanizeToken(opportunity.visibility.visibilityLevel)}</span>
            <span className="chip">{humanizeToken(inspection?.listingState)}</span>
          </div>
          <div className="metric-chip">
            <span className="metric-label">uiScore</span>
            <strong>{formatText(inspection?.uiScore ?? opportunity.scoring.totalScore)}</strong>
          </div>
        </div>
      </SectionCard>

      <div className="detail-grid">
        <div className="grid">
          <SectionCard title="Identificacion del listing">
            <div className="field-grid">
              <div className="field-card field-card-wide">
                <span className="field-label">Title</span>
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
                <span className="field-label">Profile</span>
                <strong className="field-value">{opportunity.profile.name}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Source</span>
                <strong className="field-value">{humanizeToken(opportunity.listingRaw.marketplace)}</strong>
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
                <strong className="field-value">{formatDateTime(inspection?.updatedAt ?? opportunity.listingRaw.scrapedAt)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Clasificacion">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Listing state</span>
                <strong className="field-value">{humanizeToken(inspection?.listingState)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Special item type</span>
                <strong className="field-value">{humanizeToken(inspection?.specialItemType)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Visibility level</span>
                <strong className="field-value">{humanizeToken(opportunity.visibility.visibilityLevel)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Comparable match confidence</span>
                <strong className="field-value">{formatPercent(inspection?.comparableMatchConfidence)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Profile compatibility</span>
                <strong className="field-value">{formatPercent(inspection?.profileCompatibility)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Clasificacion confidence</span>
                <strong className="field-value">{formatPercent(opportunity.classification.confidence)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Razones">
            <div className="grid grid-2">
              <div>
                <p className="section-kicker">driversPositive</p>
                {renderReasonList(inspection?.driversPositive ?? [], "No hay drivers positivos registrados.")}
              </div>
              <div>
                <p className="section-kicker">driversNegative</p>
                {renderReasonList(inspection?.driversNegative ?? [], "No hay drivers negativos registrados.")}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Decision">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">Decision</span>
                <strong className="field-value">{opportunity.decision.status}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">Decision confidence</span>
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
                <span className="field-label">Recommended offer</span>
                <strong className="field-value">
                  {formatCurrency(opportunity.offer.recommendedOffer, opportunity.listingRaw.currency)}
                </strong>
              </div>
              <div className="field-card">
                <span className="field-label">Walk away price</span>
                <strong className="field-value">{formatCurrency(opportunity.offer.walkAwayPrice, opportunity.listingRaw.currency)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Scoring">
            <div className="field-grid">
              <div className="field-card">
                <span className="field-label">uiScore</span>
                <strong className="field-value">{formatText(inspection?.uiScore ?? opportunity.scoring.totalScore)}</strong>
              </div>
              <div className="field-card">
                <span className="field-label">rawScore</span>
                <strong className="field-value">{formatText(inspection?.rawScore)}</strong>
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
                <span className="field-label">URL</span>
                <strong className="field-value">
                  <a href={opportunity.listingRaw.url} target="_blank" rel="noreferrer">
                    Abrir listing
                  </a>
                </strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
