import type { Listing, ListingNormalized } from "@/lib/modules/contracts";

export function getTotalAcquisitionCost(listing: Listing): number {
  return listing.price + listing.shippingCost;
}

export function normalizeListings(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => getTotalAcquisitionCost(a) - getTotalAcquisitionCost(b));
}

export function normalizeListing(listing: Listing): ListingNormalized {
  const haystack = `${listing.title} ${listing.subtitle ?? ""}`.toLowerCase();

  let itemType: ListingNormalized["itemType"] = "STANDARD";

  if (/for parts|parts only|not working|as is|untested/.test(haystack)) {
    itemType = "FOR_PARTS_NOT_WORKING";
  } else if (/replacement part|shell only|board only|motherboard|screen only/.test(haystack)) {
    itemType = "REPLACEMENT_PART_ONLY";
  } else if (/no battery|missing|incomplete|body only|no charger|no dock|unboxed/.test(haystack)) {
    itemType = "INCOMPLETE_ITEM";
  } else if (/box only|empty box|packaging only|case only|charger only|dock only|strap only|accessory/.test(haystack)) {
    itemType = "ACCESSORY_ONLY";
  }

  return {
    listingId: listing.id,
    category: listing.category,
    normalizedCondition: listing.condition,
    itemType,
    totalAcquisitionCost: getTotalAcquisitionCost(listing),
  };
}
