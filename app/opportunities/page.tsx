import { OpportunityFiltersForm } from "@/components/opportunity-filters";
import { OpportunityCard } from "@/components/opportunity-card";
import { SectionCard } from "@/components/ui/section-card";
import { applyOpportunityFilters, getOpportunitySourceId, parseOpportunityFilters } from "@/lib/opportunities/presentation";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rawSearchParams, evaluations, profiles] = await Promise.all([
    searchParams,
    opportunityService.listEvaluations(),
    opportunityService.listProfiles(),
  ]);
  const filters = parseOpportunityFilters(rawSearchParams);
  const opportunities = applyOpportunityFilters(evaluations, filters);
  const sourceOptions = [...new Set(evaluations.map(getOpportunitySourceId))].sort((left, right) => left.localeCompare(right));
  const profileOptions = profiles
    .map((profile) => ({
      value: profile.id,
      label: profile.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return (
    <SectionCard
      title="Oportunidades"
      subtitle="La pantalla principal para decidir rapido que comprar, por que conviene y que hacer ahora."
    >
      <OpportunityFiltersForm
        filters={filters}
        profileOptions={profileOptions}
        sourceOptions={sourceOptions}
        resultCount={opportunities.length}
        totalCount={evaluations.length}
      />

      {opportunities.length > 0 ? (
        <div className="list">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="m-0">No hay oportunidades para los filtros actuales. Prueba limpiar filtros o abrir la vista de ocultas.</p>
        </div>
      )}
    </SectionCard>
  );
}
