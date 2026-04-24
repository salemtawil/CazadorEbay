import { prisma } from "@/lib/db/prisma";
import type {
  Listing,
  MarketSnapshot,
  Marketplace,
  OpportunityCatalog,
  SearchProfile,
  User,
} from "@/lib/modules/contracts";
import type { OpportunityRepository } from "@/lib/server/fixture-repository";

function parseMarketplace(value: string): Marketplace {
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

function mapUsers(rows: Awaited<ReturnType<typeof prisma.user.findMany>>): User[] {
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    budget: 0,
    preferredCurrency: "USD",
  }));
}

function mapProfiles(rows: Awaited<ReturnType<typeof prisma.searchProfile.findMany>>): SearchProfile[] {
  return rows.map((row) => ({
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
    maxBudget: row.maxBudget ? Number(row.maxBudget) : undefined,
    minResaleMarginPct: row.minResaleMarginPct ? Number(row.minResaleMarginPct) : undefined,
    offerStrategy: row.riskTolerance === "LOW" ? "conservative" : row.riskTolerance === "HIGH" ? "aggressive" : "balanced",
  }));
}

function mapListings(rows: Awaited<ReturnType<typeof prisma.listingRaw.findMany>>): Listing[] {
  return rows.map((row) => {
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
  });
}

function mapMarket(rows: Awaited<ReturnType<typeof prisma.marketSnapshot.findMany>>): MarketSnapshot[] {
  return rows.map((row) => {
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
      p25Price: row.p25Price ? Number(row.p25Price) : undefined,
      p10Price: row.p10Price ? Number(row.p10Price) : undefined,
      lowPrice: Number(row.p10Price ?? row.p25Price ?? row.medianPrice),
      highPrice: Number(row.stdDev ? row.medianPrice.add(row.stdDev) : row.medianPrice),
      sellThroughRate: mapLiquidityToSellThrough(row.liquidityBand),
      demandIndex: mapLiquidityToDemand(row.liquidityBand),
      feeRate: 0.13,
    };
  });
}

export class PrismaOpportunityRepository implements OpportunityRepository {
  async loadCatalog(): Promise<OpportunityCatalog> {
    const [users, profiles, listings, market] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.searchProfile.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.listingRaw.findMany({ orderBy: { fetchedAt: "desc" } }),
      prisma.marketSnapshot.findMany({ orderBy: { snapshotAt: "desc" } }),
    ]);

    return {
      users: mapUsers(users),
      profiles: mapProfiles(profiles),
      listings: mapListings(listings),
      market: mapMarket(market),
    };
  }
}
