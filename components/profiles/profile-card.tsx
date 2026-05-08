"use client";

import Link from "next/link";
import { useTransition } from "react";
import { buildProfileSummary, getProfileStatusDetail, getProfileStatusLabel } from "@/lib/profiles/presentation";
import { formatBooleanState, formatCount, formatCurrency, formatText, humanizeToken } from "@/lib/formatting";
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
          <span className="metric-label">Evaluaciones</span>
          <strong>{formatCount(evaluations)}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Visibles</span>
          <strong>{formatCount(visible)}</strong>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Budget</span>
          <strong>{formatCurrency(profile.maxBudget)}</strong>
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
          <span className="field-label">Strict</span>
          <strong className="field-value">{formatBooleanState(profile.strictMode)}</strong>
        </div>
        <div className="field-card">
          <span className="field-label">Min score</span>
          <strong className="field-value">{formatText(profile.minScore)}</strong>
        </div>
      </div>

      <div className="profile-flags">
        <span className="chip">Parts/repairs: {formatBooleanState(profile.includePartsRepairs)}</span>
        <span className="chip">Incompletos: {formatBooleanState(profile.includeIncompleteItems)}</span>
        <span className="chip">Accesorios: {formatBooleanState(profile.includeAccessories)}</span>
        <span className="chip">Low confidence: {formatBooleanState(profile.showLowConfidenceItems)}</span>
      </div>

      <div className="section-stack">
        <div>
          <p className="section-kicker">Busca</p>
          <div className="chips">
            {profile.keywords.length > 0 ? profile.keywords.map((term) => <span key={term} className="chip">{term}</span>) : <span className="chip">not set</span>}
          </div>
        </div>
        <div>
          <p className="section-kicker">Excluye</p>
          <div className="chips">
            {profile.blockedTerms.length > 0 ? profile.blockedTerms.map((term) => <span key={term} className="chip">{term}</span>) : <span className="chip">not set</span>}
          </div>
        </div>
      </div>

      <div className="cta-row">
        <button type="button" disabled={isPending} onClick={() => onEdit(profile)}>
          Editar
        </button>
        <button type="button" disabled={isPending} onClick={() => runAction(`/api/profiles/${profile.id}/toggle`)}>
          {profile.status === "active" ? "Desactivar" : "Activar"}
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
