import {
  fixtureListings,
  fixtureMarket,
  fixtureProfiles,
  fixtureUsers,
} from "@/lib/fixtures/seed-data";
import type { ListingRaw, OpportunityCatalog, SearchProfile } from "@/lib/modules/contracts";
import type { EvaluationResult } from "@/lib/modules/contracts";
import { listingIngestionService } from "@/lib/server/listing-ingestion-service";
import { evaluateCatalog } from "@/lib/modules/evaluation";

export interface OpportunityRepository {
  loadCatalog(): Promise<OpportunityCatalog>;
  loadPersistedEvaluations(): Promise<EvaluationResult[] | null>;
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

  async loadPersistedEvaluations(): Promise<EvaluationResult[] | null> {
    const catalog = await this.loadCatalog();
    return evaluateCatalog(catalog);
  }
}
