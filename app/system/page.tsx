import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { formatBooleanState, formatCount, formatDateTime } from "@/lib/formatting";
import { systemService } from "@/lib/server/system-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const status = await systemService.getStatus();

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="grid grid-4">
        <StatCard label="ListingRaw" value={formatCount(status.listingRawCount)} hint="Registros crudos persistidos." />
        <StatCard label="ListingNormalized" value={formatCount(status.listingNormalizedCount)} hint="Listings normalizados en DB." />
        <StatCard label="ListingEvaluation" value={formatCount(status.listingEvaluationCount)} hint="Evaluaciones persistidas." />
        <StatCard label="Alert" value={formatCount(status.alertCount)} hint="Alertas internas registradas." />
      </div>

      <SectionCard title="Actividad reciente" subtitle="Senales basicas para saber si la ingesta y las alertas se estan moviendo.">
        <div className="field-grid">
          <div className="field-card">
            <span className="field-label">Perfiles activos</span>
            <strong className="field-value">{formatCount(status.activeProfileCount)}</strong>
          </div>
          <div className="field-card">
            <span className="field-label">Ultima evaluacion</span>
            <strong className="field-value">{formatDateTime(status.latestEvaluationAt)}</strong>
          </div>
          <div className="field-card">
            <span className="field-label">Ultima alerta</span>
            <strong className="field-value">{formatDateTime(status.latestAlertAt)}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Configuracion del runtime" subtitle="Flags utiles para entender por que el sistema se comporta de cierta forma.">
        <div className="field-grid">
          <div className="field-card">
            <span className="field-label">USE_FIXTURE_DATA</span>
            <strong className="field-value">{formatBooleanState(status.useFixtureData)}</strong>
          </div>
          <div className="field-card">
            <span className="field-label">EBAY_ENABLED</span>
            <strong className="field-value">{formatBooleanState(status.ebayEnabled)}</strong>
          </div>
          <div className="field-card">
            <span className="field-label">CRON_SECRET configurado</span>
            <strong className="field-value">{formatBooleanState(status.cronSecretConfigured)}</strong>
          </div>
          <div className="field-card">
            <span className="field-label">DATABASE_URL disponible</span>
            <strong className="field-value">{formatBooleanState(status.databaseConfigured)}</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Lectura operativa" subtitle="Mensajes cortos para detectar falta de datos o configuracion inconsistente.">
        {status.messages.length > 0 ? (
          <div className="section-stack">
            {status.messages.map((message) => (
              <article
                className={message.level === "warning" ? "notice notice-warning" : "notice notice-info"}
                key={`${message.level}-${message.title}`}
              >
                <h3 className="notice-title">{message.title}</h3>
                <p className="compact-text">{message.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ margin: 0 }}>No hay observaciones operativas adicionales con los datos actuales.</p>
          </div>
        )}

        {!status.hasData ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            <p style={{ margin: 0 }}>La base esta vacia o el runtime no puede leer datos persistidos todavia.</p>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
