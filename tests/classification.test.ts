import { describe, expect, it } from "vitest";
import { classifyListing } from "../lib/modules/classification";
import { normalizeListing } from "../lib/modules/listings";
import { decideVisibility } from "../lib/modules/visibility";
import { makeListing, makeProfile, makeScoring } from "./helpers/domain-fixtures";

describe("classification", () => {
  it("box_only becomes excluded through visibility", () => {
    const listing = makeListing({
      title: "Nintendo Switch OLED box only empty box",
      subtitle: "Packaging only",
    });
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);
    const profile = makeProfile({ includeAccessories: false });
    const visibility = decideVisibility({
      listing,
      profile,
      classification,
      scoring: makeScoring({ profileId: profile.id }),
    });

    expect(classification.flags).toContain("box_only");
    expect(classification.flags).toContain("accessory_only");
    expect(visibility.visibilityLevel).toBe("hidden");
  });

  it("replacement_part_only becomes restricted_visibility", () => {
    const listing = makeListing({
      title: "Nintendo Switch OLED replacement part motherboard only",
    });
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);
    const profile = makeProfile({ includePartsRepairs: true, strictMode: false });
    const visibility = decideVisibility({
      listing,
      profile,
      classification,
      scoring: makeScoring({ profileId: profile.id }),
    });

    expect(classification.flags).toContain("replacement_part_only");
    expect(visibility.visibilityLevel).toBe("secondary_feed");
  });

  it("for_parts_not_working becomes restricted_visibility", () => {
    const listing = makeListing({
      title: "Nintendo Switch OLED for parts not working",
    });
    const normalized = normalizeListing(listing);
    const classification = classifyListing(listing, normalized);
    const profile = makeProfile({ includePartsRepairs: true, strictMode: false });
    const visibility = decideVisibility({
      listing,
      profile,
      classification,
      scoring: makeScoring({ profileId: profile.id }),
    });

    expect(classification.flags).toContain("for_parts_not_working");
    expect(visibility.visibilityLevel).toBe("secondary_feed");
  });
});
