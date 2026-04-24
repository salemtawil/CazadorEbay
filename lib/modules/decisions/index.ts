import type {
  Classification,
  Decision,
  Listing,
  ListingNormalized,
  MarketSnapshot,
  ScoreBreakdown,
  VisibilityAssessment,
} from "@/lib/modules/contracts";

export function decideListing(
  profileId: string,
  listing: Listing,
  normalized: ListingNormalized,
  scoring: ScoreBreakdown,
  classification: Classification,
  visibility: VisibilityAssessment,
  market: MarketSnapshot,
): Decision {
  const expectedResale = market.medianPrice * (1 - market.feeRate);
  const expectedMargin = expectedResale - normalized.totalAcquisitionCost;
  const confidence = Math.max(0.4, Math.min(0.98, classification.confidence * (scoring.totalScore / 100)));
  const notes = [
    `Expected resale net of fees: ${expectedResale.toFixed(0)}`,
    `Expected gross margin before refurbishment: ${expectedMargin.toFixed(0)}`,
  ];

  let status: Decision["status"] = "SKIP";

  if (visibility.visibilityLevel === "hidden") {
    status = "SKIP";
    notes.push("Visibility rules kept this listing out of the actionable feeds.");
  } else if (scoring.totalScore >= 80 && expectedMargin >= 120 && listing.sellerRating >= 98) {
    status = "BUY";
  } else if (
    ((scoring.totalScore >= 70 && expectedMargin >= 80) ||
      (scoring.totalScore >= 65 && expectedMargin >= 50 && Boolean(listing.bestOfferAvailable))) &&
    market.sellThroughRate >= 0.55
  ) {
    status = "NEGOTIATE";
  } else if (scoring.totalScore >= 60 && expectedMargin >= 40) {
    status = "REVIEW";
  } else if (visibility.visibilityLevel === "secondary_feed" || scoring.totalScore >= 50) {
    status = "WATCH";
  }

  if (classification.flags.includes("risky_condition")) {
    status = status === "BUY" ? "NEGOTIATE" : "REVIEW";
    notes.push("Condition risk reduced the aggressiveness of the decision.");
  }

  if (normalized.itemType === "REPLACEMENT_PART_ONLY") {
    status = status === "BUY" ? "NEGOTIATE" : "WATCH";
    notes.push("Replacement-part-only inventory cannot be treated as a primary buy candidate.");
  }

  const maxBid = Math.max(0, expectedResale * 0.72 - listing.shippingCost);
  const recommendedOffer = Math.max(0, Math.min(listing.price, maxBid * 0.92));

  return {
    listingId: listing.id,
    profileId,
    status,
    confidence: Number(confidence.toFixed(2)),
    expectedResale: Number(expectedResale.toFixed(0)),
    expectedMargin: Number(expectedMargin.toFixed(0)),
    maxBid: Number(maxBid.toFixed(0)),
    recommendedOffer: Number(recommendedOffer.toFixed(0)),
    notes,
  };
}
