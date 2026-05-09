export const SAVED_OPPORTUNITIES_STORAGE_KEY = "cazador-ebay:saved-opportunities";
export const SAVED_OPPORTUNITIES_EVENT = "cazador-ebay:saved-opportunities-changed";

export function readSavedOpportunityIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(SAVED_OPPORTUNITIES_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function writeSavedOpportunityIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVED_OPPORTUNITIES_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new Event(SAVED_OPPORTUNITIES_EVENT));
}

export function toggleSavedOpportunity(opportunityId: string): boolean {
  const current = readSavedOpportunityIds();
  const isSaved = current.includes(opportunityId);
  const next = isSaved ? current.filter((id) => id !== opportunityId) : [...current, opportunityId];
  writeSavedOpportunityIds(next);
  return !isSaved;
}

export function isOpportunitySaved(opportunityId: string): boolean {
  return readSavedOpportunityIds().includes(opportunityId);
}
