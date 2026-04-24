import { describe, expect, it } from "vitest";
import { decideListing } from "../lib/modules/decisions";
import { makeClassification, makeListing, makeMarket, makeNormalized, makeScoring, makeVisibility } from "./helpers/domain-fixtures";

describe("decision", () => {
  it("high score and low risk leads to BUY", () => {
    const listing = makeListing({ sellerRating: 99.5 });
    const decision = decideListing(
      "prof_test",
      listing,
      makeNormalized({ totalAcquisitionCost: 120 }),
      makeScoring({ totalScore: 92, riskPenalty: 0 }),
      makeClassification({ confidence: 0.91, flags: [] }),
      makeVisibility({ visibilityLevel: "primary_feed" }),
      makeMarket({ medianPrice: 310, feeRate: 0.1, sellThroughRate: 0.75 }),
    );

    expect(decision.status).toBe("BUY");
  });

  it("medium score with Best Offer available leads to NEGOTIATE", () => {
    const listing = makeListing({ bestOfferAvailable: true, sellerRating: 98.1 });
    const decision = decideListing(
      "prof_test",
      listing,
      makeNormalized({ totalAcquisitionCost: 170 }),
      makeScoring({ totalScore: 67 }),
      makeClassification({ flags: [] }),
      makeVisibility({ visibilityLevel: "primary_feed" }),
      makeMarket({ medianPrice: 290, feeRate: 0.1, sellThroughRate: 0.66 }),
    );

    expect(decision.status).toBe("NEGOTIATE");
  });

  it("low score becomes SKIP or WATCH depending on visibility", () => {
    const listing = makeListing();
    const hiddenDecision = decideListing(
      "prof_test",
      listing,
      makeNormalized({ totalAcquisitionCost: 220 }),
      makeScoring({ totalScore: 35 }),
      makeClassification(),
      makeVisibility({ visibilityLevel: "hidden", isVisible: false }),
      makeMarket({ medianPrice: 230, sellThroughRate: 0.4 }),
    );
    const secondaryDecision = decideListing(
      "prof_test",
      listing,
      makeNormalized({ totalAcquisitionCost: 220 }),
      makeScoring({ totalScore: 35 }),
      makeClassification(),
      makeVisibility({ visibilityLevel: "secondary_feed", isVisible: true }),
      makeMarket({ medianPrice: 230, sellThroughRate: 0.4 }),
    );

    expect(hiddenDecision.status).toBe("SKIP");
    expect(secondaryDecision.status).toBe("WATCH");
  });
});
