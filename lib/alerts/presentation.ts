import type { AlertSeverity, InternalAlert, InternalAlertType } from "@/lib/modules/contracts";
import { readSearchParam, setSearchParam, type SearchParamsRecord } from "@/lib/url-state";

export type AlertStateFilter = "active" | "unread" | "read" | "dismissed";
export type AlertSort = "newest" | "oldest" | "severity";

export interface AlertFilters {
  query: string;
  alertType: "all" | InternalAlertType;
  severity: "all" | AlertSeverity;
  state: AlertStateFilter;
  profile: string;
  sort: AlertSort;
}

const DEFAULT_ALERT_FILTERS: AlertFilters = {
  query: "",
  alertType: "all",
  severity: "all",
  state: "active",
  profile: "",
  sort: "newest",
};

const ALERT_TYPE_VALUES = new Set<AlertFilters["alertType"]>([
  "all",
  "NEW_HIGH_SCORE_OPPORTUNITY",
  "PRICE_DROPPED",
  "DECISION_UPGRADED_TO_BUY_NOW",
  "DECISION_UPGRADED_TO_MAKE_OFFER",
  "NEW_LISTING_MATCHED_PROFILE",
]);
const ALERT_SEVERITY_VALUES = new Set<AlertFilters["severity"]>(["all", "info", "warning", "critical"]);
const ALERT_STATE_VALUES = new Set<AlertStateFilter>(["active", "unread", "read", "dismissed"]);
const ALERT_SORT_VALUES = new Set<AlertSort>(["newest", "oldest", "severity"]);

export const ALERT_TYPE_OPTIONS: Array<{ value: AlertFilters["alertType"]; label: string }> = [
  { value: "all", label: "Todos los tipos" },
  { value: "NEW_HIGH_SCORE_OPPORTUNITY", label: "Nueva oportunidad fuerte" },
  { value: "PRICE_DROPPED", label: "Bajo de precio" },
  { value: "DECISION_UPGRADED_TO_BUY_NOW", label: "Paso a comprar ahora" },
  { value: "DECISION_UPGRADED_TO_MAKE_OFFER", label: "Paso a hacer oferta" },
  { value: "NEW_LISTING_MATCHED_PROFILE", label: "Nuevo listing para perfil" },
];

export const ALERT_SEVERITY_OPTIONS: Array<{ value: AlertFilters["severity"]; label: string }> = [
  { value: "all", label: "Todas las severidades" },
  { value: "critical", label: "Critica" },
  { value: "warning", label: "Advertencia" },
  { value: "info", label: "Informativa" },
];

export const ALERT_STATE_OPTIONS: Array<{ value: AlertStateFilter; label: string }> = [
  { value: "active", label: "Activas" },
  { value: "unread", label: "No leidas" },
  { value: "read", label: "Leidas" },
  { value: "dismissed", label: "Descartadas" },
];

export const ALERT_SORT_OPTIONS: Array<{ value: AlertSort; label: string }> = [
  { value: "newest", label: "Mas recientes" },
  { value: "oldest", label: "Mas antiguas" },
  { value: "severity", label: "Mayor severidad" },
];

function parseEnumValue<T extends string>(rawValue: string | undefined, allowedValues: Set<T>, fallback: T): T {
  return rawValue && allowedValues.has(rawValue as T) ? (rawValue as T) : fallback;
}

function getSeverityWeight(severity: AlertSeverity): number {
  if (severity === "critical") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}

export function parseAlertFilters(params: SearchParamsRecord): AlertFilters {
  return {
    query: readSearchParam(params, "q") ?? DEFAULT_ALERT_FILTERS.query,
    alertType: parseEnumValue(readSearchParam(params, "alertType"), ALERT_TYPE_VALUES, DEFAULT_ALERT_FILTERS.alertType),
    severity: parseEnumValue(readSearchParam(params, "severity"), ALERT_SEVERITY_VALUES, DEFAULT_ALERT_FILTERS.severity),
    state: parseEnumValue(readSearchParam(params, "state"), ALERT_STATE_VALUES, DEFAULT_ALERT_FILTERS.state),
    profile: readSearchParam(params, "profile") ?? DEFAULT_ALERT_FILTERS.profile,
    sort: parseEnumValue(readSearchParam(params, "sort"), ALERT_SORT_VALUES, DEFAULT_ALERT_FILTERS.sort),
  };
}

export function serializeAlertFilters(filters: AlertFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  setSearchParam(searchParams, "q", filters.query);
  if (filters.alertType !== DEFAULT_ALERT_FILTERS.alertType) {
    setSearchParam(searchParams, "alertType", filters.alertType);
  }
  if (filters.severity !== DEFAULT_ALERT_FILTERS.severity) {
    setSearchParam(searchParams, "severity", filters.severity);
  }
  if (filters.state !== DEFAULT_ALERT_FILTERS.state) {
    setSearchParam(searchParams, "state", filters.state);
  }
  setSearchParam(searchParams, "profile", filters.profile);
  if (filters.sort !== DEFAULT_ALERT_FILTERS.sort) {
    setSearchParam(searchParams, "sort", filters.sort);
  }

  return searchParams;
}

export function getAlertState(alert: InternalAlert): AlertStateFilter {
  if (alert.dismissedAt) {
    return "dismissed";
  }

  if (alert.readAt) {
    return "read";
  }

  return "unread";
}

export function getAlertStateLabel(state: AlertStateFilter): string {
  return ALERT_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;
}

export function getAlertTypeLabel(alertType: InternalAlertType): string {
  return ALERT_TYPE_OPTIONS.find((option) => option.value === alertType)?.label ?? alertType;
}

export function getAlertSeverityLabel(severity: AlertSeverity): string {
  return ALERT_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? severity;
}

export function getAlertOpportunityId(alert: InternalAlert): string {
  return `${alert.listingRawId}:${alert.searchProfileId}`;
}

export function filterAlerts(alerts: InternalAlert[], filters: AlertFilters): InternalAlert[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return alerts.filter((alert) => {
    const alertState = getAlertState(alert);
    const searchableText = [alert.title, alert.message, alert.listingTitle, alert.profileName].join(" ").toLowerCase();

    if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
      return false;
    }

    if (filters.alertType !== "all" && alert.alertType !== filters.alertType) {
      return false;
    }

    if (filters.severity !== "all" && alert.severity !== filters.severity) {
      return false;
    }

    if (filters.state === "active" && Boolean(alert.dismissedAt)) {
      return false;
    }

    if (filters.state === "read" && alertState !== "read") {
      return false;
    }

    if (filters.state === "unread" && alertState !== "unread") {
      return false;
    }

    if (filters.state === "dismissed" && alertState !== "dismissed") {
      return false;
    }

    if (filters.profile && alert.searchProfileId !== filters.profile) {
      return false;
    }

    return true;
  });
}

export function sortAlerts(alerts: InternalAlert[], sort: AlertSort): InternalAlert[] {
  return [...alerts].sort((left, right) => {
    if (sort === "oldest") {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    }

    if (sort === "severity") {
      const severityWeightDiff = getSeverityWeight(right.severity) - getSeverityWeight(left.severity);
      if (severityWeightDiff !== 0) {
        return severityWeightDiff;
      }
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function applyAlertFilters(alerts: InternalAlert[], filters: AlertFilters): InternalAlert[] {
  return sortAlerts(filterAlerts(alerts, filters), filters.sort);
}
