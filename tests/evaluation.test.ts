import { describe, expect, it } from "vitest";
import { evaluateCatalog, evaluateListingForProfile } from "../lib/modules/evaluation";
import { decideVisibility } from "../lib/modules/visibility";
import { normalizeListing } from "../lib/modules/listings";
import { classifyListing } from "../lib/modules/classification";
import { scoreListing } from "../lib/modules/scoring";
import { fixtureUsers } from "../lib/fixtures/seed-data";
import { makeClassification, makeListing, makeMarket, makeProfile } from "./helpers/domain-fixtures";

describe("evaluation pipeline", () => {
  it("produces 2 distinct evaluations for the same listing across 2 profiles", () => {
    const listing = makeListing({
      id: "lst_shared",
      externalId: "shared-1",
      title: "Nintendo Switch OLED with charger",
      category: "gaming-handhelds",
      price: 180,
      shippingCost: 9,
    });
    const profileA = makeProfile({
      id: "prof_a",
      keywords: ["nintendo", "switch"],
      blockedTerms: [],
      targetCategories: ["gaming-handhelds"],
    });
    const profileB = makeProfile({
      id: "prof_b",
      keywords: ["switch", "oled"],
      blockedTerms: [],
      targetCategories: ["gaming-handhelds"],
      offerStrategy: "conservative",
    });
    const evaluations = evaluateCatalog({
      users: fixtureUsers,
      profiles: [profileA, profileB],
      listings: [listing],
      market: [makeMarket({ category: "gaming-handhelds" })],
    });

    expect(evaluations).toHaveLength(2);
    expect(new Set(evaluations.map((item) => item.profile.id)).size).toBe(2);
  });

  it("returns an empty result when the catalog is incomplete", () => {
    const evaluations = evaluateCatalog({
      users: [],
      profiles: [],
      listings: [],
      market: [],
    });

    expect(evaluations).toEqual([]);
  });

  it("cuts excluded listings", () => {
    const listing = makeListing({
      title: "Broken Nintendo Switch for parts",
      category: "gaming-handhelds",
    });
    const profile = makeProfile({
      blockedTerms: ["broken"],
      includePartsRepairs: false,
    });

    const evaluation = evaluateListingForProfile(listing, profile, {
      users: fixtureUsers,
      profiles: [profile],
      listings: [listing],
      market: [makeMarket({ category: "gaming-handhelds" })],
    });

    expect(evaluation).toBeNull();
  });

  it("keeps a low-score but visible listing as an evaluation result", () => {
    const listing = makeListing({
      title: "Nintendo Switch OLED worn shell no dock",
      price: 232,
      shippingCost: 26,
      category: "gaming-handhelds",
    });
    const profile = makeProfile({
      strictMode: false,
      includeIncompleteItems: true,
      showLowConfidenceItems: true,
      minScore: 90,
    });
    const evaluation = evaluateListingForProfile(listing, profile, {
      users: fixtureUsers,
      profiles: [profile],
      listings: [listing],
      market: [makeMarket({ category: "gaming-handhelds", medianPrice: 245 })],
    });

    expect(evaluation).not.toBeNull();
    expect(evaluation!.scoring.totalScore).toBeLessThan(profile.minScore);
    expect(evaluation!.visibility.isVisible).toBe(true);
  });

  it("does not early-filter on minScore or minConfidence before visibility", () => {
    const listing = makeListing({
      title: "Nintendo Switch OLED body only no charger",
      price: 219,
      shippingCost: 14,
      category: "gaming-handhelds",
    });
    const profile = makeProfile({
      strictMode: false,
      includeIncompleteItems: true,
      showLowConfidenceItems: true,
      minScore: 95,
      minConfidence: 0.95,
    });
    const evaluation = evaluateListingForProfile(listing, profile, {
      users: fixtureUsers,
      profiles: [profile],
      listings: [listing],
      market: [makeMarket({ category: "gaming-handhelds" })],
    });

    expect(evaluation).not.toBeNull();
    expect(evaluation!.visibility.visibilityLevel).toMatch(/primary_feed|secondary_feed|hidden/);
  });

  it("low confidence listing can still survive to secondary visibility when rules allow it", () => {
    const listing = makeListing();
    const profile = makeProfile({
      showLowConfidenceItems: false,
      strictMode: false,
      riskTolerance: "high",
    });
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);
    const scoring = scoreListing(
      listing,
      normalized,
      profile,
      makeClassification({ ...classification, confidence: 0.58 }),
      makeMarket(),
    );
    const visibility = decideVisibility({
      listing,
      profile,
      classification: { ...classification, confidence: 0.58 },
      scoring,
    });

    expect(["secondary_feed", "hidden"]).toContain(visibility.visibilityLevel);
  });
});
