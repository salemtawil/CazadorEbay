import { describe, expect, it } from "vitest";
import { fixtureListings, fixtureProfiles } from "../lib/fixtures/seed-data";
import type { ListingRaw } from "../lib/modules/contracts";
import type { ListingProvider } from "../lib/server/listing-providers/contracts";
import { ListingIngestionService } from "../lib/server/listing-ingestion-service";

class DisabledProvider implements ListingProvider {
  readonly source = "disabled";

  isConfigured(): boolean {
    return false;
  }

  async searchListings(): Promise<ListingRaw[]> {
    return [];
  }
}

class FailingProvider implements ListingProvider {
  readonly source = "failing";

  isConfigured(): boolean {
    return true;
  }

  async searchListings(): Promise<ListingRaw[]> {
    throw new Error("provider failure");
  }
}

class WorkingProvider implements ListingProvider {
  readonly source = "working";

  isConfigured(): boolean {
    return true;
  }

  async searchListings(): Promise<ListingRaw[]> {
    return [
      {
        ...fixtureListings[0]!,
        id: "ebay-1",
        externalId: "ebay-1",
      },
      {
        ...fixtureListings[0]!,
        id: "ebay-dup",
        externalId: "ebay-1",
      },
    ];
  }
}

describe("listing ingestion service", () => {
  it("falls back to fixtures when the provider is not configured", async () => {
    const service = new ListingIngestionService(new DisabledProvider(), fixtureListings);

    const listings = await service.loadListings(fixtureProfiles);

    expect(listings).toEqual(fixtureListings);
  });

  it("falls back to fixtures when the provider fails", async () => {
    const service = new ListingIngestionService(new FailingProvider(), fixtureListings);

    const listings = await service.loadListings(fixtureProfiles);

    expect(listings).toEqual(fixtureListings);
  });

  it("deduplicates provider listings by marketplace and external id", async () => {
    const service = new ListingIngestionService(new WorkingProvider(), fixtureListings);

    const listings = await service.loadListings(fixtureProfiles);

    expect(listings).toHaveLength(1);
    expect(listings[0]!.externalId).toBe("ebay-1");
  });
});
