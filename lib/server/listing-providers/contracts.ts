import type { ListingRaw, SearchProfile } from "@/lib/modules/contracts";

export interface ListingProviderSearchInput {
  profile: SearchProfile;
  limit?: number;
  signal?: AbortSignal;
}

export interface ListingProvider {
  readonly source: string;
  isConfigured(): boolean;
  searchListings(input: ListingProviderSearchInput): Promise<ListingRaw[]>;
}
