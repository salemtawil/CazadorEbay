import { PrismaClient } from "@prisma/client";
import { fixtureListings, fixtureMarket, fixtureProfiles, fixtureUsers } from "../lib/fixtures/seed-data";
import { classifyListing } from "../lib/modules/classification";
import { decideListing } from "../lib/modules/decisions";
import { normalizeListing } from "../lib/modules/listings";
import { getMarketSnapshot } from "../lib/modules/market";
import { planOffer } from "../lib/modules/offers";
import { listingMatchesProfile } from "../lib/modules/search-profiles";
import { scoreListing } from "../lib/modules/scoring";
import { decideVisibility } from "../lib/modules/visibility";

const prisma = new PrismaClient();

function comparableGroupKey(marketplace: string, category: string): string {
  return `${marketplace}:${category}`;
}

function mapStrategyMode(value: NonNullable<(typeof fixtureProfiles)[number]["strategyMode"]>) {
  if (value === "buy_and_hold") return "BUY_AND_HOLD";
  if (value === "arbitrage") return "ARBITRAGE";
  if (value === "flip") return "FLIP";
  return "CUSTOM";
}

function mapRiskTolerance(value: (typeof fixtureProfiles)[number]["riskTolerance"]) {
  return value.toUpperCase() as "LOW" | "MEDIUM" | "HIGH";
}

function mapSource(value: string) {
  return value.toUpperCase() as "EBAY" | "FACEBOOK" | "MERCARI";
}

function mapListingType(listing: (typeof fixtureListings)[number]) {
  return listing.bestOfferAvailable ? "FIXED_PRICE" : "AUCTION";
}

function mapCompleteness(itemType: ReturnType<typeof normalizeListing>["itemType"]) {
  if (itemType === "STANDARD") return "COMPLETE";
  if (itemType === "INCOMPLETE_ITEM") return "PARTIAL";
  return "UNKNOWN";
}

function mapDefectState(itemType: ReturnType<typeof normalizeListing>["itemType"]) {
  if (itemType === "FOR_PARTS_NOT_WORKING") return "PARTS_ONLY";
  return "UNKNOWN";
}

function mapLiquidityBand(demandIndex: number) {
  if (demandIndex >= 8) return "HIGH";
  if (demandIndex >= 6) return "MEDIUM";
  return "LOW";
}

function mapListingState(itemType: ReturnType<typeof normalizeListing>["itemType"]) {
  if (itemType === "FOR_PARTS_NOT_WORKING") return "PARTS_REPAIR";
  if (itemType === "INCOMPLETE_ITEM") return "INCOMPLETE";
  if (itemType === "ACCESSORY_ONLY") return "ACCESSORY_ONLY";
  return "STANDARD";
}

function mapSpecialItemType(itemType: ReturnType<typeof normalizeListing>["itemType"]) {
  if (itemType === "FOR_PARTS_NOT_WORKING") return "PARTS_REPAIR";
  if (itemType === "ACCESSORY_ONLY") return "ACCESSORY";
  if (itemType === "REPLACEMENT_PART_ONLY") return "PARTS_REPAIR";
  return "NONE";
}

function mapVisibilityLevel(level: ReturnType<typeof decideVisibility>["visibilityLevel"]) {
  if (level === "primary_feed") return "HIGH";
  if (level === "secondary_feed") return "MEDIUM";
  return "HIDDEN";
}

function mapDecisionStatus(status: ReturnType<typeof decideListing>["status"]) {
  return status === "BUY"
    ? "BUY"
    : status === "NEGOTIATE"
      ? "NEGOTIATE"
      : status === "REVIEW"
        ? "REVIEW"
        : status === "WATCH"
          ? "WATCH"
          : "SKIP";
}

function mapOfferStrategy(strategy: ReturnType<typeof planOffer>["offerStrategy"]) {
  if (strategy === "buy_now") return "AGGRESSIVE";
  if (strategy === "offer_now") return "BALANCED";
  if (strategy === "watch") return "CONSERVATIVE";
  return "NONE";
}

