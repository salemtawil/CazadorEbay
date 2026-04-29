import { describe, expect, it } from "vitest";
import type { Alert, EvaluationResult, Listing, ListingNormalized, MarketSnapshot, SearchProfile } from "../lib/modules/contracts";
import type { ListingProvider } from "../lib/server/listing-providers/contracts";
import type {
  PersistedEvaluationRecord,
  PersistedIngestionStore,
  PersistedListingRecord,
} from "../lib/server/persisted-ingestion-service";
import { PersistedIngestionService } from "../lib/server/persisted-ingestion-service";
import { makeListing, makeMarket, makeProfile } from "./helpers/domain-fixtures";

class MemoryStore implements PersistedIngestionStore {
  readonly listings = new Map<string, Listing>();
  readonly normalized = new Map<string, ListingNormalized>();
  readonly evaluations = new Map<string, { evaluation: EvaluationResult; alerts: Alert[] }>();

  constructor(
    private readonly profiles: SearchProfile[],
    private readonly marketSnapshots: MarketSnapshot[],
  ) {}

  async loadActiveProfiles(): Promise<SearchProfile[]> {
    return this.profiles;
  }

  async loadMarketSnapshots(): Promise<MarketSnapshot[]> {
    return this.marketSnapshots;
  }

  async upsertListingRaw(listing: Listing): Promise<PersistedListingRecord> {
    const key = `${listing.marketplace}:${listing.externalId}`;
    const existing = this.listings.get(key);
    const persisted = existing
      ? {
          ...listing,
          id: existing.id,
        }
      : {
          ...listing,
          id: `db-${listing.externalId}`,
        };

    this.listings.set(key, persisted);

    return {
      listing: persisted,
      created: !existing,
    };
  }

  async upsertListingNormalized(
    listing: Listing,
    normalized: ListingNormalized,
  ): Promise<void> {
    this.normalized.set(listing.id, normalized);
  }

  async upsertListingEvaluation(
    evaluation: EvaluationResult,
    alerts: Alert[],
  ): Promise<PersistedEvaluationRecord> {
    const key = `${evaluation.listingRaw.id}:${evaluation.profile.id}`;
    const created = !this.evaluations.has(key);
    this.evaluations.set(key, {
      evaluation,
      alerts,
    });

    return { created };
  }
}

class ConfigurableProvider implements ListingProvider {
  readonly source = "test-provider";

  constructor(
    private readonly listings: Listing[],
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  async searchListings(): Promise<Listing[]> {
    return this.listings;
  }
}

describe("persisted ingestion service", () => {
  it("creates listings, normalization and evaluations on the first run", async () => {
    const profile = makeProfile({
      keywords: ["nintendo", "switch"],
      blockedTerms: [],
      targetCategories: ["gaming-handhelds"],
    });
    const listing = makeListing({
      id: "ebay-raw-1",
      externalId: "ebay-raw-1",
      title: "Nintendo Switch OLED complete in box",
      category: "gaming-handhelds",
      marketplace: "EBAY",
    });
    const store = new MemoryStore([profile], [makeMarket({ category: "gaming-handhelds", marketplace: "EBAY" })]);
    const service = new PersistedIngestionService(store, new ConfigurableProvider([listing]));

    const summary = await service.run();

    expect(summary).toEqual({
      profilesProcessed: 1,
      listingsNew: 1,
      listingsUpdated: 0,
      evaluationsCreated: 1,
      evaluationsUpdated: 0,
      errors: [],
    });
    expect(store.listings.size).toBe(1);
    expect(store.normalized.size).toBe(1);
    expect(store.evaluations.size).toBe(1);
  });

  it("updates existing listings and evaluations on subsequent runs", async () => {
    const profile = makeProfile({
      keywords: ["nintendo", "switch"],
      blockedTerms: [],
      targetCategories: ["gaming-handhelds"],
    });
    const initialListing = makeListing({
      id: "ebay-raw-2",
      externalId: "ebay-raw-2",
      title: "Nintendo Switch OLED with dock",
      category: "gaming-handhelds",
      marketplace: "EBAY",
      price: 210,
    });
    const updatedListing = {
      ...initialListing,
      price: 185,
      shippingCost: 8,
    };
    const store = new MemoryStore([profile], [makeMarket({ category: "gaming-handhelds", marketplace: "EBAY" })]);

    await new PersistedIngestionService(store, new ConfigurableProvider([initialListing])).run();
    const summary = await new PersistedIngestionService(store, new ConfigurableProvider([updatedListing])).run();

    expect(summary).toEqual({
      profilesProcessed: 1,
      listingsNew: 0,
      listingsUpdated: 1,
      evaluationsCreated: 0,
      evaluationsUpdated: 1,
      errors: [],
    });
    expect(store.listings.get("EBAY:ebay-raw-2")?.price).toBe(185);
    expect(store.evaluations.size).toBe(1);
  });

  it("returns a structured error when the provider is not configured", async () => {
    const profile = makeProfile();
    const store = new MemoryStore([profile], [makeMarket()]);
    const service = new PersistedIngestionService(store, new ConfigurableProvider([], false));

    const summary = await service.run();

    expect(summary.profilesProcessed).toBe(1);
    expect(summary.listingsNew).toBe(0);
    expect(summary.evaluationsCreated).toBe(0);
    expect(summary.errors).toEqual([
      {
        message: "Listing provider is not configured.",
      },
    ]);
  });
});
