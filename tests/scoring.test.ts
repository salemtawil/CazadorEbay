import { describe, expect, it } from "vitest";
import { classifyListing } from "../lib/modules/classification";
import { normalizeListing } from "../lib/modules/listings";
import { scoreListing } from "../lib/modules/scoring";
import { makeListing, makeMarket, makeProfile } from "./helpers/domain-fixtures";

describe("scoring", () => {
  it("strong discount increases total score", () => {
    const profile = makeProfile();
    const cheapListing = makeListing({ price: 140, shippingCost: 10 });
    const expensiveListing = makeListing({ id: "lst_expensive", externalId: "ext-expensive", price: 220, shippingCost: 10 });
    const cheapNormalized = normalizeListing(cheapListing);
    const expensiveNormalized = normalizeListing(expensiveListing);
    const market = makeMarket({ medianPrice: 240 });

    const cheapScore = scoreListing(
      cheapListing,
      cheapNormalized,
      profile,
      classifyListing(cheapListing, cheapNormalized),
      market,
    );
    const expensiveScore = scoreListing(
      expensiveListing,
      expensiveNormalized,
      profile,
      classifyListing(expensiveListing, expensiveNormalized),
      market,
    );

    expect(cheapScore.totalScore).toBeGreaterThan(expensiveScore.totalScore);
  });

  it("high shipping increases riskPenalty", () => {
    const profile = makeProfile();
    const lowShippingListing = makeListing({ shippingCost: 8 });
    const highShippingListing = makeListing({ id: "lst_ship", externalId: "ext-ship", shippingCost: 48 });
    const market = makeMarket();

    const lowScore = scoreListing(
      lowShippingListing,
      normalizeListing(lowShippingListing),
      profile,
      classifyListing(lowShippingListing, normalizeListing(lowShippingListing)),
      market,
    );
    const highScore = scoreListing(
      highShippingListing,
      normalizeListing(highShippingListing),
      profile,
      classifyListing(highShippingListing, normalizeListing(highShippingListing)),
      market,
    );

    expect(highScore.riskPenalty).toBeGreaterThan(lowScore.riskPenalty);
  });

  it("low sample size penalizes score", () => {
    const profile = makeProfile();
    const listing = makeListing();
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);

    const robustMarket = makeMarket({ sampleSize: 50 });
    const thinMarket = makeMarket({ id: "market_thin", sampleSize: 6 });

    const robustScore = scoreListing(listing, normalized, profile, classification, robustMarket);
    const thinScore = scoreListing(listing, normalized, profile, classification, thinMarket);

    expect(thinScore.riskPenalty).toBeGreaterThan(robustScore.riskPenalty);
    expect(thinScore.totalScore).toBeLessThan(robustScore.totalScore);
  });
});
