import { describe, expect, it } from "vitest";
import { generateInternalAlerts } from "../lib/server/internal-alerts";
import { makeEvaluation, makeListing, makeOffer, makeScoring } from "./helpers/domain-fixtures";

describe("internal alerts generation", () => {
  it("creates an alert for a new high-score opportunity", () => {
    const evaluation = makeEvaluation({
      scoring: makeScoring({ totalScore: 88 }),
      offer: makeOffer({ offerStrategy: "offer_now" }),
    });

    const alerts = generateInternalAlerts({
      listingCreated: false,
      previousListing: null,
      currentListing: evaluation.listingRaw,
      previousEvaluation: null,
      currentEvaluation: evaluation,
    });

    expect(alerts.some((alert) => alert.alertType === "NEW_HIGH_SCORE_OPPORTUNITY")).toBe(true);
  });

  it("creates an alert when the total price drops materially", () => {
    const evaluation = makeEvaluation({
      listingRaw: makeListing({ price: 180, shippingCost: 10 }),
    });

    const alerts = generateInternalAlerts({
      listingCreated: false,
      previousListing: makeListing({ price: 210, shippingCost: 15 }),
      currentListing: evaluation.listingRaw,
      previousEvaluation: {
        id: "prev",
        totalScore: 70,
        offerStrategy: "watch",
        decisionStatus: "WATCH",
        visibilityLevel: "secondary_feed",
      },
      currentEvaluation: evaluation,
    });

    expect(alerts.some((alert) => alert.alertType === "PRICE_DROPPED")).toBe(true);
  });

  it("does not duplicate alerts when nothing material changed", () => {
    const evaluation = makeEvaluation({
      scoring: makeScoring({ totalScore: 84 }),
      offer: makeOffer({ offerStrategy: "offer_now" }),
      listingRaw: makeListing({ price: 200, shippingCost: 10 }),
    });

    const alerts = generateInternalAlerts({
      listingCreated: false,
      previousListing: makeListing({ price: 200, shippingCost: 10 }),
      currentListing: evaluation.listingRaw,
      previousEvaluation: {
        id: "prev",
        totalScore: 84,
        offerStrategy: "offer_now",
        decisionStatus: "NEGOTIATE",
        visibilityLevel: "primary_feed",
      },
      currentEvaluation: evaluation,
    });

    expect(alerts).toEqual([]);
  });

  it("creates an alert when decision upgrades to buy now", () => {
    const evaluation = makeEvaluation({
      offer: makeOffer({ offerStrategy: "buy_now" }),
    });

    const alerts = generateInternalAlerts({
      listingCreated: false,
      previousListing: evaluation.listingRaw,
      currentListing: evaluation.listingRaw,
      previousEvaluation: {
        id: "prev",
        totalScore: 86,
        offerStrategy: "watch",
        decisionStatus: "WATCH",
        visibilityLevel: "primary_feed",
      },
      currentEvaluation: evaluation,
    });

    expect(alerts.some((alert) => alert.alertType === "DECISION_UPGRADED_TO_BUY_NOW")).toBe(true);
  });
});
