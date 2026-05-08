import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createProfileDraft, getStrategyModeForObjective, normalizeProfileTerms, type ProfileDraft } from "@/lib/profiles/presentation";
import { mapProfileRowToDomain } from "@/lib/server/prisma-domain-mappers";

function mapStrategyMode(value: NonNullable<ProfileDraft["strategyMode"]>) {
  if (value === "buy_and_hold") {
    return "BUY_AND_HOLD" as const;
  }

  if (value === "arbitrage") {
    return "ARBITRAGE" as const;
  }

  if (value === "clearance") {
    return "CLEARANCE" as const;
  }

  if (value === "custom") {
    return "CUSTOM" as const;
  }

  return "FLIP" as const;
}

function mapRiskTolerance(value: ProfileDraft["riskTolerance"]) {
  return value.toUpperCase() as "LOW" | "MEDIUM" | "HIGH";
}

function mapStatus(value: ProfileDraft["status"]) {
  return value.toUpperCase() as "ACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED";
}

function normalizeOptionalNumber(value: number | undefined): Prisma.Decimal | null {
  return value === undefined || Number.isNaN(value) ? null : new Prisma.Decimal(value);
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function parseStatus(value: unknown): ProfileDraft["status"] {
  if (value === "draft" || value === "paused" || value === "archived") {
    return value;
  }

  return "active";
}

function parseRiskTolerance(value: unknown): ProfileDraft["riskTolerance"] {
  if (value === "low" || value === "high") {
    return value;
  }

  return "medium";
}

function parseStrategyMode(value: unknown): ProfileDraft["strategyMode"] {
  if (value === "flip" || value === "buy_and_hold" || value === "arbitrage" || value === "clearance" || value === "custom") {
    return value;
  }

  return undefined;
}

function parseObjective(value: unknown): ProfileDraft["objective"] {
  if (value === "buyer" || value === "reseller" || value === "explorer") {
    return value;
  }

  return "explorer";
}

function revalidateProfiles() {
  revalidatePath("/profiles");
  revalidatePath("/opportunities");
}

async function requireDefaultUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!user) {
    throw new Error("No users available to own the new profile.");
  }

  return user.id;
}

function validateDraft(draft: ProfileDraft) {
  if (!draft.name.trim()) {
    throw new Error("Profile name is required.");
  }

  if (draft.keywords.length === 0) {
    throw new Error("At least one search term is required.");
  }
}

export function parseProfileDraftPayload(payload: unknown): ProfileDraft {
  const raw = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const objective = parseObjective(raw.objective);
  const strategyMode = parseStrategyMode(raw.strategyMode) ?? getStrategyModeForObjective(objective);
  const draft = createProfileDraft();

  return {
    ...draft,
    id: typeof raw.id === "string" ? raw.id : undefined,
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    status: parseStatus(raw.status),
    categoryHint: typeof raw.categoryHint === "string" ? raw.categoryHint.trim() : "",
    objective,
    strategyMode,
    riskTolerance: parseRiskTolerance(raw.riskTolerance),
    strictMode: parseBoolean(raw.strictMode, draft.strictMode),
    includePartsRepairs: parseBoolean(raw.includePartsRepairs, draft.includePartsRepairs),
    includeIncompleteItems: parseBoolean(raw.includeIncompleteItems, draft.includeIncompleteItems),
    includeAccessories: parseBoolean(raw.includeAccessories, draft.includeAccessories),
    showLowConfidenceItems: parseBoolean(raw.showLowConfidenceItems, draft.showLowConfidenceItems),
    keywords: normalizeProfileTerms(raw.keywords as string | string[] | null | undefined),
    blockedTerms: normalizeProfileTerms(raw.blockedTerms as string | string[] | null | undefined),
    maxBudget: parseOptionalNumber(raw.maxBudget),
    minScore: parseOptionalNumber(raw.minScore),
    minConfidence: parseOptionalNumber(raw.minConfidence),
    minResaleMarginPct: parseOptionalNumber(raw.minResaleMarginPct),
    targetCategories: normalizeProfileTerms(raw.targetCategories as string | string[] | null | undefined),
  };
}

