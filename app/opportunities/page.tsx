import { OpportunityCard } from "@/components/opportunity-card";
import { SectionCard } from "@/components/ui/section-card";
import { opportunityService } from "@/lib/server/opportunity-service";

export default async function OpportunitiesPage() {
  const opportunities = await opportunityService.listOpportunities();

  return (
    <SectionCard title="Oportunidades" subtitle="Vista de trabajo para priorizar compra, negociacion o descarte.">
      <div className="list">
        {opportunities.map((opportunity) => (
          <OpportunityCard key={opportunity.id} opportunity={opportunity} />
        ))}
      </div>
    </SectionCard>
  );
}
