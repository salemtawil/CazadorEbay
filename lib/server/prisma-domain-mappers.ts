import type {
  Listing,
  ListingNormalized,
  MarketSnapshot,
  Marketplace,
  SearchProfile,
} from "@/lib/modules/contracts";
import type {
  CompletenessLevel,
  DefectState,
  EvaluationDecision,
  ListingState,
  ListingType,
  MarketSnapshot as PrismaMarketSnapshot,
  MarketplaceSource,
  OfferStrategy,
  PrismaClient,
  SpecialItemType,
  VisibilityLevel,
} from "@prisma/client";

type SearchProfileRow = Awaited<ReturnType<PrismaClient["searchProfile"]["findMany"]>>[number];
type ListingRawRow = Awaited<ReturnType<PrismaClient["listingRaw"]["findMany"]>>[number];
type ListingNormalizedRow = Awaited<ReturnType<PrismaClient["listingNormalized"]["findMany"]>>[number];

export function parseMarketplace(value: string): Marketplace {
  return value === "FACEBOOK" || value === "MERCARI" ? value : "EBAY";
}

function mapLiquidityToSellThrough(liquidityBand: string): number {
  if (liquidityBand === "HIGH") {
    return 0.72;
  }

  if (liquidityBand === "MEDIUM") {
    return 0.58;
  }

  return 0.4;
}

function mapLiquidityToDemand(liquidityBand: string): number {
  if (liquidityBand === "HIGH") {
    return 8.2;
  }

  if (liquidityBand === "MEDIUM") {
    return 6.6;
  }

  return 4.8;
}

export function mapProfileRowToDomain(row: SearchProfileRow): SearchProfile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.categoryHint ?? row.name,
    strategyMode: row.strategyMode.toLowerCase() as SearchProfile["strategyMode"],
    riskTolerance: row.riskTolerance.toLowerCase() as SearchProfile["riskTolerance"],
    strictMode: row.strictMode,
    includePartsRepairs: row.includePartsRepairs,
    includeIncompleteItems: row.includeIncompleteItems,
    includeAccessories: row.includeAccessories,
    showLowConfidenceItems: row.showLowConfidenceItems,
    keywords: row.searchTerms,
    blockedTerms: row.excludedTerms,
    targetCategories: row.categoryHint ? [row.categoryHint] : ["uncategorized"],
    preferredConditions: ["NEW", "USED_EXCELLENT", "USED_GOOD", "PARTS"],
    minPrice: 0,
    maxPrice: Number(row.maxBudget ?? 999999),
    minScore: Number(row.minScore),
    minConfidence: Number(row.minConfidence),
    maxBudget: row.maxBudget === null ? undefined : Number(row.maxBudget),
    minResaleMarginPct: row.minResaleMarginPct === null ? undefined : Number(row.minResaleMarginPct),
    offerStrategy: row.riskTolerance === "LOW" ? "conservative" : row.riskTolerance === "HIGH" ? "aggressive" : "balanced",
  };
}

export function mapListingRowToDomain(row: ListingRawRow): Listing {
  const raw = (row.rawJson ?? {}) as Record<string, unknown>;
  const attributes = ((raw.attributes as Record<string, string | number | boolean>) ?? {}) as Record<
    string,
    string | number | boolean
  >;

  return {
    id: row.id,
    marketplace: parseMarketplace(row.source),
    externalId: row.externalItemId,
    title: row.title,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
    url: row.url,
    category: typeof raw.category === "string" ? raw.category : "uncategorized",
    condition:
      raw.condition === "NEW" || raw.condition === "USED_EXCELLENT" || raw.condition === "USED_GOOD" || raw.condition === "PARTS"
        ? raw.condition
        : "USED_GOOD",
    price: Number(row.itemPrice ?? 0),
    shippingCost: Number(row.shippingPrice ?? 0),
    bestOfferAvailable: row.bestOfferAvailable,
    currency: row.currency,
    sellerName: typeof raw.sellerName === "string" ? raw.sellerName : "unknown-seller",
    sellerRating: Number(row.sellerFeedbackPercent ?? 0),
    sellerSalesCount: row.sellerFeedbackCount ?? 0,
    returnsAccepted: typeof raw.returnsAccepted === "boolean" ? raw.returnsAccepted : false,
    location: typeof raw.location === "string" ? raw.location : "Unknown",
    endAt: row.endTime?.toISOString(),
    scrapedAt: row.fetchedAt.toISOString(),
    attributes,
  };
}

export function mapMarketRowToDomain(row: PrismaMarketSnapshot): MarketSnapshot {
  const [marketplaceRaw, category] = row.comparableGroupKey.includes(":")
    ? row.comparableGroupKey.split(":", 2)
    : ["EBAY", row.comparableGroupKey];
  const marketplace = parseMarketplace(marketplaceRaw);

  return {
    id: row.id,
    marketplace,
    category,
    sampleSize: row.sampleSize,
    medianPrice: Number(row.medianPrice),
    p25Price: row.p25Price === null ? undefined : Number(row.p25Price),
    p10Price: row.p10Price === null ? undefined : Number(row.p10Price),
    lowPrice: Number(row.p10Price ?? row.p25Price ?? row.medianPrice),
    highPrice: Number(row.stdDev ? row.medianPrice.add(row.stdDev) : row.medianPrice),
    sellThroughRate: mapLiquidityToSellThrough(row.liquidityBand),
    demandIndex: mapLiquidityToDemand(row.liquidityBand),
    feeRate: 0.13,
  };
}

