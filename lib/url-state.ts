export type SearchParamsValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamsValue>;

export function getSearchParamValue(value: SearchParamsValue): string | undefined {
  if (Array.isArray(value)) {
    return getSearchParamValue(value[0]);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function readSearchParam(params: SearchParamsRecord, key: string): string | undefined {
  return getSearchParamValue(params[key]);
}

export function readNumericSearchParam(params: SearchParamsRecord, key: string): number | undefined {
  const rawValue = readSearchParam(params, key);

  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function setSearchParam(searchParams: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined) {
    return;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return;
  }

  searchParams.set(key, normalizedValue);
}
