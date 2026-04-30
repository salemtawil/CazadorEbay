export function humanizeToken(value: string | null | undefined): string {
  if (!value) {
    return "not set";
  }

  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBooleanState(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "not set";
  }

  return value ? "Si" : "No";
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined, mode: "ratio" | "whole" = "ratio"): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "not set";
  }

  const normalizedValue = mode === "ratio" ? value : value / 100;
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: normalizedValue >= 1 ? 0 : 1,
  }).format(normalizedValue);
}

export function formatText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "not set";
  }

  return String(value);
}
