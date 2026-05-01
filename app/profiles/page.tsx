import { SectionCard } from "@/components/ui/section-card";
import { formatBooleanState, formatCount, formatCurrency, formatPercent, formatText, humanizeToken } from "@/lib/formatting";
import { opportunityService } from "@/lib/server/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatProfileStatus(status: string): string {
  return status === "active" ? "Activo" : `Inactivo (${humanizeToken(status)})`;
}

function dedupe(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function renderChipList(values: string[], emptyLabel: string) {
  if (values.length === 0) {
    return <p className="muted compact-text">{emptyLabel}</p>;
  }

  return (
    <div className="chips">
      {values.map((value) => (
        <span className="chip" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

export default async function ProfilesPage() {
  const [profiles, evaluations] = await Promise.all([opportunityService.listProfiles(), opportunityService.listEvaluations()]);
  const totalsByProfile = new Map<string, { evaluations: number; visible: number }>();

  for (const evaluation of evaluations) {
    const previous = totalsByProfile.get(evaluation.profile.id) ?? { evaluations: 0, visible: 0 };
    previous.evaluations += 1;
    if (evaluation.visibility.isVisible) {
      previous.visible += 1;
    }
    totalsByProfile.set(evaluation.profile.id, previous);
  }

  return (
    <SectionCard
      title="Perfiles"
      subtitle="Configuracion operativa de cada SearchProfile para revisar filtros, tolerancias y cobertura actual."
    >
      {profiles.length > 0 ? (
        <div className="panel-grid">
          {profiles.map((profile) => {
            const totals = totalsByProfile.get(profile.id) ?? { evaluations: 0, visible: 0 };
            const categoryValues = dedupe([profile.categoryHint, ...profile.targetCategories]);

            return (
              <article className="panel-card" key={profile.id}>
                <div className="split-row">
                  <div>
                    <h3 className="panel-title">{profile.name}</h3>
                    <p className="muted compact-text">{profile.description || "not set"}</p>
                  </div>
                  <span className={profile.status === "active" ? "status-pill status-pill-good" : "status-pill status-pill-muted"}>
                    {formatProfileStatus(profile.status)}
                  </span>
                </div>

                <div className="metric-strip">
                  <div className="metric-chip">
                    <span className="metric-label">Evaluaciones</span>
                    <strong>{formatCount(totals.evaluations)}</strong>
                  </div>
                  <div className="metric-chip">
                    <span className="metric-label">Visibles</span>
                    <strong>{formatCount(totals.visible)}</strong>
                  </div>
                  <div className="metric-chip">
                    <span className="metric-label">Threshold</span>
                    <strong>{formatText(profile.minScore)}</strong>
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field-card">
                    <span className="field-label">Strategy mode</span>
                    <strong className="field-value">{humanizeToken(profile.strategyMode)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Risk tolerance</span>
                    <strong className="field-value">{humanizeToken(profile.riskTolerance)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Strict mode</span>
                    <strong className="field-value">{formatBooleanState(profile.strictMode)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Parts / repairs</span>
                    <strong className="field-value">{formatBooleanState(profile.includePartsRepairs)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Incomplete items</span>
                    <strong className="field-value">{formatBooleanState(profile.includeIncompleteItems)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Accessories</span>
                    <strong className="field-value">{formatBooleanState(profile.includeAccessories)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Low confidence</span>
                    <strong className="field-value">{formatBooleanState(profile.showLowConfidenceItems)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Min confidence</span>
                    <strong className="field-value">{formatPercent(profile.minConfidence)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Max budget</span>
                    <strong className="field-value">{formatCurrency(profile.maxBudget)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Min resale margin</span>
                    <strong className="field-value">{formatPercent(profile.minResaleMarginPct, "whole")}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Category hint</span>
                    <strong className="field-value">{formatText(profile.categoryHint)}</strong>
                  </div>
                  <div className="field-card">
                    <span className="field-label">Target categories</span>
                    <strong className="field-value">{categoryValues.length > 0 ? categoryValues.join(", ") : "not set"}</strong>
                  </div>
                </div>

                <div className="section-stack">
                  <div>
                    <p className="section-kicker">Search terms</p>
                    {renderChipList(profile.keywords, "not set")}
                  </div>
                  <div>
                    <p className="section-kicker">Excluded terms</p>
                    {renderChipList(profile.blockedTerms, "not set")}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p className="m-0">No hay SearchProfile cargados todavia.</p>
        </div>
      )}
    </SectionCard>
  );
}
