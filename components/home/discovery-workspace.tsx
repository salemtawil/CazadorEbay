"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import type { InternalAlert, SearchProfile, EvaluationResult } from "@/lib/modules/contracts";
import { getOpportunityActionDecision, getOpportunityRiskLevel } from "@/lib/opportunities/presentation";
import { readSavedOpportunityIds, SAVED_OPPORTUNITIES_EVENT } from "@/lib/saved-opportunities";

type RiskFilter = "all" | "low" | "medium" | "high";
type OfferTab = "best" | "new" | "dropped" | "saved";

const QUICK_CATEGORIES = ["RAM", "GPU", "iPhone", "Nintendo Switch", "Relojes", "Camaras"];

function matchesText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function splitTerms(value: string): string[] {
  return value
    .split(/[,\n]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getOpportunitySearchText(opportunity: EvaluationResult): string {
  return [
    opportunity.listingRaw.title,
    opportunity.classification.brand,
    opportunity.classification.model,
    opportunity.profile.name,
  ]
    .join(" ")
    .toLowerCase();
}

function getActivityIds(alerts: InternalAlert[], types: InternalAlert["alertType"][]): Set<string> {
  return new Set(
    alerts
      .filter((alert) => types.includes(alert.alertType))
      .map((alert) => `${alert.listingRawId}:${alert.searchProfileId}`),
  );
}

export function DiscoveryWorkspace({
  opportunities,
  alerts,
  profiles,
}: {
  opportunities: EvaluationResult[];
  alerts: InternalAlert[];
  profiles: SearchProfile[];
}) {
  const [query, setQuery] = useState("");
  const [exclude, setExclude] = useState("");
  const [budget, setBudget] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [tab, setTab] = useState<OfferTab>("best");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    function syncSaved() {
      setSavedIds(readSavedOpportunityIds());
    }

    syncSaved();
    window.addEventListener(SAVED_OPPORTUNITIES_EVENT, syncSaved);
    window.addEventListener("storage", syncSaved);

    return () => {
      window.removeEventListener(SAVED_OPPORTUNITIES_EVENT, syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, []);

  const droppedIds = getActivityIds(alerts, ["PRICE_DROPPED"]);
  const newIds = getActivityIds(alerts, ["NEW_HIGH_SCORE_OPPORTUNITY", "NEW_LISTING_MATCHED_PROFILE"]);
  const budgetValue = budget.trim() ? Number(budget) : undefined;
  const excludeTerms = splitTerms(exclude);

  let filtered = opportunities.filter((opportunity) => {
    const haystack = getOpportunitySearchText(opportunity);
    if (query.trim() && !matchesText(haystack, query)) {
      return false;
    }

    if (excludeTerms.some((term) => haystack.includes(term))) {
      return false;
    }

    if (budgetValue !== undefined && Number.isFinite(budgetValue) && opportunity.listingNormalized.totalAcquisitionCost > budgetValue) {
      return false;
    }

    if (risk !== "all" && getOpportunityRiskLevel(opportunity) !== risk) {
      return false;
    }

    return true;
  });

  if (tab === "new") {
    filtered = filtered.filter((opportunity) => newIds.has(opportunity.id));
  } else if (tab === "dropped") {
    filtered = filtered.filter((opportunity) => droppedIds.has(opportunity.id));
  } else if (tab === "saved") {
    filtered = filtered.filter((opportunity) => savedIds.includes(opportunity.id));
  } else {
    filtered = [...filtered].sort((left, right) => {
      const leftDecision = getOpportunityActionDecision(left);
      const rightDecision = getOpportunityActionDecision(right);
      const leftWeight = leftDecision === "buy_now" ? 3 : leftDecision === "make_offer" ? 2 : 1;
      const rightWeight = rightDecision === "buy_now" ? 3 : rightDecision === "make_offer" ? 2 : 1;
      return rightWeight - leftWeight;
    });
  }

  const activeProfiles = profiles.filter((profile) => profile.status === "active");
  const strongCount = opportunities.filter((opportunity) => getOpportunityActionDecision(opportunity) === "buy_now").length;
  const saveSearchHref = {
    pathname: "/profiles",
    query: {
      q: query,
      exclude,
      budget,
      risk: risk === "all" ? "" : risk,
    },
  } as const;

  return (
    <section className="discovery-layout">
      <aside className="discovery-sidebar">
        <div className="discovery-panel">
          <p className="eyebrow">Inicio</p>
          <h2 className="section-card-title">Que quieres encontrar hoy?</h2>
          <p className="section-card-subtitle">
            Describe lo que quieres cazar y deja que la app te muestre las ofertas que merecen atencion.
          </p>

          <div className="filter-stack">
            <label className="control-field">
              <span className="field-label">Buscar</span>
              <input
                className="control-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. Nintendo Switch OLED"
              />
            </label>

            <label className="control-field">
              <span className="field-label">Excluir</span>
              <input
                className="control-input"
                type="text"
                value={exclude}
                onChange={(event) => setExclude(event.target.value)}
                placeholder="Ej. for parts, locked, broken"
              />
            </label>

            <label className="control-field">
              <span className="field-label">Presupuesto maximo</span>
              <input
                className="control-input"
                type="number"
                min="0"
                step="1"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Ej. 250"
              />
            </label>

            <div className="control-field">
              <span className="field-label">Riesgo</span>
              <div className="segmented-control">
                {[
                  { value: "all", label: "Todos" },
                  { value: "low", label: "Bajo" },
                  { value: "medium", label: "Medio" },
                  { value: "high", label: "Alto" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={risk === option.value ? "segmented-control-button is-active" : "segmented-control-button"}
                    onClick={() => setRisk(option.value as RiskFilter)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="section-kicker">Accesos rapidos</p>
            <div className="chips">
              {QUICK_CATEGORIES.map((category) => (
                <button key={category} type="button" className="chip-button" onClick={() => setQuery(category)}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="cta-row">
            <button type="button">Buscar ofertas</button>
            <Link href={saveSearchHref} className="button-link button-link-secondary">
              Guardar busqueda
            </Link>
          </div>
        </div>

        <div className="discovery-panel discovery-panel-muted">
          <p className="section-kicker">Busquedas activas</p>
          <div className="list">
            {activeProfiles.slice(0, 4).map((profile) => (
              <article key={profile.id} className="mini-search-card">
                <h3 className="mini-card-title">{profile.name}</h3>
                <p className="compact-text">{profile.description || "Busqueda activa lista para seguir encontrando."}</p>
                <Link href={{ pathname: "/opportunities", query: { profile: profile.id } }} className="button-link button-link-secondary">
                  Abrir ofertas
                </Link>
              </article>
            ))}
          </div>
        </div>
      </aside>

      <div className="discovery-main">
        <div className="discovery-panel">
          <div className="split-row row-start">
            <div>
              <p className="eyebrow">Ofertas</p>
              <h2 className="section-card-title">Ofertas que valen la pena</h2>
              <p className="section-card-subtitle">Empieza por las mejores y cambia de vista cuando quieras ver novedades o bajadas.</p>
            </div>
            <Link href="/alerts" className="button-link button-link-secondary">
              Ver actividad
            </Link>
          </div>

          <div className="activity-summary-grid">
            <div className="stat-card stat-card-inline">
              <p className="stat-card-label">Ofertas encontradas</p>
              <p className="stat-card-value">{filtered.length}</p>
            </div>
            <div className="stat-card stat-card-inline">
              <p className="stat-card-label">Muy buenas</p>
              <p className="stat-card-value">{strongCount}</p>
            </div>
            <div className="stat-card stat-card-inline">
              <p className="stat-card-label">Bajaron hoy</p>
              <p className="stat-card-value">{droppedIds.size}</p>
            </div>
          </div>

          <div className="tab-row">
            {[
              { value: "best", label: "Mejores" },
              { value: "new", label: "Nuevas" },
              { value: "dropped", label: "Bajaron" },
              { value: "saved", label: "Guardadas" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={tab === option.value ? "tab-button is-active" : "tab-button"}
                onClick={() => setTab(option.value as OfferTab)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="list">
            {filtered.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state-large">
            <p className="m-0">No hay ofertas para esta combinacion. Prueba otra busqueda, sube presupuesto o baja exigencia.</p>
          </div>
        )}
      </div>
    </section>
  );
}
