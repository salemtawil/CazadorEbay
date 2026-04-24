import type {
  Classification,
  Listing,
  ListingNormalized,
  MarketSnapshot,
  ScoreBreakdown,
  SearchProfile,
} from "@/lib/modules/contracts";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function scoreListing(
  listing: Listing,
  normalized: ListingNormalized,
  profile: SearchProfile,
  classification: Classification,
  market: MarketSnapshot,
): ScoreBreakdown {
  const discountRatio = (market.medianPrice - normalized.totalAcquisitionCost) / market.medianPrice;
  const priceScore = clamp(55 + discountRatio * 180);
  const demandScore = clamp(market.demandIndex * 10);
  const trustScore = clamp(listing.sellerRating - classification.flags.length * 8);
  const fitScore = clamp(
    65 +
      (profile.keywords.some((keyword) => listing.title.toLowerCase().includes(keyword.toLowerCase()))
        ? 18
        : -8) +
      (classification.confidence - profile.minConfidence) * 100,
  );
  const liquidityScore = clamp(market.sellThroughRate * 100);
  const totalScore = clamp(
    priceScore * 0.3 + demandScore * 0.2 + trustScore * 0.15 + fitScore * 0.2 + liquidityScore * 0.15,
  );

  const shippingRatio = normalized.totalAcquisitionCost === 0 ? 0 : listing.shippingCost / normalized.totalAcquisitionCost;
  const shippingPenalty = shippingRatio >= 0.3 ? 12 : shippingRatio >= 0.2 ? 6 : shippingRatio >= 0.12 ? 2 : 0;
  const sampleSizePenalty =
    market.sampleSize === undefined ? 0 : market.sampleSize < 8 ? 10 : market.sampleSize < 15 ? 6 : market.sampleSize < 25 ? 2 : 0;
  const itemTypePenalty =
    normalized.itemType === "STANDARD"
      ? 0
      : normalized.itemType === "ACCESSORY_ONLY"
        ? 8
        : normalized.itemType === "REPLACEMENT_PART_ONLY"
          ? 18
          : 22;
  const conditionPenalty = classification.flags.includes("risky_condition") ? 8 : 0;
  const riskPenalty = shippingPenalty + sampleSizePenalty + conditionPenalty + itemTypePenalty;
  const confidencePenalty = classification.confidence < profile.minConfidence
    ? Number(((profile.minConfidence - classification.confidence) * 30).toFixed(1))
    : 0;

  return {
    listingId: listing.id,
    profileId: profile.id,
    totalScore: Number(Math.max(0, totalScore - riskPenalty - confidencePenalty).toFixed(1)),
    priceScore: Number(priceScore.toFixed(1)),
    demandScore: Number(demandScore.toFixed(1)),
    trustScore: Number(trustScore.toFixed(1)),
    fitScore: Number(fitScore.toFixed(1)),
    liquidityScore: Number(liquidityScore.toFixed(1)),
    riskPenalty: Number(riskPenalty.toFixed(1)),
    confidencePenalty: Number(confidencePenalty.toFixed(1)),
    reasoning: [
      `Discount to market median: ${(discountRatio * 100).toFixed(1)}%`,
      `Demand index ${market.demandIndex.toFixed(1)} with sell-through ${(market.sellThroughRate * 100).toFixed(0)}%`,
      `Seller rating ${listing.sellerRating.toFixed(1)} with ${listing.sellerSalesCount} historical sales`,
      `Risk penalty ${riskPenalty.toFixed(1)} and confidence penalty ${confidencePenalty.toFixed(1)}`,
    ],
  };
}
