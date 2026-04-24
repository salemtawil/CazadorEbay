import { describe, expect, it } from "vitest";
import { fixtureProfiles } from "../lib/fixtures/seed-data";
import { mapEbayItemSummaryToListingRaw } from "../lib/server/listing-providers/ebay";

describe("ebay provider adapter", () => {
  it("maps an eBay item summary into the current ListingRaw shape", () => {
    const profile = fixtureProfiles[0]!;
    const listing = mapEbayItemSummaryToListingRaw(
      {
        legacyItemId: "1234567890",
        title: "Nintendo Switch OLED console with dock",
        shortDescription: "Clean unit with charger",
        itemWebUrl: "https://www.ebay.com/itm/1234567890",
        price: {
          value: "199.99",
          currency: "USD",
        },
        shippingOptions: [
          {
            shippingCost: {
              value: "12.50",
            },
          },
        ],
        buyingOptions: ["FIXED_PRICE", "BEST_OFFER"],
        seller: {
          username: "retro-seller",
          feedbackPercentage: 99.7,
          feedbackScore: 814,
        },
        condition: "Used",
        itemLocation: {
          city: "Miami",
          stateOrProvince: "FL",
          country: "US",
        },
        itemEndDate: "2026-04-30T19:00:00.000Z",
        itemOriginDate: "2026-04-20T19:00:00.000Z",
        categories: [
          {
            categoryId: "139971",
            categoryName: "Video Game Consoles",
          },
        ],
      },
      profile,
    );

    expect(listing).not.toBeNull();
    expect(listing!.marketplace).toBe("EBAY");
    expect(listing!.externalId).toBe("1234567890");
    expect(listing!.bestOfferAvailable).toBe(true);
    expect(listing!.price).toBe(199.99);
    expect(listing!.shippingCost).toBe(12.5);
    expect(listing!.category).toBe(profile.targetCategories[0]);
    expect(listing!.attributes.sourceProvider).toBe("ebay");
  });

  it("returns null when mandatory eBay fields are missing", () => {
    const listing = mapEbayItemSummaryToListingRaw(
      {
        title: "Broken payload",
      },
      fixtureProfiles[0]!,
    );

    expect(listing).toBeNull();
  });
});
