import { fixtureListings } from "@/lib/fixtures/seed-data";
import type { ListingRaw, SearchProfile } from "@/lib/modules/contracts";
import type { ListingProvider } from "@/lib/server/listing-providers/contracts";
import { EbayBrowseListingProvider } from "@/lib/server/listing-providers/ebay";

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
    if (!this.provider.isConfigured()) {
      return this.fallbackListings;
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
      return listings.length > 0 ? listings : this.fallbackListings;
    } catch {
      return this.fallbackListings;
    }
  }
}

export const listingIngestionService = new ListingIngestionService();
