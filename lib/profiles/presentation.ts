import { formatCurrency, formatPercent, humanizeToken } from "@/lib/formatting";
import type { RiskTolerance, SearchProfile, SearchProfileStatus } from "@/lib/modules/contracts";

export type ProfileObjective = "buyer" | "reseller" | "explorer";

export interface ProfileDraft {
  id?: string;
  name: string;
  status: SearchProfileStatus;
  categoryHint: string;
  objective: ProfileObjective;
  strategyMode?: SearchProfile["strategyMode"];
  riskTolerance: RiskTolerance;
  strictMode: boolean;
  includePartsRepairs: boolean;
  includeIncompleteItems: boolean;
  includeAccessories: boolean;
  showLowConfidenceItems: boolean;
  keywords: string[];
  blockedTerms: string[];
  maxBudget?: number;
  minScore?: number;
  minConfidence?: number;
  minResaleMarginPct?: number;
  targetCategories: string[];
}

export interface ProfilePreset {
  id: string;
  label: string;
  description: string;
  draft: Partial<ProfileDraft>;
}

const EMPTY_TOKENS = new Set(["", "n/a", "na", "none", "null", "undefined", "not set"]);

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: "ram-desktop",
    label: "RAM desktop",
    description: "DDR4 para PC de escritorio, evitando ECC y lotes de servidor.",
    draft: {
      name: "RAM desktop DDR4",
      categoryHint: "desktop-memory",
      objective: "buyer",
      strategyMode: "buy_and_hold",
      riskTolerance: "low",
      strictMode: true,
      includePartsRepairs: false,
      includeIncompleteItems: false,
      includeAccessories: false,
      showLowConfidenceItems: false,
      keywords: ["ddr4", "32gb", "desktop", "udimm"],
      blockedTerms: ["ecc", "server", "registered", "for parts"],
      minScore: 72,
      minConfidence: 0.76,
    },
  },
  {
    id: "ram-sodimm",
    label: "RAM laptop / SODIMM",
    description: "Memoria SODIMM para laptops, con riesgo bajo y filtrado estricto.",
    draft: {
      name: "RAM laptop SODIMM",
      categoryHint: "laptop-memory",
      objective: "buyer",
      strategyMode: "buy_and_hold",
      riskTolerance: "low",
      strictMode: true,
      includePartsRepairs: false,
      includeIncompleteItems: false,
      includeAccessories: false,
      showLowConfidenceItems: false,
      keywords: ["ddr4", "sodimm", "16gb", "32gb", "laptop"],
      blockedTerms: ["desktop", "ecc", "server", "damaged"],
      minScore: 70,
      minConfidence: 0.76,
    },
  },
  {
    id: "gpu",
    label: "GPU",
    description: "Tarjetas graficas para reventa, tolerando algo mas de riesgo.",
    draft: {
      name: "GPU para reventa",
      categoryHint: "graphics-cards",
      objective: "reseller",
      strategyMode: "flip",
      riskTolerance: "medium",
      strictMode: false,
      includePartsRepairs: false,
      includeIncompleteItems: false,
      includeAccessories: true,
      showLowConfidenceItems: false,
      keywords: ["rtx", "gtx", "radeon", "graphics card", "gpu"],
      blockedTerms: ["mining", "for parts", "artifact", "no display"],
      minScore: 68,
      minConfidence: 0.72,
      minResaleMarginPct: 15,
    },
  },
  {
    id: "console",
    label: "Consola",
    description: "Consolas y handhelds con mercado amplio y filtro moderado.",
    draft: {
      name: "Consolas y handhelds",
      categoryHint: "gaming-consoles",
      objective: "reseller",
      strategyMode: "flip",
      riskTolerance: "medium",
      strictMode: false,
      includePartsRepairs: false,
      includeIncompleteItems: true,
      includeAccessories: false,
      showLowConfidenceItems: false,
      keywords: ["nintendo switch", "ps5", "xbox series", "steam deck", "ps vita"],
      blockedTerms: ["account only", "banned", "for parts", "empty box"],
      minScore: 67,
      minConfidence: 0.72,
      minResaleMarginPct: 14,
    },
  },
  {
    id: "smartphone",
    label: "Smartphone",
    description: "Telefonos con foco en equipos funcionales y comparables claros.",
    draft: {
      name: "Smartphones funcionales",
      categoryHint: "smartphones",
      objective: "buyer",
      strategyMode: "buy_and_hold",
      riskTolerance: "medium",
      strictMode: true,
      includePartsRepairs: false,
      includeIncompleteItems: false,
      includeAccessories: false,
      showLowConfidenceItems: false,
      keywords: ["iphone", "galaxy", "pixel", "unlocked"],
      blockedTerms: ["icloud locked", "bad esn", "cracked", "for parts"],
      minScore: 74,
      minConfidence: 0.8,
    },
  },
];

