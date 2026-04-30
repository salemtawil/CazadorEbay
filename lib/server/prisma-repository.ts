import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  Alert,
  Classification,
  Decision,
  EvaluationResult,
  Listing,
  MarketSnapshot,
  OpportunityCatalog,
  ScoreBreakdown,
  SearchProfile,
  User,
  VisibilityAssessment,
  OfferPlan,
} from "@/lib/modules/contracts";
import { buildOpportunityInspection } from "@/lib/modules/opportunity-inspection";
import type { OpportunityRepository } from "@/lib/server/fixture-repository";
import { buildAlerts } from "@/lib/modules/alerts";
import { warnOnce } from "@/lib/server/runtime-config";
import {
  mapDecisionStatusToDomain,
  mapListingRowToDomain,
  mapMarketRowsToDomain,
  mapMarketRowToDomain,
  mapListingStateToDomain,
  mapNormalizedRowToDomain,
  mapOfferStrategyToDomain,
  mapProfileRowToDomain,
  mapSpecialItemTypeToDomain,
  mapVisibilityLevelToDomain,
} from "@/lib/server/prisma-domain-mappers";

function mapUsers(rows: Awaited<ReturnType<typeof prisma.user.findMany>>): User[] {
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    budget: 0,
    preferredCurrency: "USD",
  }));
}

function parseEvaluationJson<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as T;
}

type PersistedEvaluationRow = Prisma.ListingEvaluationGetPayload<{
  include: {
    listingRaw: {
      include: {
        normalized: true;
      };
    };
    searchProfile: true;
    marketSnapshot: true;
  };
}>;

function buildPersistedScoring(evaluation: PersistedEvaluationRow): ScoreBreakdown {
  const payload = parseEvaluationJson<{ scoring?: ScoreBreakdown }>(evaluation.evaluationJson);
  if (payload?.scoring) {
    return payload.scoring;
  }

  return {
    listingId: evaluation.listingRawId,
    profileId: evaluation.searchProfileId,
    totalScore: Number(evaluation.uiScore ?? 0),
    priceScore: Number(evaluation.priceOpportunityScore ?? 0),
    demandScore: Number(evaluation.liquidityScore ?? 0),
    trustScore: Number(evaluation.sellerScore ?? 0),
    fitScore: Number(evaluation.completenessFitScore ?? 0),
    liquidityScore: Number(evaluation.liquidityScore ?? 0),
    riskPenalty: Number(evaluation.riskPenalty ?? 0),
    confidencePenalty: Number(evaluation.confidencePenalty ?? 0),
    reasoning: Array.isArray(evaluation.driversPositiveJson) ? (evaluation.driversPositiveJson as string[]) : [],
  };
}

function buildPersistedClassification(evaluation: PersistedEvaluationRow, listing: Listing): Classification {
  const payload = parseEvaluationJson<{ classification?: Classification }>(evaluation.evaluationJson);
  if (payload?.classification) {
    return payload.classification;
  }

  return {
    listingId: listing.id,
    brand: evaluation.listingRaw.normalized?.brand ?? "GENERIC",
    model: evaluation.listingRaw.normalized?.model ?? "UNSPECIFIED",
    confidence: Number(evaluation.comparableMatchConfidence ?? evaluation.listingRaw.normalized?.normalizationConfidence ?? 0.55),
    flags: [],
    notes: [],
  };
}

function buildPersistedVisibility(evaluation: PersistedEvaluationRow): VisibilityAssessment {
  const payload = parseEvaluationJson<{ visibility?: VisibilityAssessment }>(evaluation.evaluationJson);
  if (payload?.visibility) {
    return payload.visibility;
  }

  return {
    listingId: evaluation.listingRawId,
    profileId: evaluation.searchProfileId,
    visibilityLevel: mapVisibilityLevelToDomain(evaluation.visibilityLevel),
    isVisible: evaluation.visibilityLevel !== "HIDDEN",
    suppressedByProfile: false,
    suppressionReasons: Array.isArray(evaluation.driversNegativeJson) ? (evaluation.driversNegativeJson as string[]) : [],
  };
}

function buildPersistedDecision(evaluation: PersistedEvaluationRow): Decision {
  const payload = parseEvaluationJson<{ decision?: Decision }>(evaluation.evaluationJson);
  if (payload?.decision) {
    return payload.decision;
  }

  return {
    listingId: evaluation.listingRawId,
    profileId: evaluation.searchProfileId,
    status: mapDecisionStatusToDomain(evaluation.decision),
    confidence: Number(evaluation.decisionConfidence ?? 0),
    expectedResale: 0,
    expectedMargin: 0,
    maxBid: 0,
    recommendedOffer: Number(evaluation.recommendedOffer ?? 0),
    notes: Array.isArray(evaluation.driversNegativeJson) ? (evaluation.driversNegativeJson as string[]) : [],
  };
}

function buildPersistedOffer(evaluation: PersistedEvaluationRow): OfferPlan {
  const payload = parseEvaluationJson<{ offer?: OfferPlan }>(evaluation.evaluationJson);
  if (payload?.offer) {
    return payload.offer;
  }

  return {
    listingId: evaluation.listingRawId,
    profileId: evaluation.searchProfileId,
    offerStrategy: mapOfferStrategyToDomain(evaluation.offerStrategy),
    anchorOffer: evaluation.anchorOffer === null ? null : Number(evaluation.anchorOffer),
    recommendedOffer: evaluation.recommendedOffer === null ? null : Number(evaluation.recommendedOffer),
    walkAwayPrice: evaluation.walkAwayPrice === null ? null : Number(evaluation.walkAwayPrice),
    offerConfidence: Number(evaluation.decisionConfidence ?? 0),
    reasoning: Array.isArray(evaluation.driversPositiveJson) ? (evaluation.driversPositiveJson as string[]) : [],
  };
}

