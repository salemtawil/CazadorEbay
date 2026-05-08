"use client";

import { useEffect, useState, useTransition } from "react";
import {
  PROFILE_PRESETS,
  applyPresetToDraft,
  buildAdvancedProfileNotes,
  buildProfilePreview,
  createProfileDraft,
  getProfileObjectiveLabel,
  getRiskToleranceLabel,
  getStrategyModeForObjective,
  serializeProfileTerms,
  type ProfileDraft,
} from "@/lib/profiles/presentation";
import { ProfileTermInput } from "@/components/profiles/profile-term-input";

type EditorMode = "simple" | "advanced";

async function submitProfile(method: "POST" | "PATCH", path: string, payload: ProfileDraft) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? `Request failed with status ${response.status}`);
  }
}

function parseNumberInput(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFormTitle(draft: ProfileDraft): string {
  return draft.id ? `Editar ${draft.name || "perfil"}` : "Crear perfil";
}

export function ProfileEditor({
  profile,
  onCancel,
  onSaved,
}: {
  profile?: ProfileDraft | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(profile ?? createProfileDraft());
  const [mode, setMode] = useState<EditorMode>("simple");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(profile ?? createProfileDraft());
    setMode("simple");
    setErrorMessage(null);
  }, [profile]);

  const previewLines = buildProfilePreview(draft);
  const advancedNotes = buildAdvancedProfileNotes(draft);

  function updateDraft(patch: Partial<ProfileDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.objective && !patch.strategyMode) {
        next.strategyMode = getStrategyModeForObjective(patch.objective);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await submitProfile(draft.id ? "PATCH" : "POST", draft.id ? `/api/profiles/${draft.id}` : "/api/profiles", draft);
        onSaved();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
      }
    });
  }

  return (
    <section className="profile-editor">
      <div className="split-row">
        <div>
          <p className="eyebrow">Editor</p>
          <h3 className="panel-title">{buildFormTitle(draft)}</h3>
          <p className="muted compact-text">
            Modo {mode === "simple" ? "simple" : "avanzado"} para configurar terminos, riesgo y filtros sin tocar el dominio.
          </p>
        </div>
        <div className="mode-toggle">
          <button type="button" className={mode === "simple" ? "is-active" : ""} onClick={() => setMode("simple")}>
            Modo simple
          </button>
          <button type="button" className={mode === "advanced" ? "is-active" : ""} onClick={() => setMode("advanced")}>
            Modo avanzado
          </button>
        </div>
      </div>

      {!draft.id ? (
        <div className="preset-strip">
          {PROFILE_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className="preset-card"
              onClick={() => updateDraft(applyPresetToDraft(preset.id, draft))}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      ) : null}

      <form className="profile-editor-form" onSubmit={handleSubmit}>
        <div className="profile-editor-layout">
          <div className="section-stack">
            <section className="field-card field-card-wide">
              <p className="section-kicker">Que buscas</p>
              <div className="field-grid">
                <label className="control-field control-field-wide">
                  <span className="field-label">Nombre del perfil</span>
                  <input
                    className="control-input"
                    type="text"
                    value={draft.name}
                    onChange={(event) => updateDraft({ name: event.target.value })}
                    placeholder="Ej. RAM desktop DDR4"
                  />
                </label>

                <label className="control-field">
                  <span className="field-label">Categoria o tipo de producto</span>
                  <input
                    className="control-input"
                    type="text"
                    value={draft.categoryHint}
                    onChange={(event) => updateDraft({ categoryHint: event.target.value })}
                    placeholder="Ej. desktop-memory"
                  />
                </label>

                <label className="control-field">
                  <span className="field-label">Objetivo</span>
                  <select
                    className="control-input"
                    value={draft.objective}
                    onChange={(event) => updateDraft({ objective: event.target.value as ProfileDraft["objective"] })}
                  >
                    <option value="buyer">buyer</option>
                    <option value="reseller">reseller</option>
                    <option value="explorer">explorer</option>
                  </select>
                </label>

                <label className="control-field">
                  <span className="field-label">Riesgo</span>
                  <select
                    className="control-input"
                    value={draft.riskTolerance}
                    onChange={(event) => updateDraft({ riskTolerance: event.target.value as ProfileDraft["riskTolerance"] })}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
              </div>

              <ProfileTermInput
                label="Terminos a buscar"
                placeholder="Escribe un termino y presiona Enter"
                value={draft.keywords}
                onChange={(keywords) => updateDraft({ keywords })}
              />
            </section>

            <section className="field-card field-card-wide">
              <p className="section-kicker">Que quieres excluir</p>
              <ProfileTermInput
                label="Terminos a excluir"
                placeholder="Ej. for parts, locked, cracked"
                value={draft.blockedTerms}
                onChange={(blockedTerms) => updateDraft({ blockedTerms })}
              />
            </section>

            <section className="field-card field-card-wide">
              <p className="section-kicker">Como quieres comprar</p>
              <div className="toggle-grid">
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={draft.strictMode}
                    onChange={(event) => updateDraft({ strictMode: event.target.checked })}
                  />
                  <span>Filtrado estricto</span>
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={draft.includePartsRepairs}
                    onChange={(event) => updateDraft({ includePartsRepairs: event.target.checked })}
                  />
                  <span>Incluir articulos para reparar</span>
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={draft.includeIncompleteItems}
                    onChange={(event) => updateDraft({ includeIncompleteItems: event.target.checked })}
                  />
                  <span>Incluir incompletos</span>
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={draft.includeAccessories}
                    onChange={(event) => updateDraft({ includeAccessories: event.target.checked })}
                  />
                  <span>Incluir accesorios</span>
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={draft.showLowConfidenceItems}
                    onChange={(event) => updateDraft({ showLowConfidenceItems: event.target.checked })}
                  />
                  <span>Mostrar coincidencias dudosas</span>
                </label>
              </div>
            </section>

            <section className="field-card field-card-wide">
              <p className="section-kicker">Limites y presupuesto</p>
              <div className="field-grid">
                <label className="control-field">
                  <span className="field-label">Presupuesto maximo</span>
                  <input
                    className="control-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.maxBudget ?? ""}
                    onChange={(event) => updateDraft({ maxBudget: parseNumberInput(event.target.value) })}
                    placeholder="Ej. 250"
                  />
                </label>

                <label className="control-field">
                  <span className="field-label">Score minimo</span>
                  <input
                    className="control-input"
                    type="number"
                    min="0"
                    step="1"
                    value={draft.minScore ?? ""}
                    onChange={(event) => updateDraft({ minScore: parseNumberInput(event.target.value) })}
                    placeholder="Ej. 70"
                  />
                </label>
              </div>
            </section>

            {mode === "advanced" ? (
              <section className="field-card field-card-wide">
                <p className="section-kicker">Opciones avanzadas</p>
                <div className="field-grid">
                  <label className="control-field">
                    <span className="field-label">Strategy mode</span>
                    <select
                      className="control-input"
                      value={draft.strategyMode ?? ""}
                      onChange={(event) => updateDraft({ strategyMode: event.target.value as ProfileDraft["strategyMode"] })}
                    >
                      <option value="flip">flip</option>
                      <option value="buy_and_hold">buy_and_hold</option>
                      <option value="arbitrage">arbitrage</option>
                      <option value="clearance">clearance</option>
                      <option value="custom">custom</option>
                    </select>
                  </label>

                  <label className="control-field">
                    <span className="field-label">Status</span>
                    <select
                      className="control-input"
                      value={draft.status}
                      onChange={(event) => updateDraft({ status: event.target.value as ProfileDraft["status"] })}
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="draft">draft</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>

                  <label className="control-field">
                    <span className="field-label">Min confidence</span>
                    <input
                      className="control-input"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={draft.minConfidence ?? ""}
                      onChange={(event) => updateDraft({ minConfidence: parseNumberInput(event.target.value) })}
                      placeholder="Ej. 0.75"
                    />
                  </label>

                  <label className="control-field">
                    <span className="field-label">Min resale margin pct</span>
                    <input
                      className="control-input"
                      type="number"
                      min="0"
                      step="1"
                      value={draft.minResaleMarginPct ?? ""}
                      onChange={(event) => updateDraft({ minResaleMarginPct: parseNumberInput(event.target.value) })}
                      placeholder="Ej. 15"
                    />
                  </label>

                  <label className="control-field control-field-wide">
                    <span className="field-label">Target categories raw</span>
                    <textarea
                      className="control-input control-textarea"
                      value={draft.targetCategories.join("\n")}
                      onChange={(event) => updateDraft({ targetCategories: event.target.value.split(/\n+/g).map((item) => item.trim()).filter(Boolean) })}
                      placeholder="Una categoria por linea"
                    />
                  </label>

                  <label className="control-field control-field-wide">
                    <span className="field-label">Search terms raw</span>
                    <textarea
                      className="control-input control-textarea"
                      value={serializeProfileTerms(draft.keywords)}
                      onChange={(event) => updateDraft({ keywords: event.target.value.split(/\n+/g).map((item) => item.trim()).filter(Boolean) })}
                    />
                  </label>

                  <label className="control-field control-field-wide">
                    <span className="field-label">Excluded terms raw</span>
                    <textarea
                      className="control-input control-textarea"
                      value={serializeProfileTerms(draft.blockedTerms)}
                      onChange={(event) => updateDraft({ blockedTerms: event.target.value.split(/\n+/g).map((item) => item.trim()).filter(Boolean) })}
                    />
                  </label>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="profile-preview">
            <div className="field-card field-card-wide">
              <p className="section-kicker">Vista previa</p>
              <div className="section-stack">
                {previewLines.map((line) => (
                  <p key={line} className="compact-text">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="field-card field-card-wide">
              <p className="section-kicker">Lectura rapida</p>
              <div className="chips">
                <span className="chip">Objetivo: {getProfileObjectiveLabel(draft.objective)}</span>
                <span className="chip">Riesgo: {getRiskToleranceLabel(draft.riskTolerance)}</span>
                <span className="chip">Strategy: {draft.strategyMode ?? "not set"}</span>
              </div>
            </div>

            {mode === "advanced" ? (
              <div className="field-card field-card-wide">
                <p className="section-kicker">Estado crudo</p>
                <div className="section-stack">
                  {advancedNotes.map((note) => (
                    <p key={note} className="muted compact-text">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="cta-row">
          <button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : draft.id ? "Guardar cambios" : "Crear perfil"}
          </button>
          <button type="button" disabled={isPending} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