export function normalizeProfileTerms(value: string | string[] | null | undefined): string[] {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,;]+/g) : [];
  const deduped = new Set<string>();

  for (const item of rawValues) {
    const normalized = item.trim().replace(/\s+/g, " ");
    if (!normalized || EMPTY_TOKENS.has(normalized.toLowerCase())) {
      continue;
    }

    deduped.add(normalized);
  }

  return [...deduped];
}

export function serializeProfileTerms(values: string[]): string {
  return normalizeProfileTerms(values).join("\n");
}

function normalizeOptionalNumber(value: number | null | undefined): number | undefined {
  return value === null || value === undefined || Number.isNaN(value) ? undefined : value;
}

export function getProfileObjective(profile: {
  objective?: ProfileObjective;
  strategyMode?: SearchProfile["strategyMode"];
}): ProfileObjective {
  if (profile.objective) {
    return profile.objective;
  }

  if (profile.strategyMode === "buy_and_hold") {
    return "buyer";
  }

  if (profile.strategyMode === "flip" || profile.strategyMode === "arbitrage" || profile.strategyMode === "clearance") {
    return "reseller";
  }

  return "explorer";
}

export function getStrategyModeForObjective(objective: ProfileObjective): NonNullable<SearchProfile["strategyMode"]> {
  if (objective === "buyer") {
    return "buy_and_hold";
  }

  if (objective === "reseller") {
    return "flip";
  }

  return "custom";
}

function pickMeaningfulCategory(categoryHint: string | null | undefined, targetCategories: string[] | null | undefined): string {
  if (categoryHint?.trim()) {
    return categoryHint.trim();
  }

  const fallback = (targetCategories ?? []).find((value) => value && value !== "uncategorized");
  return fallback ?? "";
}

export function createProfileDraft(profile?: Partial<SearchProfile> | null): ProfileDraft {
  const keywords = normalizeProfileTerms(profile?.keywords);
  const blockedTerms = normalizeProfileTerms(profile?.blockedTerms);
  const categoryHint = pickMeaningfulCategory(profile?.categoryHint, profile?.targetCategories);
  const objective = getProfileObjective({
    objective: undefined,
    strategyMode: profile?.strategyMode,
  });

  return {
    id: profile?.id,
    name: profile?.name?.trim() ?? "",
    status: profile?.status ?? "active",
    categoryHint,
    objective,
    strategyMode: profile?.strategyMode ?? getStrategyModeForObjective(objective),
    riskTolerance: profile?.riskTolerance ?? "medium",
    strictMode: profile?.strictMode ?? false,
    includePartsRepairs: profile?.includePartsRepairs ?? false,
    includeIncompleteItems: profile?.includeIncompleteItems ?? false,
    includeAccessories: profile?.includeAccessories ?? false,
    showLowConfidenceItems: profile?.showLowConfidenceItems ?? false,
    keywords,
    blockedTerms,
    maxBudget: normalizeOptionalNumber(profile?.maxBudget),
    minScore: normalizeOptionalNumber(profile?.minScore),
    minConfidence: normalizeOptionalNumber(profile?.minConfidence),
    minResaleMarginPct: normalizeOptionalNumber(profile?.minResaleMarginPct),
    targetCategories: normalizeProfileTerms(profile?.targetCategories).filter((value) => value !== "uncategorized"),
  };
}

export function applyPresetToDraft(presetId: string, baseDraft?: ProfileDraft): ProfileDraft {
  const preset = PROFILE_PRESETS.find((item) => item.id === presetId);
  const draft = baseDraft ?? createProfileDraft();

  if (!preset) {
    return draft;
  }

  const merged = {
    ...draft,
    ...preset.draft,
  };

  return {
    ...merged,
    keywords: normalizeProfileTerms(preset.draft.keywords ?? draft.keywords),
    blockedTerms: normalizeProfileTerms(preset.draft.blockedTerms ?? draft.blockedTerms),
    targetCategories: normalizeProfileTerms(
      preset.draft.targetCategories ?? [preset.draft.categoryHint ?? draft.categoryHint].filter(Boolean),
    ),
    strategyMode: preset.draft.strategyMode ?? getStrategyModeForObjective(merged.objective),
  };
}

function summarizeTerms(values: string[], fallback: string): string {
  if (values.length === 0) {
    return fallback;
  }

  if (values.length === 1) {
    return values[0]!;
  }

  if (values.length === 2) {
    return `${values[0]} y ${values[1]}`;
  }

  return `${values.slice(0, 2).join(", ")} y ${values.length - 2} mas`;
}

export function getProfileShortIntent(profile: Partial<ProfileDraft | SearchProfile>): string {
  const keywords = normalizeProfileTerms("keywords" in profile ? profile.keywords : []);
  const categoryHint = "categoryHint" in profile ? profile.categoryHint : undefined;
  const categoryText = categoryHint?.trim() ? ` para ${humanizeToken(categoryHint)}` : "";

  if (keywords.length > 0) {
    return `${summarizeTerms(keywords, "productos")}${categoryText}`;
  }

  if (categoryHint?.trim()) {
    return `${humanizeToken(categoryHint)}${categoryText ? "" : ""}`;
  }

  return "productos sin terminos definidos";
}

