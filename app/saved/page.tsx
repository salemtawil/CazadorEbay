import { SavedOpportunitiesView } from "@/components/saved-opportunities-view";
import { SectionCard } from "@/components/ui/section-card";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const opportunities = await opportunityService.listOpportunities();

  return (
    <SectionCard
      title="Guardadas"
      subtitle="Tu lista corta de ofertas interesantes para volver a revisar o abrir luego en eBay."
    >
      <SavedOpportunitiesView opportunities={opportunities} />
    </SectionCard>
  );
}