function buildProfileMutationData(draft: ProfileDraft) {
  const categoryHint = draft.categoryHint.trim();
  const targetCategory = draft.targetCategories[0] ?? categoryHint;

  return {
    name: draft.name.trim(),
    strategyMode: mapStrategyMode(draft.strategyMode ?? getStrategyModeForObjective(draft.objective)),
    riskTolerance: mapRiskTolerance(draft.riskTolerance),
    strictMode: draft.strictMode,
    includePartsRepairs: draft.includePartsRepairs,
    includeIncompleteItems: draft.includeIncompleteItems,
    includeAccessories: draft.includeAccessories,
    showLowConfidenceItems: draft.showLowConfidenceItems,
    minScore: new Prisma.Decimal(draft.minScore ?? 60),
    minConfidence: new Prisma.Decimal(draft.minConfidence ?? 0.7),
    maxBudget: normalizeOptionalNumber(draft.maxBudget),
    minResaleMarginPct: normalizeOptionalNumber(draft.minResaleMarginPct),
    searchTerms: normalizeProfileTerms(draft.keywords),
    excludedTerms: normalizeProfileTerms(draft.blockedTerms),
    categoryHint: targetCategory || null,
    status: mapStatus(draft.status),
  };
}

async function buildDuplicatedName(userId: string, baseName: string): Promise<string> {
  const siblingNames = await prisma.searchProfile.findMany({
    where: { userId },
    select: { name: true },
  });
  const existing = new Set(siblingNames.map((item) => item.name));
  const seed = `${baseName} copy`;

  if (!existing.has(seed)) {
    return seed;
  }

  let index = 2;
  while (existing.has(`${seed} ${index}`)) {
    index += 1;
  }

  return `${seed} ${index}`;
}

export class ProfileManagementService {
  async create(payload: unknown) {
    const draft = parseProfileDraftPayload(payload);
    validateDraft(draft);
    const userId = await requireDefaultUserId();

    const created = await prisma.searchProfile.create({
      data: {
        userId,
        ...buildProfileMutationData(draft),
      },
    });

    revalidateProfiles();
    return mapProfileRowToDomain(created);
  }

  async update(profileId: string, payload: unknown) {
    const existing = await prisma.searchProfile.findUnique({
      where: { id: profileId },
    });

    if (!existing) {
      throw new Error("Profile not found.");
    }

    const draft = parseProfileDraftPayload(payload);
    validateDraft(draft);

    const updated = await prisma.searchProfile.update({
      where: { id: profileId },
      data: buildProfileMutationData(draft),
    });

    revalidateProfiles();
    return mapProfileRowToDomain(updated);
  }

  async toggle(profileId: string) {
    const existing = await prisma.searchProfile.findUnique({
      where: { id: profileId },
    });

    if (!existing) {
      throw new Error("Profile not found.");
    }

    const updated = await prisma.searchProfile.update({
      where: { id: profileId },
      data: {
        status: existing.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
      },
    });

    revalidateProfiles();
    return mapProfileRowToDomain(updated);
  }

  async duplicate(profileId: string) {
    const existing = await prisma.searchProfile.findUnique({
      where: { id: profileId },
    });

    if (!existing) {
      throw new Error("Profile not found.");
    }

    const duplicated = await prisma.searchProfile.create({
      data: {
        userId: existing.userId,
        name: await buildDuplicatedName(existing.userId, existing.name),
        strategyMode: existing.strategyMode,
        riskTolerance: existing.riskTolerance,
        strictMode: existing.strictMode,
        includePartsRepairs: existing.includePartsRepairs,
        includeIncompleteItems: existing.includeIncompleteItems,
        includeAccessories: existing.includeAccessories,
        showLowConfidenceItems: existing.showLowConfidenceItems,
        minScore: existing.minScore,
        minConfidence: existing.minConfidence,
        maxBudget: existing.maxBudget,
        minResaleMarginPct: existing.minResaleMarginPct,
        searchTerms: existing.searchTerms,
        excludedTerms: existing.excludedTerms,
        categoryHint: existing.categoryHint,
        status: "PAUSED",
      },
    });

    revalidateProfiles();
    return mapProfileRowToDomain(duplicated);
  }
}

export const profileManagementService = new ProfileManagementService();