export function buildProfileSummary(profile: Partial<ProfileDraft | SearchProfile>): string {
  const keywords = normalizeProfileTerms("keywords" in profile ? profile.keywords : []);
  const blockedTerms = normalizeProfileTerms("blockedTerms" in profile ? profile.blockedTerms : []);
  const objective = getProfileObjective({
    objective: "objective" in profile ? profile.objective : undefined,
    strategyMode: "strategyMode" in profile ? profile.strategyMode : undefined,
  });
  const riskTolerance = "riskTolerance" in profile ? profile.riskTolerance : undefined;
  const categoryHint = "categoryHint" in profile ? profile.categoryHint : undefined;
  const strictMode = "strictMode" in profile ? profile.strictMode : undefined;
  const maxBudget = "maxBudget" in profile ? normalizeOptionalNumber(profile.maxBudget) : undefined;

  const segments = [`Busca ${getProfileShortIntent({ keywords, categoryHint })}`];

  if (blockedTerms.length > 0) {
    segments.push(`excluye ${summarizeTerms(blockedTerms, "terminos no definidos")}`);
  }

  segments.push(`modo ${getProfileObjectiveLabel(objective)}`);

  if (riskTolerance) {
    segments.push(`riesgo ${getRiskToleranceLabel(riskTolerance)}`);
  }

  if (strictMode) {
    segments.push("filtrado estricto");
  }

  if (maxBudget !== undefined) {
    segments.push(`presupuesto maximo ${formatCurrency(maxBudget)}`);
  }

  return `${segments.join(", ")}.`;
}

export function buildProfilePreview(profile: Partial<ProfileDraft | SearchProfile>): string[] {
  const lines = [buildProfileSummary(profile)];
  const keywords = normalizeProfileTerms("keywords" in profile ? profile.keywords : []);
  const blockedTerms = normalizeProfileTerms("blockedTerms" in profile ? profile.blockedTerms : []);

  lines.push(
    keywords.length > 0
      ? `Buscara terminos como ${summarizeTerms(keywords, "productos varios")}.`
      : "Todavia no hay terminos concretos de busqueda.",
  );

  lines.push(
    blockedTerms.length > 0
      ? `Descartara anuncios con ${summarizeTerms(blockedTerms, "terminos no definidos")}.`
      : "No hay exclusiones definidas todavia.",
  );

  const filters: string[] = [];
  if ("includePartsRepairs" in profile && profile.includePartsRepairs) filters.push("incluye parts/repairs");
  if ("includeIncompleteItems" in profile && profile.includeIncompleteItems) filters.push("incluye incompletos");
  if ("includeAccessories" in profile && profile.includeAccessories) filters.push("incluye accesorios");
  if ("showLowConfidenceItems" in profile && profile.showLowConfidenceItems) filters.push("muestra coincidencias dudosas");

  lines.push(filters.length > 0 ? `Filtros especiales: ${filters.join(", ")}.` : "Filtros especiales: solo coincidencias mas limpias.");

  return lines;
}

export function getProfileObjectiveLabel(objective: ProfileObjective): string {
  if (objective === "buyer") {
    return "comprador";
  }

  if (objective === "reseller") {
    return "reventa";
  }

  return "exploracion";
}

export function getRiskToleranceLabel(value: RiskTolerance): string {
  if (value === "low") {
    return "bajo";
  }

  if (value === "high") {
    return "alto";
  }

  return "medio";
}

export function getProfileStatusLabel(status: SearchProfileStatus): string {
  return status === "active" ? "Activo" : "Inactivo";
}

export function getProfileStatusDetail(status: SearchProfileStatus): string {
  return status === "active" ? "Recibiendo evaluaciones nuevas." : `Estado actual: ${humanizeToken(status)}.`;
}

export function buildAdvancedProfileNotes(profile: Partial<ProfileDraft | SearchProfile>): string[] {
  const notes: string[] = [];

  if ("minScore" in profile) {
    notes.push(`Score minimo: ${profile.minScore ?? "not set"}`);
  }

  if ("minConfidence" in profile) {
    notes.push(`Confianza minima: ${profile.minConfidence !== undefined ? formatPercent(profile.minConfidence) : "not set"}`);
  }

  if ("minResaleMarginPct" in profile) {
    notes.push(
      `Margen minimo de reventa: ${
        profile.minResaleMarginPct !== undefined ? formatPercent(profile.minResaleMarginPct, "whole") : "not set"
      }`,
    );
  }

  if ("targetCategories" in profile) {
    notes.push(`Categorias objetivo: ${normalizeProfileTerms(profile.targetCategories).join(", ") || "not set"}`);
  }

  return notes;
}
