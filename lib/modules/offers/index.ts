import type {
  Classification,
  Decision,
  Listing,
  MarketSnapshot,
  OfferPlan,
  ScoreBreakdown,
  SearchProfile,
} from "@/lib/modules/contracts";

interface PlanOfferInput {
  profile: SearchProfile;
  listing: Listing;
  market: MarketSnapshot;
  classification: Classification;
  scoring: ScoreBreakdown;
  decision: Decision;
}

function clampMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

function getCurrentTotalPrice(listing: Listing): number {
  return listing.price + listing.shippingCost;
}

function getMarketP25(market: MarketSnapshot): number {
  return market.p25Price ?? Math.round((market.medianPrice + market.lowPrice) / 2);
}

function getMarketP10(market: MarketSnapshot): number {
  return market.p10Price ?? market.lowPrice;
}

function getListingAgeDays(listing: Listing): number | null {
  const age = listing.attributes.listingAgeDays;
  return typeof age === "number" ? age : null;
}

function getUrgencyScore(listing: Listing): number {
  if (!listing.endAt) {
    return 0.35;
  }

  const end = new Date(listing.endAt).getTime();
  const seen = new Date(listing.scrapedAt).getTime();
  const hoursLeft = (end - seen) / (1000 * 60 * 60);

  if (hoursLeft <= 6) {
    return 1;
  }

  if (hoursLeft <= 24) {
    return 0.8;
  }

  if (hoursLeft <= 72) {
    return 0.6;
  }

  return 0.35;
}

function getRiskPenalty(classification: Classification, decision: Decision): number {
  let penalty = 0;

  if (classification.flags.includes("risky_condition")) {
    penalty += 0.12;
  }

  if (classification.flags.includes("seller_trust")) {
    penalty += 0.06;
  }

  if (decision.status === "REVIEW") {
    penalty += 0.04;
  }

  if (decision.status === "SKIP") {
    penalty += 0.2;
  }

  return penalty;
}

function getRole(profile: SearchProfile): "reseller" | "buyer" {
  return profile.strategyMode === "flip" || profile.strategyMode === "arbitrage" ? "reseller" : "buyer";
}

function computeMarginPct(cost: number, resale: number): number {
  if (cost <= 0) {
    return 0;
  }

  return ((resale - cost) / cost) * 100;
}

