import Link from "next/link";
import {
  formatOpportunitySourceLabel,
  OPPORTUNITY_DECISION_OPTIONS,
  OPPORTUNITY_SORT_OPTIONS,
  OPPORTUNITY_SPECIAL_ITEM_OPTIONS,
  OPPORTUNITY_VISIBLE_OPTIONS,
  OPPORTUNITY_VISIBILITY_OPTIONS,
  type OpportunityFilters,
} from "@/lib/opportunities/presentation";

interface Option {
  value: string;
  label: string;
}

export function OpportunityFiltersForm({
  filters,
  profileOptions,
  sourceOptions,
  resultCount,
  totalCount,
}: {
  filters: OpportunityFilters;
  profileOptions: Option[];
  sourceOptions: string[];
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="filters-panel">
      <form method="get" className="filter-form">
        <div className="results-toolbar">
          <p className="result-count m-0">
            {resultCount} resultado(s) de {totalCount}
          </p>
          <div className="control-actions">
            <button type="submit">Aplicar filtros</button>
            <Link href="/opportunities" className="button-link button-link-secondary">
              Limpiar filtros
            </Link>
          </div>
        </div>

        <div className="filter-grid filter-grid-wide">
          <label className="control-field control-field-wide">
            <span className="field-label">Buscar</span>
            <input
              className="control-input"
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Titulo, brand, model o perfil"
            />
          </label>

          <label className="control-field">
            <span className="field-label">Decision</span>
            <select className="control-input" name="decision" defaultValue={filters.decision}>
              {OPPORTUNITY_DECISION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Visibilidad</span>
            <select className="control-input" name="visibility" defaultValue={filters.visibilityLevel}>
              {OPPORTUNITY_VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Tipo especial</span>
            <select className="control-input" name="specialItemType" defaultValue={filters.specialItemType}>
              {OPPORTUNITY_SPECIAL_ITEM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Perfil</span>
            <select className="control-input" name="profile" defaultValue={filters.profile}>
              <option value="">Todos los perfiles</option>
              {profileOptions.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Source</span>
            <select className="control-input" name="source" defaultValue={filters.source}>
              <option value="">Todas las fuentes</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {formatOpportunitySourceLabel(source)}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">uiScore minimo</span>
            <input
              className="control-input"
              type="number"
              name="uiScoreMin"
              min="0"
              step="1"
              defaultValue={filters.uiScoreMin}
              placeholder="Ej. 70"
            />
          </label>

          <label className="control-field">
            <span className="field-label">uiScore maximo</span>
            <input
              className="control-input"
              type="number"
              name="uiScoreMax"
              min="0"
              step="1"
              defaultValue={filters.uiScoreMax}
              placeholder="Ej. 95"
            />
          </label>

          <label className="control-field">
            <span className="field-label">Visibles</span>
            <select className="control-input" name="visible" defaultValue={filters.visible}>
              {OPPORTUNITY_VISIBLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Orden</span>
            <select className="control-input" name="sort" defaultValue={filters.sort}>
              {OPPORTUNITY_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </div>
  );
}
