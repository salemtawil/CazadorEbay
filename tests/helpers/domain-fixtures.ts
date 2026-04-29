import type {
  Alert,
  Classification,
  Decision,
  EvaluationResult,
  Listing,
  ListingNormalized,
  MarketSnapshot,
  OfferPlan,
  ScoreBreakdown,
  SearchProfile,
  VisibilityAssessment,
} from "../../lib/modules/contracts";
import { fixtureListings, fixtureMarket, fixtureProfiles } from "../../lib/fixtures/seed-data";

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    ...fixtureListings[0]!,
    id: "lst_test",
    externalId: "ext-test",
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<SearchProfile> = {}): SearchProfile {
  return {
    ...fixtureProfiles[0]!,
    id: "prof_test",
    ...overrides,
  };
}

export function makeMarket(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    ...fixtureMarket[0]!,
    id: "market_test",
    ...overrides,
  };
}

export function makeNormalized(overrides: Partial<ListingNormalized> = {}): ListingNormalized {
  return {
    listingId: "lst_test",
    category: "gaming-handhelds",
    normalizedCondition: "USED_EXCELLENT",
    itemType: "STANDARD",
    totalAcquisitionCost: 180,
    ...overrides,
  };
}

export function makeClassification(overrides: Partial<Classification> = {}): Classification {
  return {
    listingId: "lst_test",
    brand: "NINTENDO",
    model: "SWITCH OLED",
    confidence: 0.86,
    flags: [],
    notes: [],
    ...overrides,
  };
}

export function makeScoring(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    listingId: "lst_test",
    profileId: "prof_test",
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

export function makeVisibility(overrides: Partial<VisibilityAssessment> = {}): VisibilityAssessment {
  return {
    listingId: "lst_test",
    profileId: "prof_test",
    visibilityLevel: "primary_feed",
    isVisible: true,
    suppressedByProfile: false,
    suppressionReasons: [],
    ...overrides,
  };
}

export function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    listingId: "lst_test",
    profileId: "prof_test",
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

export function makeOffer(overrides: Partial<OfferPlan> = {}): OfferPlan {
  return {
    listingId: "lst_test",
    profileId: "prof_test",
    offerStrategy: "offer_now",
    anchorOffer: 190,
    recommendedOffer: 198,
    walkAwayPrice: 205,
    offerConfidence: 0.84,
    reasoning: [],
    ...overrides,
  };
}

export function makeEvaluation(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  const listingRaw = overrides.listingRaw ?? makeListing();
  const profile = overrides.profile ?? makeProfile();
  const listingNormalized = overrides.listingNormalized ?? makeNormalized({ listingId: listingRaw.id, category: listingRaw.category });
  const market = overrides.market ?? makeMarket({ marketplace: listingRaw.marketplace, category: listingRaw.category });
  const classification = overrides.classification ?? makeClassification({ listingId: listingRaw.id });
  const visibility = overrides.visibility ?? makeVisibility({ listingId: listingRaw.id, profileId: profile.id });
  const scoring = overrides.scoring ?? makeScoring({ listingId: listingRaw.id, profileId: profile.id });
  const decision = overrides.decision ?? makeDecision({ listingId: listingRaw.id, profileId: profile.id });
  const offer = overrides.offer ?? makeOffer({ listingId: listingRaw.id, profileId: profile.id });
  const alerts = overrides.alerts ?? ([] as Alert[]);

  return {
    id: `${listingRaw.id}:${profile.id}`,
    listingRaw,
    listingNormalized,
    profile,
    market,
    classification,
    visibility,
    scoring,
    decision,
    offer,
    alerts,
    ...overrides,
  };
}
