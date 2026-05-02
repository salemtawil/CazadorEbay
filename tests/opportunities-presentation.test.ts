import { describe, expect, it } from "vitest";
import {
  buildOpportunityExplanation,
  filterOpportunities,
  sortOpportunities,
  translateOpportunityReason,
} from "@/lib/opportunities/presentation";
import { makeClassification, makeEvaluation, makeListing, makeOffer, makeProfile } from "./helpers/domain-fixtures";

describe("opportunities presentation", () => {
  it("filters opportunities by action decision", () => {
    const buyNow = makeEvaluation({
      id: "opp_buy_now",
      offer: makeOffer({ offerStrategy: "buy_now" }),
    });
    const offerNowOpportunity = makeEvaluation({
      id: "opp_make_offer",
      offer: makeOffer({ offerStrategy: "offer_now" }),
    });
    const watch = makeEvaluation({
      id: "opp_watch",
      offer: makeOffer({ offerStrategy: "watch" }),
    });

    const results = filterOpportunities([buyNow, offerNowOpportunity, watch], {
      query: "",
      decision: "buy_now",
      visibilityLevel: "all",
      specialItemType: "all",
      profile: "",
      source: "",
      visible: "all",
      sort: "ui_score_desc",
    });

    expect(results.map((opportunity) => opportunity.id)).toEqual(["opp_buy_now"]);
  });

  it("matches text search against title, brand/model and profile name", () => {
    const brandedOpportunity = makeEvaluation({
      id: "opp_brand_model",
      listingRaw: makeListing({ id: "lst_alpha", title: "Portable console bundle" }),
      classification: makeClassification({
        listingId: "lst_alpha",
        brand: "CANON",
        model: "A6400",
      }),
      profile: makeProfile({ id: "prof_camera", name: "Camera flips" }),
    });
    const otherOpportunity = makeEvaluation({
      id: "opp_other",
      listingRaw: makeListing({ id: "lst_beta", title: "DeWalt impact driver" }),
    });

    const results = filterOpportunities([brandedOpportunity, otherOpportunity], {
      query: "a6400",
      decision: "all",
      visibilityLevel: "all",
      specialItemType: "all",
      profile: "",
      source: "",
      visible: "all",
      sort: "ui_score_desc",
    });

    expect(results.map((opportunity) => opportunity.id)).toEqual(["opp_brand_model"]);
  });

  it("sorts opportunities by total price ascending", () => {
    const expensive = makeEvaluation({
      id: "opp_expensive",
      listingNormalized: {
        listingId: "lst_expensive",
        category: "gaming-handhelds",
        normalizedCondition: "USED_GOOD",
        itemType: "STANDARD",
        totalAcquisitionCost: 240,
      },
    });
    const cheap = makeEvaluation({
      id: "opp_cheap",
      listingNormalized: {
        listingId: "lst_cheap",
        category: "gaming-handhelds",
        normalizedCondition: "USED_GOOD",
        itemType: "STANDARD",
        totalAcquisitionCost: 120,
      },
    });

    const results = sortOpportunities([expensive, cheap], "total_price_asc");

    expect(results.map((opportunity) => opportunity.id)).toEqual(["opp_cheap", "opp_expensive"]);
  });

  it("translates opportunity reasons into useful Spanish copy", () => {
    const opportunity = makeEvaluation({
      listingRaw: makeListing({
        price: 150,
        shippingCost: 10,
        sellerRating: 99.2,
      }),
      profile: makeProfile({ minConfidence: 0.7 }),
      offer: makeOffer({ offerStrategy: "buy_now" }),
    });

    expect(translateOpportunityReason("Discount to market median: 18.5%", opportunity)).toBe(
      "Esta 18.5% por debajo de la mediana del mercado.",
    );

    const explanation = buildOpportunityExplanation(opportunity);

    expect(explanation.reasons).toContain("Esta por debajo del precio habitual del mercado.");
    expect(explanation.reasons).toContain("La decision actual sugiere comprar ahora.");
    expect(explanation.shortSummary.length).toBeGreaterThan(10);
  });
});
