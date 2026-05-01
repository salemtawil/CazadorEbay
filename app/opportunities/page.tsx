import { OpportunityCard } from "@/components/opportunity-card";
import { SectionCard } from "@/components/ui/section-card";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const opportunities = await opportunityService.listOpportunities();

  return (
    <SectionCard title="Oportunidades" subtitle="Vista de trabajo para priorizar compra, negociacion o descarte.">
      {opportunities.length > 0 ? (
        <div className="list">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <p className="muted m-0">
          No hay oportunidades visibles con el dataset actual.
        </p>
      )}
    </SectionCard>
  );
}
