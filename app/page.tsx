import { OpportunityCard } from "@/components/opportunity-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const opportunities = await opportunityService.listOpportunities();
  const metrics = await opportunityService.getMetrics();
  const top = opportunities.slice(0, 4);

  return (
    <div className="grid stack-gap-lg">
      <div className="grid grid-4">
        <StatCard label="Perfiles activos" value={String(metrics.activeProfiles)} hint="Tres verticales concretas." />
        <StatCard label="Listings evaluados" value={String(metrics.evaluatedListings)} hint="Pipeline evaluado desde el catalogo activo." />
        <StatCard label="Compras inmediatas" value={String(metrics.buyNowCount)} hint="Casos con mejor combinacion de score y margen." />
        <StatCard label="Margen medio" value={`$${metrics.averageMargin}`} hint="Estimado neto antes de reacondicionar." />
      </div>

      <SectionCard title="Mejores oportunidades" subtitle="Rankeadas por score total y margen esperado.">
        {top.length > 0 ? (
          <div className="list">
            {top.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} compact />
            ))}
          </div>
        ) : (
          <p className="muted m-0">
            No hay oportunidades visibles con los datos disponibles.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
