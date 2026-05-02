import { AlertsList } from "@/components/alerts-list";
import { AlertsFiltersForm } from "@/components/alerts-filters";
import { SectionCard } from "@/components/ui/section-card";
import { applyAlertFilters, parseAlertFilters } from "@/lib/alerts/presentation";
import { alertService } from "@/lib/server/alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rawSearchParams, allAlerts] = await Promise.all([
    searchParams,
    alertService.listAlerts({ includeDismissed: true, take: 200 }),
  ]);
  const filters = parseAlertFilters(rawSearchParams);
  const alerts = applyAlertFilters(allAlerts, filters);
  const profileOptions = [...new Map(allAlerts.map((alert) => [alert.searchProfileId, alert.profileName])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return (
    <SectionCard title="Alertas" subtitle="Cambios recientes en oportunidades persistidas.">
      <AlertsFiltersForm
        filters={filters}
        profileOptions={profileOptions}
        resultCount={alerts.length}
        totalCount={allAlerts.length}
      />
      <AlertsList alerts={alerts} emptyMessage="No hay alertas para los filtros actuales." />
    </SectionCard>
  );
}
