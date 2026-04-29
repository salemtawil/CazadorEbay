import { fixtureListings } from "@/lib/fixtures/seed-data";
import type { ListingRaw, SearchProfile } from "@/lib/modules/contracts";
import type { ListingProvider } from "@/lib/server/listing-providers/contracts";
import { EbayBrowseListingProvider } from "@/lib/server/listing-providers/ebay";
import { shouldAllowFixtureFallback, warnOnce } from "@/lib/server/runtime-config";

function dedupeListings(listings: ListingRaw[]): ListingRaw[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = `${listing.marketplace}:${listing.externalId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export class ListingIngestionService {
  constructor(
    private readonly provider: ListingProvider = new EbayBrowseListingProvider(),
    private readonly fallbackListings: ListingRaw[] = fixtureListings,
  ) {}

  async loadListings(profiles: SearchProfile[]): Promise<ListingRaw[]> {
    const allowFixtureFallback = shouldAllowFixtureFallback();

    if (!this.provider.isConfigured()) {
      if (allowFixtureFallback) {
        warnOnce("[listing-ingestion] Provider not configured, using fixture fallback.", {
          provider: this.provider.source,
        });
        return this.fallbackListings;
      }

      warnOnce("[listing-ingestion] Provider not configured, returning no listings.", {
        provider: this.provider.source,
      });
      return [];
    }

    try {
      const results = await Promise.all(
        profiles.map((profile) =>
          this.provider.searchListings({
            profile,
          }),
        ),
      );

      const listings = dedupeListings(results.flat());
      if (listings.length > 0) {
        return listings;
      }

      if (allowFixtureFallback) {
        warnOnce("[listing-ingestion] Provider returned no listings, using fixture fallback.", {
          provider: this.provider.source,
        });
        return this.fallbackListings;
      }

      warnOnce("[listing-ingestion] Provider returned no listings.");
      return [];
    } catch (error) {
      if (allowFixtureFallback) {
        warnOnce("[listing-ingestion] Provider search failed, using fixture fallback.", {
          provider: this.provider.source,
          error: error instanceof Error ? error.message : "unknown-error",
        });
        return this.fallbackListings;
      }

      console.error("[listing-ingestion] Provider search failed.", {
        provider: this.provider.source,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      return [];
    }
  }
}

export const listingIngestionService = new ListingIngestionService();
