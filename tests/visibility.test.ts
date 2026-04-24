import { describe, expect, it } from "vitest";
import { decideVisibility } from "../lib/modules/visibility";
import { makeClassification, makeListing, makeProfile, makeScoring } from "./helpers/domain-fixtures";

describe("visibility", () => {
  it("strict profile hides more restricted cases", () => {
    const listing = makeListing();
    const relaxed = makeProfile({ strictMode: false, includeAccessories: true });
    const strict = makeProfile({ id: "prof_strict", strictMode: true, includeAccessories: true });
    const classification = makeClassification({ flags: ["accessory_only"] });

    const relaxedVisibility = decideVisibility({
      listing,
      profile: relaxed,
      classification,
      scoring: makeScoring({ profileId: relaxed.id, totalScore: 82 }),
    });
    const strictVisibility = decideVisibility({
      listing,
      profile: strict,
      classification,
      scoring: makeScoring({ profileId: strict.id, totalScore: 82 }),
    });

    expect(relaxedVisibility.visibilityLevel).toBe("secondary_feed");
    expect(strictVisibility.visibilityLevel).toBe("hidden");
  });

  it("includePartsRepairs=true allows for_parts_not_working", () => {
    const listing = makeListing();
    const profile = makeProfile({ includePartsRepairs: true, strictMode: false });
    const visibility = decideVisibility({
      listing,
      profile,
      classification: makeClassification({ flags: ["for_parts_not_working", "risky_condition"] }),
      scoring: makeScoring({ profileId: profile.id, totalScore: 72 }),
    });

    expect(visibility.isVisible).toBe(true);
    expect(visibility.visibilityLevel).toBe("secondary_feed");
  });

  it("includeIncompleteItems=true affects incomplete_item", () => {
    const listing = makeListing();
    const hiddenProfile = makeProfile({ includeIncompleteItems: false });
    const visibleProfile = makeProfile({ id: "prof_visible", includeIncompleteItems: true, strictMode: false });
    const classification = makeClassification({ flags: ["incomplete_item"] });

    expect(
      decideVisibility({
        listing,
        profile: hiddenProfile,
        classification,
        scoring: makeScoring({ profileId: hiddenProfile.id }),
      }).visibilityLevel,
    ).toBe("hidden");

    expect(
      decideVisibility({
        listing,
        profile: visibleProfile,
        classification,
        scoring: makeScoring({ profileId: visibleProfile.id }),
      }).visibilityLevel,
    ).toBe("secondary_feed");
  });

  it("showLowConfidenceItems=false pushes low confidence to hidden or secondary_feed", () => {
    const listing = makeListing();
    const strictProfile = makeProfile({ showLowConfidenceItems: false, strictMode: true, riskTolerance: "low" });
    const tolerantProfile = makeProfile({
      id: "prof_tolerant",
      showLowConfidenceItems: false,
      strictMode: false,
      riskTolerance: "high",
    });
    const classification = makeClassification({ confidence: 0.56 });

    const strictResult = decideVisibility({
      listing,
      profile: strictProfile,
      classification,
      scoring: makeScoring({ profileId: strictProfile.id, totalScore: 78 }),
    });
    const tolerantResult = decideVisibility({
      listing,
      profile: tolerantProfile,
      classification,
      scoring: makeScoring({ profileId: tolerantProfile.id, totalScore: 78 }),
    });

    expect(strictResult.visibilityLevel).toBe("hidden");
    expect(tolerantResult.visibilityLevel).toBe("secondary_feed");
  });
});
