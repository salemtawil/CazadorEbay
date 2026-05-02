import Link from "next/link";
import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_SORT_OPTIONS,
  ALERT_STATE_OPTIONS,
  ALERT_TYPE_OPTIONS,
  type AlertFilters,
} from "@/lib/alerts/presentation";

interface Option {
  value: string;
  label: string;
}

export function AlertsFiltersForm({
  filters,
  profileOptions,
  resultCount,
  totalCount,
}: {
  filters: AlertFilters;
  profileOptions: Option[];
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="filters-panel">
      <form method="get" className="filter-form">
        <div className="results-toolbar">
          <p className="result-count m-0">
            {resultCount} alerta(s) de {totalCount}
          </p>
          <div className="control-actions">
            <button type="submit">Aplicar filtros</button>
            <Link href="/alerts" className="button-link button-link-secondary">
              Limpiar filtros
            </Link>
          </div>
        </div>

        <div className="filter-grid">
          <label className="control-field control-field-wide">
            <span className="field-label">Buscar</span>
            <input
              className="control-input"
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Titulo, mensaje, listing o perfil"
            />
          </label>

          <label className="control-field">
            <span className="field-label">Tipo</span>
            <select className="control-input" name="alertType" defaultValue={filters.alertType}>
              {ALERT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Severidad</span>
            <select className="control-input" name="severity" defaultValue={filters.severity}>
              {ALERT_SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-field">
            <span className="field-label">Estado</span>
            <select className="control-input" name="state" defaultValue={filters.state}>
              {ALERT_STATE_OPTIONS.map((option) => (
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
            <span className="field-label">Orden</span>
            <select className="control-input" name="sort" defaultValue={filters.sort}>
              {ALERT_SORT_OPTIONS.map((option) => (
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
