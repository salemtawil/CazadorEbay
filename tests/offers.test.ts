import { describe, expect, it } from "vitest";
import { fixtureListings, fixtureMarket, fixtureProfiles } from "../lib/fixtures/seed-data";
import type { Classification, Decision, ScoreBreakdown } from "../lib/modules/contracts";
import { planOffer } from "../lib/modules/offers";

function makeClassification(overrides: Partial<Classification> = {}): Classification {
  return {
    listingId: "lst_offer",
    brand: "NINTENDO",
    model: "SWITCH OLED",
    confidence: 0.86,
    flags: [],
    notes: [],
    ...overrides,
  };
}

function makeScoring(profileId: string, overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    listingId: "lst_offer",
    profileId,
    totalScore: 84,
    priceScore: 88,
    demandScore: 80,
    trustScore: 82,
    fitScore: 83,
    liquidityScore: 78,
    riskPenalty: 2,
    confidencePenalty: 0,
    reasoning: [],
    ...overrides,
  };
}

function makeDecision(profileId: string, overrides: Partial<Decision> = {}): Decision {
  return {
    listingId: "lst_offer",
    profileId,
    status: "BUY",
    confidence: 0.87,
    expectedResale: 245,
    expectedMargin: 42,
    maxBid: 210,
    recommendedOffer: 198,
    notes: [],
    ...overrides,
  };
}

describe("offer engine", () => {
  it("uses buy_now for clear bargains with urgency and no negotiation path", () => {
    const profile = fixtureProfiles[0]!;
    const listing = {
      ...fixtureListings[0]!,
      price: 176,
      shippingCost: 10,
      bestOfferAvailable: false,
      scrapedAt: "2026-04-24T08:00:00.000Z",
      endAt: "2026-04-24T12:00:00.000Z",
    };
    const offer = planOffer({
      profile,
      listing,
      market: fixtureMarket[0]!,
      classification: makeClassification(),
      scoring: makeScoring(profile.id, { totalScore: 91 }),
      decision: makeDecision(profile.id, { expectedMargin: 55, maxBid: 220 }),
    });

    expect(offer.offerStrategy).toBe("buy_now");
    expect(offer.recommendedOffer).toBe(listing.price + listing.shippingCost);
  });

  it("does not invent negotiation when Best Offer is unavailable", () => {
    const profile = fixtureProfiles[1]!;
    const listing = {
      ...fixtureListings[2]!,
      bestOfferAvailable: false,
    };
    const offer = planOffer({
      profile,
      listing,
      market: fixtureMarket[1]!,
      classification: makeClassification(),
      scoring: makeScoring(profile.id, { totalScore: 74 }),
      decision: makeDecision(profile.id, { status: "NEGOTIATE", recommendedOffer: 300 }),
    });

    expect(offer.offerStrategy).toBe("watch");
    expect(offer.recommendedOffer).toBeNull();
  });

  it("reduces aggressiveness when risk is high", () => {
    const profile = fixtureProfiles[2]!;
    const listing = {
      ...fixtureListings[4]!,
      bestOfferAvailable: true,
    };
    const offer = planOffer({
      profile,
      listing,
      market: fixtureMarket[2]!,
      classification: makeClassification({ confidence: 0.61, flags: ["risky_condition", "seller_trust"] }),
      scoring: makeScoring(profile.id, { totalScore: 73 }),
      decision: makeDecision(profile.id, { status: "REVIEW", confidence: 0.58 }),
    });

    expect(["watch", "skip"]).toContain(offer.offerStrategy);
    expect(offer.offerConfidence).toBeLessThan(0.75);
  });

  it("makes reseller walk-away price stricter than buyer mode", () => {
    const reseller = fixtureProfiles[0]!;
    const buyer = {
      ...fixtureProfiles[0]!,
      id: "prof_buyer",
      strategyMode: "buy_and_hold" as const,
      minResaleMarginPct: 8,
      maxBudget: 320,
    };
    const listing = {
      ...fixtureListings[0]!,
      bestOfferAvailable: true,
    };

    const resellerOffer = planOffer({
      profile: reseller,
      listing,
      market: fixtureMarket[0]!,
      classification: makeClassification(),
      scoring: makeScoring(reseller.id),
      decision: makeDecision(reseller.id, { maxBid: 210 }),
    });

    const buyerOffer = planOffer({
      profile: buyer,
      listing,
      market: fixtureMarket[0]!,
      classification: makeClassification(),
      scoring: makeScoring(buyer.id),
      decision: makeDecision(buyer.id, { profileId: buyer.id, maxBid: 230 }),
    });

    expect(resellerOffer.walkAwayPrice).not.toBeNull();
    expect(buyerOffer.walkAwayPrice).not.toBeNull();
    expect((resellerOffer.walkAwayPrice ?? 0)).toBeLessThan((buyerOffer.walkAwayPrice ?? 0));
  });
});
