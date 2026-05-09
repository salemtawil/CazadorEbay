import { DiscoveryWorkspace } from "@/components/home/discovery-workspace";
import { alertService } from "@/lib/server/alert-service";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [opportunities, alerts, profiles] = await Promise.all([
    opportunityService.listOpportunities(),
    alertService.listAlerts({ includeDismissed: false, take: 40 }),
    opportunityService.listProfiles(),
  ]);

  return <DiscoveryWorkspace opportunities={opportunities} alerts={alerts} profiles={profiles} />;
}