async function main() {
  await prisma.listingEvaluation.deleteMany();
  await prisma.listingNormalized.deleteMany();
  await prisma.listingRaw.deleteMany();
  await prisma.searchProfile.deleteMany();
  await prisma.marketSnapshot.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: fixtureUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
    })),
  });

  await prisma.searchProfile.createMany({
    data: fixtureProfiles.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      strategyMode: mapStrategyMode(profile.strategyMode ?? "custom"),
      riskTolerance: mapRiskTolerance(profile.riskTolerance),
      strictMode: profile.strictMode,
      includePartsRepairs: profile.includePartsRepairs,
      includeIncompleteItems: profile.includeIncompleteItems,
      includeAccessories: profile.includeAccessories,
      showLowConfidenceItems: profile.showLowConfidenceItems,
      minScore: profile.minScore,
      minConfidence: profile.minConfidence,
      maxBudget: profile.maxBudget ?? null,
      minResaleMarginPct: profile.minResaleMarginPct ?? null,
      searchTerms: profile.keywords,
      excludedTerms: profile.blockedTerms,
      categoryHint: profile.targetCategories[0] ?? null,
      status: "ACTIVE",
    })),
  });

  await prisma.marketSnapshot.createMany({
    data: fixtureMarket.map((market) => ({
      id: market.id,
      comparableGroupKey: comparableGroupKey(market.marketplace, market.category),
      sampleSize: market.sampleSize ?? 20,
      medianPrice: market.medianPrice,
      p25Price: market.p25Price ?? null,
      p10Price: market.p10Price ?? null,
      stdDev: Math.max(1, Math.round((market.highPrice - market.lowPrice) / 4)),
      liquidityBand: mapLiquidityBand(market.demandIndex),
      snapshotAt: new Date(),
    })),
  });

  await prisma.listingRaw.createMany({
    data: fixtureListings.map((listing) => ({
      id: listing.id,
      source: mapSource(listing.marketplace),
      externalItemId: listing.externalId,
      title: listing.title,
      description: listing.subtitle ?? null,
      url: listing.url,
      itemPrice: listing.price,
      shippingPrice: listing.shippingCost,
      currency: listing.currency,
      listingType: mapListingType(listing),
      bestOfferAvailable: Boolean(listing.bestOfferAvailable),
      sellerFeedbackPercent: listing.sellerRating,
      sellerFeedbackCount: listing.sellerSalesCount,
      photoCount: 6,
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
    })),
  });

  for (const listing of fixtureListings) {
    const market = getMarketSnapshot(listing, fixtureMarket);
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);
    await prisma.listingNormalized.create({
      data: {
        listingRawId: listing.id,
        brand: classification.brand,
        model: classification.model,
        variant: null,
        size: null,
        color: typeof listing.attributes.color === "string" ? listing.attributes.color : null,
        storage: typeof listing.attributes.storage === "string" ? listing.attributes.storage : null,
        lotSize: null,
        completeness: mapCompleteness(normalized.itemType),
        defectState: mapDefectState(normalized.itemType),
        accessoryFlag: normalized.itemType === "ACCESSORY_ONLY",
        normalizationConfidence: classification.confidence,
      },
    });

    for (const profile of fixtureProfiles.filter((item) => listingMatchesProfile(listing, item))) {
      const scoring = scoreListing(listing, normalized, profile, classification, market);
      const visibility = decideVisibility({
        listing,
        profile,
        classification,
        scoring,
      });
      const decision = decideListing(profile.id, listing, normalized, scoring, classification, visibility, market);
      const offer = planOffer({
        profile,
        listing,
        market,
        classification,
        scoring,
        decision,
      });
      await prisma.listingEvaluation.create({
        data: {
          listingRawId: listing.id,
          searchProfileId: profile.id,
          marketSnapshotId: market.id,
          listingState: mapListingState(normalized.itemType),
          specialItemType: mapSpecialItemType(normalized.itemType),
          comparableMatchConfidence: classification.confidence,
          profileCompatibility: Math.min(1, scoring.fitScore / 100),
          visibilityLevel: mapVisibilityLevel(visibility.visibilityLevel),
          decision: mapDecisionStatus(decision.status),
          decisionConfidence: decision.confidence,
          priceOpportunityScore: scoring.priceScore,
          listingAlphaScore: scoring.totalScore,
          sellerScore: scoring.trustScore,
          liquidityScore: scoring.liquidityScore,
          timingScore: market.sellThroughRate * 100,
          completenessFitScore: scoring.fitScore,
          riskPenalty: scoring.riskPenalty,
          confidencePenalty: scoring.confidencePenalty,
          rawScore: scoring.totalScore + scoring.riskPenalty + scoring.confidencePenalty,
          uiScore: scoring.totalScore,
          driversPositiveJson: scoring.reasoning,
          driversNegativeJson: visibility.suppressionReasons.concat(decision.notes),
          offerStrategy: mapOfferStrategy(offer.offerStrategy),
          anchorOffer: offer.anchorOffer,
          recommendedOffer: offer.recommendedOffer,
          walkAwayPrice: offer.walkAwayPrice,
          evaluationJson: {
            classification,
            visibility,
            decision,
            offer,
          },
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
