import { AlertsList } from "@/components/alerts-list";
import { SectionCard } from "@/components/ui/section-card";
import { alertService } from "@/lib/server/alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await alertService.listAlerts();

  return (
    <SectionCard title="Alertas" subtitle="Cambios recientes en oportunidades persistidas.">
      <AlertsList alerts={alerts} />
    </SectionCard>
  );
}