export function mapMarketRowsToDomain(rows: PrismaMarketSnapshot[]): MarketSnapshot[] {
  return rows.map(mapMarketRowToDomain);
}

function mapNormalizedRowToItemType(row: ListingNormalizedRow): ListingNormalized["itemType"] {
  if (row.defectState === "PARTS_ONLY") {
    return "FOR_PARTS_NOT_WORKING";
  }

  if (row.accessoryFlag) {
    return "ACCESSORY_ONLY";
  }

  if (row.completeness === "PARTIAL") {
    return "INCOMPLETE_ITEM";
  }

  return "STANDARD";
}

export function mapNormalizedRowToDomain(row: ListingNormalizedRow | null, listing: Listing): ListingNormalized {
  if (!row) {
    return {
      listingId: listing.id,
      category: listing.category,
      normalizedCondition: listing.condition,
      itemType: "STANDARD",
      totalAcquisitionCost: listing.price + listing.shippingCost,
    };
  }

  return {
    listingId: listing.id,
    category: listing.category,
    normalizedCondition: listing.condition,
    itemType: mapNormalizedRowToItemType(row),
    totalAcquisitionCost: listing.price + listing.shippingCost,
  };
}

export function mapMarketplaceToSource(value: Marketplace): MarketplaceSource {
  if (value === "FACEBOOK") {
    return "FACEBOOK";
  }

  if (value === "MERCARI") {
    return "MERCARI";
  }

  return "EBAY";
}

export function mapListingType(bestOfferAvailable: boolean | undefined): ListingType {
  return bestOfferAvailable ? "FIXED_PRICE" : "AUCTION";
}

export function mapCompleteness(itemType: ListingNormalized["itemType"]): CompletenessLevel {
  if (itemType === "STANDARD") {
    return "COMPLETE";
  }

  if (itemType === "INCOMPLETE_ITEM") {
    return "PARTIAL";
  }

  return "UNKNOWN";
}

export function mapDefectState(itemType: ListingNormalized["itemType"]): DefectState {
  if (itemType === "FOR_PARTS_NOT_WORKING" || itemType === "REPLACEMENT_PART_ONLY") {
    return "PARTS_ONLY";
  }

  return "UNKNOWN";
}

export function mapListingState(itemType: ListingNormalized["itemType"]): ListingState {
  if (itemType === "FOR_PARTS_NOT_WORKING") {
    return "PARTS_REPAIR";
  }

  if (itemType === "REPLACEMENT_PART_ONLY") {
    return "STANDARD";
  }

  if (itemType === "INCOMPLETE_ITEM") {
    return "INCOMPLETE";
  }

  if (itemType === "ACCESSORY_ONLY") {
    return "ACCESSORY_ONLY";
  }

  return "STANDARD";
}

export function mapSpecialItemType(itemType: ListingNormalized["itemType"]): SpecialItemType {
  if (itemType === "FOR_PARTS_NOT_WORKING" || itemType === "REPLACEMENT_PART_ONLY") {
    return "PARTS_REPAIR";
  }

  if (itemType === "ACCESSORY_ONLY") {
    return "ACCESSORY";
  }

  return "NONE";
}

export function mapVisibilityLevel(level: "primary_feed" | "secondary_feed" | "hidden"): VisibilityLevel {
  if (level === "primary_feed") {
    return "HIGH";
  }

  if (level === "secondary_feed") {
    return "MEDIUM";
  }

  return "HIDDEN";
}

export function mapVisibilityLevelToDomain(level: VisibilityLevel): "primary_feed" | "secondary_feed" | "hidden" {
  if (level === "HIGH") {
    return "primary_feed";
  }

  if (level === "MEDIUM" || level === "LOW") {
    return "secondary_feed";
  }

  return "hidden";
}

export function mapDecisionStatus(status: "BUY" | "NEGOTIATE" | "REVIEW" | "WATCH" | "SKIP"): EvaluationDecision {
  return status;
}

export function mapDecisionStatusToDomain(status: EvaluationDecision): "BUY" | "NEGOTIATE" | "REVIEW" | "WATCH" | "SKIP" {
  return status;
}

export function mapOfferStrategy(
  strategy: "buy_now" | "offer_now" | "watch" | "skip",
): OfferStrategy {
  if (strategy === "buy_now") {
    return "AGGRESSIVE";
  }

  if (strategy === "offer_now") {
    return "BALANCED";
  }

  if (strategy === "watch") {
    return "CONSERVATIVE";
  }

  return "NONE";
}

export function mapOfferStrategyToDomain(
  strategy: OfferStrategy,
): "buy_now" | "offer_now" | "watch" | "skip" {
  if (strategy === "AGGRESSIVE") {
    return "buy_now";
  }

  if (strategy === "BALANCED") {
    return "offer_now";
  }

  if (strategy === "CONSERVATIVE") {
    return "watch";
  }

  return "skip";
}