function buildPersistedAlerts(
  evaluation: PersistedEvaluationRow,
  listing: Listing,
  classification: Classification,
  scoring: ScoreBreakdown,
  visibility: VisibilityAssessment,
  decision: Decision,
): Alert[] {
  const payload = parseEvaluationJson<{ alerts?: Alert[] }>(evaluation.evaluationJson);
  if (payload?.alerts) {
    return payload.alerts;
  }

  return buildAlerts(evaluation.searchProfileId, listing, classification, scoring, visibility, decision);
}

function buildPersistedEvaluationResult(evaluation: PersistedEvaluationRow): EvaluationResult {
  const listingRaw = mapListingRowToDomain(evaluation.listingRaw);
  const payload = parseEvaluationJson<{
    listingNormalized?: import("@/lib/modules/contracts").ListingNormalized;
    market?: MarketSnapshot;
    inspection?: import("@/lib/modules/contracts").OpportunityInspection;
  }>(evaluation.evaluationJson);
  const listingNormalized = payload?.listingNormalized ?? mapNormalizedRowToDomain(evaluation.listingRaw.normalized, listingRaw);
  const profile = mapProfileRowToDomain(evaluation.searchProfile);
  const market = payload?.market ?? (evaluation.marketSnapshot ? mapMarketRowToDomain(evaluation.marketSnapshot) : {
    id: "missing-market",
    marketplace: listingRaw.marketplace,
    category: listingRaw.category,
    sampleSize: 0,
    medianPrice: 0,
    lowPrice: 0,
    highPrice: 0,
    sellThroughRate: 0,
    demandIndex: 0,
    feeRate: 0.13,
  });
  const scoring = buildPersistedScoring(evaluation);
  const classification = buildPersistedClassification(evaluation, listingRaw);
  const visibility = buildPersistedVisibility(evaluation);
  const decision = buildPersistedDecision(evaluation);
  const offer = buildPersistedOffer(evaluation);
  const alerts = buildPersistedAlerts(evaluation, listingRaw, classification, scoring, visibility, decision);
  const inspection =
    payload?.inspection ??
    buildOpportunityInspection(
      {
        listingRaw,
        listingNormalized,
        classification,
        visibility,
        scoring,
        decision,
        offer,
      },
      {
        listingState: mapListingStateToDomain(evaluation.listingState),
        specialItemType: mapSpecialItemTypeToDomain(evaluation.specialItemType),
        comparableMatchConfidence:
          evaluation.comparableMatchConfidence === null ? undefined : Number(evaluation.comparableMatchConfidence),
        profileCompatibility: evaluation.profileCompatibility === null ? undefined : Number(evaluation.profileCompatibility),
        rawScore: evaluation.rawScore === null ? undefined : Number(evaluation.rawScore),
        uiScore: evaluation.uiScore === null ? undefined : Number(evaluation.uiScore),
        driversPositive: Array.isArray(evaluation.driversPositiveJson)
          ? (evaluation.driversPositiveJson as string[])
          : scoring.reasoning.concat(offer.reasoning),
        driversNegative: Array.isArray(evaluation.driversNegativeJson)
          ? (evaluation.driversNegativeJson as string[])
          : visibility.suppressionReasons.concat(decision.notes),
        updatedAt: evaluation.updatedAt.toISOString(),
      },
    );

  return {
    id: `${listingRaw.id}:${profile.id}`,
    listingRaw,
    listingNormalized,
    profile,
    market,
    classification,
    visibility,
    scoring,
    decision,
    offer,
    alerts,
    inspection,
  };
}

export class PrismaOpportunityRepository implements OpportunityRepository {
  async loadCatalog(): Promise<OpportunityCatalog> {
    const [users, profiles, listings, market] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.searchProfile.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.listingRaw.findMany({ orderBy: { fetchedAt: "desc" } }),
      prisma.marketSnapshot.findMany({ orderBy: { snapshotAt: "desc" } }),
    ]);

    if (users.length === 0 || profiles.length === 0) {
      warnOnce("[prisma-repository] Catalog is incomplete.", {
        users: users.length,
        profiles: profiles.length,
        listings: listings.length,
        market: market.length,
      });
    }

    return {
      users: mapUsers(users),
      profiles: profiles.map(mapProfileRowToDomain),
      listings: listings.map(mapListingRowToDomain),
      market: mapMarketRowsToDomain(market),
    };
  }

  async loadPersistedEvaluations(): Promise<EvaluationResult[] | null> {
    const rows = await prisma.listingEvaluation.findMany({
      include: {
        listingRaw: {
          include: {
            normalized: true,
          },
        },
        searchProfile: true,
        marketSnapshot: true,
      },
      orderBy: [
        {
          visibilityLevel: "asc",
        },
        {
          uiScore: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    });

    if (rows.length === 0) {
      return null;
    }

    return rows.map(buildPersistedEvaluationResult).sort((a, b) => {
      if (a.visibility.visibilityLevel !== b.visibility.visibilityLevel) {
        return a.visibility.visibilityLevel === "primary_feed"
          ? -1
          : b.visibility.visibilityLevel === "primary_feed"
            ? 1
            : a.visibility.visibilityLevel === "secondary_feed" && b.visibility.visibilityLevel === "hidden"
              ? -1
              : 1;
      }

      return b.scoring.totalScore - a.scoring.totalScore;
    });
  }
}
