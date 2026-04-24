import {
  fixtureListings,
  fixtureMarket,
  fixtureProfiles,
  fixtureUsers,
} from "@/lib/fixtures/seed-data";
import type { ListingRaw, OpportunityCatalog, SearchProfile } from "@/lib/modules/contracts";
import { listingIngestionService } from "@/lib/server/listing-ingestion-service";

export interface OpportunityRepository {
  loadCatalog(): Promise<OpportunityCatalog>;
}

export class FixtureOpportunityRepository implements OpportunityRepository {
  constructor(
    private readonly loadListings: (profiles: SearchProfile[]) => Promise<ListingRaw[]> = (profiles) =>
      listingIngestionService.loadListings(profiles),
  ) {}

  async loadCatalog(): Promise<OpportunityCatalog> {
    const listings = await this.loadListings(fixtureProfiles);

    return {
      users: fixtureUsers,
      profiles: fixtureProfiles,
      listings: listings.length > 0 ? listings : fixtureListings,
      market: fixtureMarket,
    };
  }
}
