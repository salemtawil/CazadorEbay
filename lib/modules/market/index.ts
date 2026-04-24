import type { Listing, MarketSnapshot } from "@/lib/modules/contracts";

export function getMarketSnapshot(listing: Listing, snapshots: MarketSnapshot[]): MarketSnapshot {
  const snapshot = snapshots.find(
    (item) => item.marketplace === listing.marketplace && item.category === listing.category,
  );

  if (!snapshot) {
    throw new Error(`Missing market snapshot for ${listing.marketplace}/${listing.category}`);
  }

  return snapshot;
}

