import { describe, expect, it } from "vitest";
import { buildOpportunityInspection } from "../lib/modules/opportunity-inspection";
import { makeDecision, makeEvaluation, makeOffer, makeScoring, makeVisibility } from "./helpers/domain-fixtures";

describe("opportunity inspection", () => {
  it("derives inspection fields from an evaluation result", () => {
    const evaluation = makeEvaluation({
      listingNormalized: {
        listingId: "lst_test",
        category: "gaming-handhelds",
        normalizedCondition: "USED_GOOD",
        itemType: "ACCESSORY_ONLY",
        totalAcquisitionCost: 95,
      },
      scoring: makeScoring({
        totalScore: 81,
        fitScore: 76,
        riskPenalty: 6,
        confidencePenalty: 1.5,
        reasoning: ["Strong price gap", "Strong price gap"],
      }),
      visibility: makeVisibility({
        suppressionReasons: ["Low seller volume"],
      }),
      decision: makeDecision({
        notes: ["Watch seller history"],
      }),
      offer: makeOffer({
        reasoning: ["Negotiation room exists"],
      }),
    });

    const inspection = buildOpportunityInspection(evaluation);

    expect(inspection).toMatchObject({
      listingState: "accessory_only",
      specialItemType: "accessory",
      comparableMatchConfidence: evaluation.classification.confidence,
      profileCompatibility: 0.76,
      rawScore: 88.5,
      uiScore: 81,
    });
    expect(inspection.driversPositive).toEqual(["Strong price gap", "Negotiation room exists"]);
    expect(inspection.driversNegative).toEqual(["Low seller volume", "Watch seller history"]);
    expect(inspection.updatedAt).toBe(evaluation.listingRaw.scrapedAt);
  });
});
