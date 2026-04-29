import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Alert, Classification, EvaluationResult, Listing, ListingNormalized, MarketSnapshot, SearchProfile } from "@/lib/modules/contracts";
import {
  mapCompleteness,
  mapDecisionStatus,
  mapDefectState,
  mapListingState,
  mapListingRowToDomain,
  mapListingType,
  mapMarketRowsToDomain,
  mapMarketplaceToSource,
  mapOfferStrategy,
  mapProfileRowToDomain,
  mapSpecialItemType,
  mapVisibilityLevel,
} from "@/lib/server/prisma-domain-mappers";
import type {
  PersistedEvaluationRecord,
  PersistedIngestionStore,
  PersistedListingRecord,
} from "@/lib/server/persisted-ingestion-service";

function comparableGroupKey(marketplace: string, category: string): string {
  return `${marketplace}:${category}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function findMarketSnapshotId(market: MarketSnapshot): Promise<string | null> {
  return prisma.marketSnapshot
    .findFirst({
      where: {
        comparableGroupKey: comparableGroupKey(market.marketplace, market.category),
      },
      orderBy: {
        snapshotAt: "desc",
      },
      select: {
        id: true,
      },
    })
    .then((row) => row?.id ?? null);
}

export class PrismaIngestionStore implements PersistedIngestionStore {
  async loadActiveProfiles(): Promise<SearchProfile[]> {
    const rows = await prisma.searchProfile.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return rows.map(mapProfileRowToDomain);
  }

  async loadMarketSnapshots(): Promise<MarketSnapshot[]> {
    const rows = await prisma.marketSnapshot.findMany({
      orderBy: {
        snapshotAt: "desc",
      },
    });

    return mapMarketRowsToDomain(rows);
  }

  async upsertListingRaw(listing: Listing): Promise<PersistedListingRecord> {
    const source = mapMarketplaceToSource(listing.marketplace);
    const existing = await prisma.listingRaw.findUnique({
      where: {
        source_externalItemId: {
          source,
          externalItemId: listing.externalId,
        },
      },
      select: {
        id: true,
      },
    });

    const row = await prisma.listingRaw.upsert({
      where: {
        source_externalItemId: {
          source,
          externalItemId: listing.externalId,
        },
      },
      create: {
        source,
        externalItemId: listing.externalId,
        title: listing.title,
        description: listing.subtitle ?? null,
        url: listing.url,
        itemPrice: listing.price,
        shippingPrice: listing.shippingCost,
        currency: listing.currency,
        listingType: mapListingType(listing.bestOfferAvailable),
        bestOfferAvailable: Boolean(listing.bestOfferAvailable),
        sellerFeedbackPercent: listing.sellerRating,
        sellerFeedbackCount: listing.sellerSalesCount,
        endTime: listing.endAt ? new Date(listing.endAt) : null,
        fetchedAt: new Date(listing.scrapedAt),
        rawJson: {
          subtitle: listing.subtitle ?? null,
          category: listing.category,
          condition: listing.condition,
          sellerName: listing.sellerName,
          returnsAccepted: listing.returnsAccepted,
          location: listing.location,
          attributes: listing.attributes,
        },
      },
      update: {
        title: listing.title,
        description: listing.subtitle ?? null,
        url: listing.url,
        itemPrice: listing.price,
        shippingPrice: listing.shippingCost,
        currency: listing.currency,
        listingType: mapListingType(listing.bestOfferAvailable),
        bestOfferAvailable: Boolean(listing.bestOfferAvailable),
        sellerFeedbackPercent: listing.sellerRating,
        sellerFeedbackCount: listing.sellerSalesCount,
        endTime: listing.endAt ? new Date(listing.endAt) : null,
        fetchedAt: new Date(listing.scrapedAt),
        rawJson: {
          subtitle: listing.subtitle ?? null,
          category: listing.category,
          condition: listing.condition,
          sellerName: listing.sellerName,
          returnsAccepted: listing.returnsAccepted,
          location: listing.location,
          attributes: listing.attributes,
        },
      },
    });

    console.info(`[ingest] Listing ${existing ? "updated" : "created"}.`, {
      listingId: row.id,
      externalItemId: listing.externalId,
      source,
    });

    return {
      listing: mapListingRowToDomain(row),
      created: existing === null,
    };
  }

  async upsertListingNormalized(
    listing: Listing,
    normalized: ListingNormalized,
    classification: Classification,
  ): Promise<void> {
    await prisma.listingNormalized.upsert({
      where: {
        listingRawId: listing.id,
      },
      create: {
        listingRawId: listing.id,
        brand: classification.brand,
        model: classification.model,
        variant: null,
        size: null,
        color: typeof listing.attributes.color === "string" ? listing.attributes.color : null,
        storage: typeof listing.attributes.storage === "string" ? listing.attributes.storage : null,
        lotSize: typeof listing.attributes.lotSize === "number" ? Math.round(listing.attributes.lotSize) : null,
        completeness: mapCompleteness(normalized.itemType),
        defectState: mapDefectState(normalized.itemType),
        accessoryFlag: normalized.itemType === "ACCESSORY_ONLY",
        normalizationConfidence: classification.confidence,
      },
      update: {
        brand: classification.brand,
        model: classification.model,
        color: typeof listing.attributes.color === "string" ? listing.attributes.color : null,
        storage: typeof listing.attributes.storage === "string" ? listing.attributes.storage : null,
        lotSize: typeof listing.attributes.lotSize === "number" ? Math.round(listing.attributes.lotSize) : null,
        completeness: mapCompleteness(normalized.itemType),
        defectState: mapDefectState(normalized.itemType),
        accessoryFlag: normalized.itemType === "ACCESSORY_ONLY",
        normalizationConfidence: classification.confidence,
      },
    });
  }

  async upsertListingEvaluation(evaluation: EvaluationResult, alerts: Alert[]): Promise<PersistedEvaluationRecord> {
    const existing = await prisma.listingEvaluation.findUnique({
      where: {
        listingRawId_searchProfileId: {
          listingRawId: evaluation.listingRaw.id,
          searchProfileId: evaluation.profile.id,
        },
      },
      select: {
        id: true,
      },
    });
    const marketSnapshotId = await findMarketSnapshotId(evaluation.market);

    await prisma.listingEvaluation.upsert({
      where: {
        listingRawId_searchProfileId: {
          listingRawId: evaluation.listingRaw.id,
          searchProfileId: evaluation.profile.id,
        },
      },
      create: {
        listingRawId: evaluation.listingRaw.id,
        searchProfileId: evaluation.profile.id,
        marketSnapshotId,
        listingState: mapListingState(evaluation.listingNormalized.itemType),
        specialItemType: mapSpecialItemType(evaluation.listingNormalized.itemType),
        comparableMatchConfidence: evaluation.classification.confidence,
        profileCompatibility: Math.min(1, evaluation.scoring.fitScore / 100),
        visibilityLevel: mapVisibilityLevel(evaluation.visibility.visibilityLevel),
        decision: mapDecisionStatus(evaluation.decision.status),
        decisionConfidence: evaluation.decision.confidence,
        priceOpportunityScore: evaluation.scoring.priceScore,
        listingAlphaScore: evaluation.scoring.totalScore,
        sellerScore: evaluation.scoring.trustScore,
        liquidityScore: evaluation.scoring.liquidityScore,
        timingScore: evaluation.market.sellThroughRate * 100,
        completenessFitScore: evaluation.scoring.fitScore,
        riskPenalty: evaluation.scoring.riskPenalty,
        confidencePenalty: evaluation.scoring.confidencePenalty,
        rawScore: evaluation.scoring.totalScore + evaluation.scoring.riskPenalty + evaluation.scoring.confidencePenalty,
        uiScore: evaluation.scoring.totalScore,
        driversPositiveJson: toJsonValue(evaluation.scoring.reasoning),
        driversNegativeJson: toJsonValue(evaluation.visibility.suppressionReasons.concat(evaluation.decision.notes)),
        offerStrategy: mapOfferStrategy(evaluation.offer.offerStrategy),
        anchorOffer: evaluation.offer.anchorOffer,
        recommendedOffer: evaluation.offer.recommendedOffer,
        walkAwayPrice: evaluation.offer.walkAwayPrice,
        evaluationJson: toJsonValue({
          listingNormalized: evaluation.listingNormalized,
          classification: evaluation.classification,
          visibility: evaluation.visibility,
          scoring: evaluation.scoring,
          decision: evaluation.decision,
          offer: evaluation.offer,
          market: evaluation.market,
          alerts,
        }),
      },
      update: {
        marketSnapshotId,
        listingState: mapListingState(evaluation.listingNormalized.itemType),
        specialItemType: mapSpecialItemType(evaluation.listingNormalized.itemType),
        comparableMatchConfidence: evaluation.classification.confidence,
        profileCompatibility: Math.min(1, evaluation.scoring.fitScore / 100),
        visibilityLevel: mapVisibilityLevel(evaluation.visibility.visibilityLevel),
        decision: mapDecisionStatus(evaluation.decision.status),
        decisionConfidence: evaluation.decision.confidence,
        priceOpportunityScore: evaluation.scoring.priceScore,
        listingAlphaScore: evaluation.scoring.totalScore,
        sellerScore: evaluation.scoring.trustScore,
        liquidityScore: evaluation.scoring.liquidityScore,
        timingScore: evaluation.market.sellThroughRate * 100,
        completenessFitScore: evaluation.scoring.fitScore,
        riskPenalty: evaluation.scoring.riskPenalty,
        confidencePenalty: evaluation.scoring.confidencePenalty,
        rawScore: evaluation.scoring.totalScore + evaluation.scoring.riskPenalty + evaluation.scoring.confidencePenalty,
        uiScore: evaluation.scoring.totalScore,
        driversPositiveJson: toJsonValue(evaluation.scoring.reasoning),
        driversNegativeJson: toJsonValue(evaluation.visibility.suppressionReasons.concat(evaluation.decision.notes)),
        offerStrategy: mapOfferStrategy(evaluation.offer.offerStrategy),
        anchorOffer: evaluation.offer.anchorOffer,
        recommendedOffer: evaluation.offer.recommendedOffer,
        walkAwayPrice: evaluation.offer.walkAwayPrice,
        evaluationJson: toJsonValue({
          listingNormalized: evaluation.listingNormalized,
          classification: evaluation.classification,
          visibility: evaluation.visibility,
          scoring: evaluation.scoring,
          decision: evaluation.decision,
          offer: evaluation.offer,
          market: evaluation.market,
          alerts,
        }),
      },
    });

    console.info(`[ingest] Evaluation ${existing ? "updated" : "created"}.`, {
      listingRawId: evaluation.listingRaw.id,
      searchProfileId: evaluation.profile.id,
      decision: evaluation.decision.status,
      visibility: evaluation.visibility.visibilityLevel,
    });

    return {
      created: existing === null,
    };
  }
}
