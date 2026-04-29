import type {
  Classification,
  EvaluationResult,
  Listing,
  ListingNormalized,
  MarketSnapshot,
  SearchProfile,
} from "@/lib/modules/contracts";
import { buildAlerts } from "@/lib/modules/alerts";
import { classifyListing } from "@/lib/modules/classification";
import { evaluateListingForProfile } from "@/lib/modules/evaluation";
import { normalizeListing } from "@/lib/modules/listings";
import type { ListingProvider } from "@/lib/server/listing-providers/contracts";
import { EbayBrowseListingProvider } from "@/lib/server/listing-providers/ebay";

export interface IngestionRunError {
  profileId?: string;
  message: string;
}

export interface IngestionRunSummary {
  profilesProcessed: number;
  listingsNew: number;
  listingsUpdated: number;
  evaluationsCreated: number;
  evaluationsUpdated: number;
  errors: IngestionRunError[];
}

export interface PersistedListingRecord {
  listing: Listing;
  created: boolean;
}

export interface PersistedEvaluationRecord {
  created: boolean;
}

export interface PersistedIngestionStore {
  loadActiveProfiles(): Promise<SearchProfile[]>;
  loadMarketSnapshots(): Promise<MarketSnapshot[]>;
  upsertListingRaw(listing: Listing): Promise<PersistedListingRecord>;
  upsertListingNormalized(
    listing: Listing,
    normalized: ListingNormalized,
    classification: Classification,
  ): Promise<void>;
  upsertListingEvaluation(
    evaluation: EvaluationResult,
    alerts: ReturnType<typeof buildAlerts>,
  ): Promise<PersistedEvaluationRecord>;
}

interface ProfileSearchResult {
  profile: SearchProfile;
  listings: Listing[];
}

interface ListingAggregate {
  listing: Listing;
  profileIds: Set<string>;
}

function listingKey(listing: Listing): string {
  return `${listing.marketplace}:${listing.externalId}`;
}

export class PersistedIngestionService {
  constructor(
    private readonly store: PersistedIngestionStore,
    private readonly provider: ListingProvider = new EbayBrowseListingProvider(),
  ) {}

  async run(): Promise<IngestionRunSummary> {
    const profiles = await this.store.loadActiveProfiles();
    const summary: IngestionRunSummary = {
      profilesProcessed: profiles.length,
      listingsNew: 0,
      listingsUpdated: 0,
      evaluationsCreated: 0,
      evaluationsUpdated: 0,
      errors: [],
    };

    if (profiles.length === 0) {
      console.warn("[ingest] No active profiles found.");
      return summary;
    }

    if (!this.provider.isConfigured()) {
      const message = "Listing provider is not configured.";
      console.warn("[ingest] Provider not configured.", { provider: this.provider.source });
      summary.errors.push({ message });
      return summary;
    }

    const profileResults = await this.loadProfileResults(profiles, summary);
    const listingsByKey = this.aggregateListings(profileResults);
    const persistedListings = new Map<string, Listing>();

    for (const [key, aggregate] of listingsByKey) {
      const persisted = await this.store.upsertListingRaw(aggregate.listing);
      persistedListings.set(key, persisted.listing);

      if (persisted.created) {
        summary.listingsNew += 1;
      } else {
        summary.listingsUpdated += 1;
      }

      const normalized = normalizeListing(persisted.listing);
      const classification = classifyListing(persisted.listing, normalized);
      await this.store.upsertListingNormalized(persisted.listing, normalized, classification);
    }

    const marketSnapshots = await this.store.loadMarketSnapshots();

    for (const result of profileResults) {
      for (const listing of result.listings) {
        const persistedListing = persistedListings.get(listingKey(listing));

        if (!persistedListing) {
          summary.errors.push({
            profileId: result.profile.id,
            message: `Listing ${listing.externalId} was not persisted before evaluation.`,
          });
          continue;
        }

        try {
          const evaluation = evaluateListingForProfile(persistedListing, result.profile, {
            users: [],
            profiles: [result.profile],
            listings: [persistedListing],
            market: marketSnapshots,
          });

          if (!evaluation) {
            continue;
          }

          const alerts = buildAlerts(
            result.profile.id,
            evaluation.listingRaw,
            evaluation.classification,
            evaluation.scoring,
            evaluation.visibility,
            evaluation.decision,
          );
          const persistedEvaluation = await this.store.upsertListingEvaluation(evaluation, alerts);

          if (persistedEvaluation.created) {
            summary.evaluationsCreated += 1;
          } else {
            summary.evaluationsUpdated += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown-error";
          console.error("[ingest] Failed to evaluate listing for profile.", {
            profileId: result.profile.id,
            listingId: persistedListing.id,
            error: message,
          });
          summary.errors.push({
            profileId: result.profile.id,
            message: `Listing ${persistedListing.id}: ${message}`,
          });
        }
      }
    }

    console.info("[ingest] Run completed.", {
      provider: this.provider.source,
      profilesProcessed: summary.profilesProcessed,
      listingsNew: summary.listingsNew,
      listingsUpdated: summary.listingsUpdated,
      evaluationsCreated: summary.evaluationsCreated,
      evaluationsUpdated: summary.evaluationsUpdated,
      errors: summary.errors.length,
    });

    return summary;
  }

  private async loadProfileResults(
    profiles: SearchProfile[],
    summary: IngestionRunSummary,
  ): Promise<ProfileSearchResult[]> {
    const results: ProfileSearchResult[] = [];

    for (const profile of profiles) {
      try {
        const listings = this.dedupeListings(await this.provider.searchListings({ profile }));
        if (listings.length === 0) {
          console.info("[ingest] Provider returned 0 results for profile.", {
            provider: this.provider.source,
            profileId: profile.id,
          });
        }

        results.push({
          profile,
          listings,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown-error";
        console.error("[ingest] Provider search failed for profile.", {
          provider: this.provider.source,
          profileId: profile.id,
          error: message,
        });
        summary.errors.push({
          profileId: profile.id,
          message,
        });
      }
    }

    return results;
  }

  private dedupeListings(listings: Listing[]): Listing[] {
    const deduped = new Map<string, Listing>();

    for (const listing of listings) {
      deduped.set(listingKey(listing), listing);
    }

    return [...deduped.values()];
  }

  private aggregateListings(results: ProfileSearchResult[]): Map<string, ListingAggregate> {
    const deduped = new Map<string, ListingAggregate>();

    for (const result of results) {
      for (const listing of result.listings) {
        const key = listingKey(listing);
        const existing = deduped.get(key);

        if (existing) {
          existing.profileIds.add(result.profile.id);
          existing.listing = listing;
          continue;
        }

        deduped.set(key, {
          listing,
          profileIds: new Set([result.profile.id]),
        });
      }
    }

    return deduped;
  }
}
