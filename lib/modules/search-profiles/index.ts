import type { Listing, SearchProfile } from "@/lib/modules/contracts";
import { normalizeListing } from "@/lib/modules/listings";

export function getActiveProfiles(profiles: SearchProfile[]): SearchProfile[] {
  return profiles;
}

export function listingMatchesProfile(listing: Listing, profile: SearchProfile): boolean {
  const haystack = `${listing.title} ${listing.subtitle ?? ""}`.toLowerCase();
  const normalized = normalizeListing(listing);
  const specialCaseItem =
    normalized.itemType === "FOR_PARTS_NOT_WORKING" ||
    normalized.itemType === "REPLACEMENT_PART_ONLY" ||
    normalized.itemType === "INCOMPLETE_ITEM" ||
    normalized.itemType === "ACCESSORY_ONLY";
  const hasKeyword = profile.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  const hasBlockedTerm = profile.blockedTerms.some((term) => {
    const blocked = haystack.includes(term.toLowerCase());
    return specialCaseItem ? blocked && !/(for parts|parts|untested|as is|missing|incomplete|accessory|charger only|dock only)/.test(term.toLowerCase()) : blocked;
  });
  const conditionOk = profile.preferredConditions.includes(listing.condition);
  const priceOk = listing.price >= profile.minPrice && listing.price <= profile.maxPrice;
  const categoryOk = profile.targetCategories.includes(listing.category);

  return hasKeyword && !hasBlockedTerm && conditionOk && priceOk && categoryOk;
}
