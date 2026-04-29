import { opportunityService } from "@/lib/server/opportunity-service";
import { SectionCard } from "@/components/ui/section-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const profiles = await opportunityService.listProfiles();
  const evaluations = await opportunityService.listEvaluations();

  return (
    <SectionCard title="Search profiles" subtitle="Criterios operativos por vertical para iterar el pipeline.">
      {profiles.length > 0 ? (
        <div className="grid grid-3">
          {profiles.map((profile) => (
            <article key={profile.id} style={{ borderRadius: 24, border: "1px solid #e2e8f0", padding: 20, background: "#fcfdff" }}>
              <h3 style={{ marginTop: 0 }}>{profile.name}</h3>
              <p className="muted">{profile.description}</p>
              <div className="kpi">
                <span>Evaluaciones</span>
                <strong>{evaluations.filter((item) => item.profile.id === profile.id).length}</strong>
              </div>
              <div className="kpi">
                <span>Visibles</span>
                <strong>
                  {evaluations.filter((item) => item.profile.id === profile.id && item.visibility.isVisible).length}
                </strong>
              </div>
              <div className="kpi">
                <span>Strategy mode</span>
                <strong>{profile.strategyMode ?? "custom"}</strong>
              </div>
              <div className="kpi">
                <span>Risk tolerance</span>
                <strong>{profile.riskTolerance}</strong>
              </div>
              <div className="kpi">
                <span>UI threshold</span>
                <strong>{profile.minScore}</strong>
              </div>
              <div className="kpi">
                <span>Min confidence</span>
                <strong>{profile.minConfidence}</strong>
              </div>
              <div className="chips" style={{ marginTop: 16 }}>
                {profile.keywords.length > 0 ? (
                  profile.keywords.map((keyword) => (
                    <span className="chip" key={keyword}>
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="muted">Sin keywords configuradas.</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No hay perfiles cargados en el catalogo actual.
        </p>
      )}
    </SectionCard>
  );
}