export function planOffer({
  profile,
  listing,
  market,
  classification,
  scoring,
  decision,
}: PlanOfferInput): OfferPlan {
  const currentTotalPrice = getCurrentTotalPrice(listing);
  const median = market.medianPrice;
  const p25 = getMarketP25(market);
  const p10 = getMarketP10(market);
  const urgency = getUrgencyScore(listing);
  const ageDays = getListingAgeDays(listing);
  const riskPenalty = getRiskPenalty(classification, decision);
  const confidencePenalty = Math.max(0, 0.12 - (classification.confidence - profile.minConfidence));
  const role = getRole(profile);
  const targetMarginPct = profile.minResaleMarginPct ?? (role === "reseller" ? 18 : 8);
  const maxBudget = profile.maxBudget ?? Number.POSITIVE_INFINITY;
  const marginPctAtCurrentPrice = computeMarginPct(currentTotalPrice, decision.expectedResale);
  const bestOfferAvailable = Boolean(listing.bestOfferAvailable);
  const reasoning: string[] = [];

  const baseWalkAway =
    role === "reseller"
      ? Math.min(decision.maxBid, decision.expectedResale / (1 + targetMarginPct / 100))
      : Math.min(decision.maxBid, median * 0.96);

  const confidenceAdjustment = 1 - Math.min(0.18, confidencePenalty + riskPenalty);
  const urgencyPremium = urgency >= 0.8 ? 1.03 : 1;
  const staleDiscount = ageDays !== null && ageDays >= 14 ? 0.94 : ageDays !== null && ageDays >= 7 ? 0.97 : 1;

  const walkAwayPrice = clampMoney(Math.min(maxBudget, baseWalkAway * confidenceAdjustment * urgencyPremium));
  const anchorOffer = bestOfferAvailable
    ? clampMoney(Math.min(walkAwayPrice, Math.max(p10, p25 * staleDiscount * (1 - riskPenalty))))
    : null;

  let recommendedOffer = bestOfferAvailable
    ? clampMoney(Math.min(walkAwayPrice, Math.max(anchorOffer ?? 0, p25 * (urgency >= 0.8 ? 0.99 : 0.95))))
    : null;

  let offerStrategy: OfferPlan["offerStrategy"] = "watch";

  if (decision.status === "SKIP" || walkAwayPrice <= 0 || currentTotalPrice > maxBudget) {
    offerStrategy = "skip";
    recommendedOffer = null;
    reasoning.push("Budget, risk or decision constraints make the listing non-actionable.");
  } else if (!bestOfferAvailable) {
    if (
      decision.status === "BUY" &&
      currentTotalPrice <= walkAwayPrice &&
      riskPenalty < 0.08 &&
      urgency >= 0.8
    ) {
      offerStrategy = "buy_now";
      reasoning.push("Clear bargain with high urgency and no Best Offer path. Do not risk losing it.");
    } else {
      offerStrategy = "watch";
      recommendedOffer = null;
      reasoning.push("Best Offer is unavailable, so the engine avoids inventing a negotiation path.");
    }
  } else if (riskPenalty >= 0.16 || classification.confidence < Math.max(0.58, profile.minConfidence - 0.08)) {
    offerStrategy = decision.status === "BUY" ? "watch" : "skip";
    recommendedOffer = offerStrategy === "skip" ? null : anchorOffer;
    reasoning.push("Risk or low confidence reduces aggressiveness and blocks a strong offer.");
  } else if (decision.status === "BUY" && currentTotalPrice <= walkAwayPrice && urgency >= 0.8) {
    offerStrategy = "buy_now";
    recommendedOffer = clampMoney(currentTotalPrice);
    reasoning.push("The listing is cheap enough relative to walk-away price and urgency is high.");
  } else if (decision.status === "BUY" || decision.status === "NEGOTIATE" || decision.status === "REVIEW") {
    offerStrategy = "offer_now";
    reasoning.push("Negotiation path is available and the listing remains actionable.");
  } else {
    offerStrategy = "watch";
    recommendedOffer = anchorOffer;
    reasoning.push("Signals are not strong enough for an immediate offer.");
  }

  if (marginPctAtCurrentPrice < targetMarginPct && role === "reseller") {
    offerStrategy = bestOfferAvailable ? "offer_now" : "watch";
    if (!bestOfferAvailable) {
      recommendedOffer = null;
    }
    reasoning.push("Reseller mode requires a tighter margin, so walk-away price is capped more aggressively.");
  }

  if (currentTotalPrice <= p10 && urgency >= 0.8 && riskPenalty < 0.08) {
    offerStrategy = "buy_now";
    recommendedOffer = clampMoney(currentTotalPrice);
    reasoning.push("Price is at or below deep-discount territory and urgency is high.");
  }

  const offerConfidence = Number(
    Math.max(
      0.2,
      Math.min(
        0.97,
        0.45 +
          decision.confidence * 0.25 +
          (scoring.totalScore / 100) * 0.2 +
          (urgency * 0.08) -
          riskPenalty -
          confidencePenalty,
      ),
    ).toFixed(2),
  );

  reasoning.unshift(
    `Current total price ${currentTotalPrice} vs median ${median}, p25 ${p25}, p10 ${p10}.`,
  );

  if (ageDays !== null) {
    reasoning.push(`Listing age signal: ${ageDays} day(s) on market.`);
  }

  if (bestOfferAvailable) {
    reasoning.push("Best Offer is available, so negotiation is a valid path.");
  }

  return {
    listingId: decision.listingId,
    profileId: decision.profileId,
    offerStrategy,
    anchorOffer,
    recommendedOffer,
    walkAwayPrice,
    offerConfidence,
    reasoning,
  };
}
