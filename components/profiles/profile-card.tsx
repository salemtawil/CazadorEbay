"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  buildProfileSummary,
  getProfileObjective,
  getProfileObjectiveLabel,
  getProfileStatusDetail,
  getProfileStatusLabel,
  getRiskToleranceLabel,
} from "@/lib/profiles/presentation";
import { formatBooleanState, formatCount, formatCurrency } from "@/lib/formatting";
import type { SearchProfile } from "@/lib/modules/contracts";

interface ProfileCardData {
  profile: SearchProfile;
  evaluations: number;
  visible: number;
}

async function postAction(path: string) {
  const response = await fetch(path, {
    method: "POST",
  });

  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? `Request failed with status ${response.status}`);
  }
}

export function ProfileCard({
  item,
  onEdit,
  onChanged,
}: {
  item: ProfileCardData;
  onEdit: (profile: SearchProfile) => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { profile, evaluations, visible } = item;
  const objective = getProfileObjective(profile);

  function runAction(path: string) {
    startTransition(async () => {
      await postAction(path);
      onChanged();
    });
  }

  return (
    <article className="profile-summary-card">
      <div className="split-row">
        <div>
          <h3 className="panel-title">{profile.name}</h3>
          <p className="compact-text">{buildProfileSummary(profile)}</p>
        </div>
        <div className="profile-status-block">
          <span className={profile.status === "active" ? "status-pill status-pill-good" : "status-pill status-pill-muted"}>
            {getProfileStatusLabel(profile.status)}
          </span>
          <p className="muted compact-text">{getProfileStatusDetail(profile.status)}</p>
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-chip">
          <span className="metric-label">Coincidencias revisadas</span>
          <strong>{formatCount(evaluations)}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Visibles ahora</span>
          <strong>{formatCount(visible)}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Presupuesto</span>
          <strong>{formatCurrency(profile.maxBudget)}</strong>
        </div>
      </div>

      <div className="field-grid">
        <div className="field-card">
          <span className="field-label">Objetivo</span>
          <strong className="field-value">{getProfileObjectiveLabel(objective)}</strong>
        </div>
        <div className="field-card">
          <span className="field-label">Riesgo</span>
          <strong className="field-value">{getRiskToleranceLabel(profile.riskTolerance)}</strong>
        </div>
        <div className="field-card">
          <span className="field-label">Busqueda estricta</span>
          <strong className="field-value">{formatBooleanState(profile.strictMode)}</strong>
        </div>
        <div className="field-card">
          <span className="field-label">Minimo de prioridad</span>
          <strong className="field-value">{profile.minScore}</strong>
        </div>
      </div>

      <div className="profile-flags">
        <span className="chip">Para reparar: {formatBooleanState(profile.includePartsRepairs)}</span>
        <span className="chip">Incompletos: {formatBooleanState(profile.includeIncompleteItems)}</span>
        <span className="chip">Accesorios: {formatBooleanState(profile.includeAccessories)}</span>
        <span className="chip">Coincidencias dudosas: {formatBooleanState(profile.showLowConfidenceItems)}</span>
      </div>

      <div className="section-stack">
        <div>
          <p className="section-kicker">Que estas cazando</p>
          <div className="chips">
            {profile.keywords.length > 0 ? profile.keywords.map((term) => <span key={term} className="chip">{term}</span>) : <span className="chip">Sin terminos</span>}
          </div>
        </div>
        <div>
          <p className="section-kicker">Que quieres evitar</p>
          <div className="chips">
            {profile.blockedTerms.length > 0 ? profile.blockedTerms.map((term) => <span key={term} className="chip">{term}</span>) : <span className="chip">Sin exclusiones</span>}
          </div>
        </div>
      </div>

      <div className="cta-row">
        <button type="button" disabled={isPending} onClick={() => onEdit(profile)}>
          Editar
        </button>
        <button type="button" disabled={isPending} onClick={() => runAction(`/api/profiles/${profile.id}/toggle`)}>
          {profile.status === "active" ? "Pausar" : "Activar"}
        </button>
        <button type="button" disabled={isPending} onClick={() => runAction(`/api/profiles/${profile.id}/duplicate`)}>
          Duplicar
        </button>
        <Link
          href={{
            pathname: "/opportunities",
            query: { profile: profile.id },
          }}
          className="button-link button-link-secondary"
        >
          Ver oportunidades
        </Link>
      </div>
    </article>
  );
}
