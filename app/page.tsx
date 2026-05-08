import Link from "next/link";
import { OpportunityCard } from "@/components/opportunity-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { getAlertHeadline, getAlertImportanceSummary, getAlertNextStep } from "@/lib/alerts/presentation";
import { alertService } from "@/lib/server/alert-service";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [opportunities, metrics, alerts, profiles] = await Promise.all([
    opportunityService.listOpportunities(),
    opportunityService.getMetrics(),
    alertService.listAlerts({ includeDismissed: false, take: 4 }),
    opportunityService.listProfiles(),
  ]);

  const top = opportunities.slice(0, 4);
  const buyNow = opportunities.filter((item) => item.offer.offerStrategy === "buy_now").slice(0, 3);
  const activeProfiles = profiles.filter((profile) => profile.status === "active").slice(0, 4);

  return (
    <div className="grid stack-gap-lg">
      <SectionCard
        title="Hoy"
        subtitle="Empieza por lo que podria comprarse ya, lo que cambio y las busquedas que tienes activas."
      >
        <div className="grid grid-3">
          <StatCard
            label="Para revisar ya"
            value={String(top.length)}
            hint={top.length > 0 ? "Oportunidades visibles con mejor prioridad." : "Todavia no hay oportunidades claras."}
          />
          <StatCard
            label="Comprables ahora"
            value={String(metrics.buyNowCount)}
            hint="Casos donde la recomendacion principal es mover ficha pronto."
          />
          <StatCard
            label="Cambios recientes"
            value={String(alerts.length)}
            hint="Alertas activas que pueden cambiar tu decision."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Que deberias revisar hoy"
        subtitle="La vista principal se centra en productos accionables, no en metricas internas."
      >
        {top.length > 0 ? (
          <div className="list">
            {top.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} compact />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="m-0">Todavia no hay oportunidades destacadas. Revisa Mis busquedas o espera la siguiente ingesta.</p>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-2">
        <SectionCard
          title="Cambios importantes"
          subtitle="Lo mas relevante que cambio desde la ultima revision."
        >
          {alerts.length > 0 ? (
            <div className="list">
              {alerts.map((alert) => (
                <article key={alert.id} className="mini-change-card">
                  <div className="split-row row-start">
                    <div>
                      <p className="section-kicker">Cambio</p>
                      <h3 className="mini-card-title">{getAlertHeadline(alert)}</h3>
                    </div>
                    <p className="muted compact-text">{new Date(alert.createdAt).toLocaleString("es-VE")}</p>
                  </div>
                  <p className="compact-text">{getAlertImportanceSummary(alert)}</p>
                  <p className="muted compact-text">{alert.listingTitle}</p>
                  <div className="cta-row">
                    <Link
                      href={{
                        pathname: "/opportunities/[opportunityId]",
                        query: { opportunityId: `${alert.listingRawId}:${alert.searchProfileId}` },
                      }}
                      className="button-link"
                    >
                      Revisar oportunidad
                    </Link>
                    <span className="helper-text">{getAlertNextStep(alert)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="m-0">No hay cambios activos ahora mismo.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Mis busquedas activas"
          subtitle="Accesos rapidos a las estrategias que hoy estan buscando por ti."
        >
          {activeProfiles.length > 0 ? (
            <div className="list">
              {activeProfiles.map((profile) => (
                <article key={profile.id} className="mini-search-card">
                  <div className="split-row row-start">
                    <div>
                      <h3 className="mini-card-title">{profile.name}</h3>
                      <p className="compact-text">{profile.description || "Busqueda activa sin descripcion adicional."}</p>
                    </div>
                    <span className="status-pill status-pill-good">Activa</span>
                  </div>
                  <div className="chips">
                    {profile.keywords.slice(0, 4).map((term) => (
                      <span key={term} className="chip">
                        {term}
                      </span>
                    ))}
                  </div>
                  <div className="cta-row">
                    <Link href={{ pathname: "/opportunities", query: { profile: profile.id } }} className="button-link">
                      Ver oportunidades
                    </Link>
                    <Link href="/profiles" className="button-link button-link-secondary">
                      Editar busqueda
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="m-0">No hay busquedas activas. Crea una en Mis busquedas para empezar a cazar oportunidades.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {buyNow.length > 0 ? (
        <SectionCard title="Podrias comprar ya" subtitle="Atajos a los casos con mayor urgencia de compra.">
          <div className="list">
            {buyNow.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} compact />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
