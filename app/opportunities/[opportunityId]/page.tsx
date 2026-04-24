import { notFound } from "next/navigation";
import { DecisionBadge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { opportunityService } from "@/lib/server/opportunity-service";

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `$${value}`;
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

  return (
    <div className="detail-grid">
      <SectionCard title={opportunity.listingRaw.title} subtitle={opportunity.profile.name}>
        <div className="chips" style={{ marginBottom: 18 }}>
          <DecisionBadge status={opportunity.decision.status} />
          <span className="chip">{opportunity.classification.brand}</span>
          <span className="chip">{opportunity.classification.model}</span>
          {opportunity.listingNormalized.itemType !== "STANDARD" ? (
            <span className="chip">{opportunity.listingNormalized.itemType.toLowerCase()}</span>
          ) : null}
          <span className="chip">{opportunity.listingRaw.condition}</span>
          <span className="chip">{opportunity.visibility.visibilityLevel}</span>
        </div>
        <div className="kpi">
          <span>Profile</span>
          <strong>{opportunity.profile.name}</strong>
        </div>
        <div className="kpi">
          <span>uiScore</span>
          <strong>{opportunity.scoring.totalScore}</strong>
        </div>
        <div className="kpi">
          <span>Precio listado</span>
          <strong>${opportunity.listingRaw.price}</strong>
        </div>
        <div className="kpi">
          <span>Envio</span>
          <strong>${opportunity.listingRaw.shippingCost}</strong>
        </div>
        <div className="kpi">
          <span>Resale esperado</span>
          <strong>${opportunity.decision.expectedResale}</strong>
        </div>
        <div className="kpi">
          <span>Margen esperado</span>
          <strong>${opportunity.decision.expectedMargin}</strong>
        </div>
        <div className="kpi">
          <span>Recommended offer</span>
          <strong>{formatCurrency(opportunity.offer.recommendedOffer)}</strong>
        </div>
        <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ marginBottom: 8 }}>Classification</h3>
            <ul>
              <li>Brand: {opportunity.classification.brand}</li>
              <li>Model: {opportunity.classification.model}</li>
              <li>Confidence: {opportunity.classification.confidence}</li>
              <li>Special item type: {opportunity.listingNormalized.itemType.toLowerCase()}</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Reasons positivas</h3>
            <ul>
              {opportunity.scoring.reasoning.concat(opportunity.offer.reasoning).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <div className="grid" style={{ gap: 20 }}>
        <SectionCard title="Visibility y scoring">
          <div className="kpi">
            <span>Visibility</span>
            <strong>{opportunity.visibility.visibilityLevel}</strong>
          </div>
          <div className="kpi">
            <span>Total</span>
            <strong>{opportunity.scoring.totalScore}</strong>
          </div>
          <div className="kpi">
            <span>Precio</span>
            <strong>{opportunity.scoring.priceScore}</strong>
          </div>
          <div className="kpi">
            <span>Demanda</span>
            <strong>{opportunity.scoring.demandScore}</strong>
          </div>
          <div className="kpi">
            <span>Trust</span>
            <strong>{opportunity.scoring.trustScore}</strong>
          </div>
          <div className="kpi">
            <span>Fit</span>
            <strong>{opportunity.scoring.fitScore}</strong>
          </div>
          <div className="kpi">
            <span>Risk penalty</span>
            <strong>{opportunity.scoring.riskPenalty}</strong>
          </div>
          <div className="kpi">
            <span>Confidence penalty</span>
            <strong>{opportunity.scoring.confidencePenalty}</strong>
          </div>
        </SectionCard>

        <SectionCard title="Decision y offer recommendation">
          <div className="kpi">
            <span>Decision</span>
            <strong>{opportunity.decision.status}</strong>
          </div>
          <div className="kpi">
            <span>Decision confidence</span>
            <strong>{opportunity.decision.confidence}</strong>
          </div>
          <div className="kpi">
            <span>Offer strategy</span>
            <strong>{opportunity.offer.offerStrategy}</strong>
          </div>
          <div className="kpi">
            <span>Anchor</span>
            <strong>{formatCurrency(opportunity.offer.anchorOffer)}</strong>
          </div>
          <div className="kpi">
            <span>Recommended</span>
            <strong>{formatCurrency(opportunity.offer.recommendedOffer)}</strong>
          </div>
          <div className="kpi">
            <span>Walk-away</span>
            <strong>{formatCurrency(opportunity.offer.walkAwayPrice)}</strong>
          </div>
          <div className="kpi">
            <span>Offer confidence</span>
            <strong>{opportunity.offer.offerConfidence}</strong>
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Reasons negativas</h3>
            <ul>
              {opportunity.visibility.suppressionReasons.concat(opportunity.decision.notes).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <ul>
            {opportunity.alerts.map((alert) => (
              <li key={alert.id}>{alert.message}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
