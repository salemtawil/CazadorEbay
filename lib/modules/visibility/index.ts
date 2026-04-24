import type {
  Classification,
  Listing,
  ScoreBreakdown,
  SearchProfile,
  VisibilityAssessment,
  VisibilityLevel,
} from "@/lib/modules/contracts";

interface VisibilityInput {
  listing: Listing;
  profile: SearchProfile;
  classification: Classification;
  scoring: ScoreBreakdown;
}

type EligibilityState =
  | "eligible"
  | "eligible_with_penalties"
  | "restricted_visibility"
  | "excluded";

function getItemFlags(classification: Classification) {
  return {
    forParts: classification.flags.includes("for_parts_not_working"),
    replacementPartOnly: classification.flags.includes("replacement_part_only"),
    incompleteItem: classification.flags.includes("incomplete_item"),
    accessoryOnly: classification.flags.includes("accessory_only"),
    riskyCondition: classification.flags.includes("risky_condition"),
    lowConfidence: classification.confidence < 0.7,
  };
}

function resolveEligibilityState(input: VisibilityInput): {
  state: EligibilityState;
  suppressionReasons: string[];
  suppressedByProfile: boolean;
} {
  const { profile, classification, scoring } = input;
  const flags = getItemFlags(classification);
  const suppressionReasons: string[] = [];
  let suppressedByProfile = false;

  if (flags.forParts && !profile.includePartsRepairs) {
    suppressionReasons.push("Profile excludes parts and repairs.");
    suppressedByProfile = true;
    return { state: "excluded", suppressionReasons, suppressedByProfile };
  }

  if (flags.replacementPartOnly && !profile.includePartsRepairs) {
    suppressionReasons.push("Profile excludes replacement-part-only listings.");
    suppressedByProfile = true;
    return { state: "excluded", suppressionReasons, suppressedByProfile };
  }

  if (flags.incompleteItem && !profile.includeIncompleteItems) {
    suppressionReasons.push("Profile excludes incomplete items.");
    suppressedByProfile = true;
    return { state: "excluded", suppressionReasons, suppressedByProfile };
  }

  if (flags.accessoryOnly && !profile.includeAccessories) {
    suppressionReasons.push("Profile excludes accessory-only listings.");
    suppressedByProfile = true;
    return { state: "excluded", suppressionReasons, suppressedByProfile };
  }

  if (classification.confidence < profile.minConfidence && !profile.showLowConfidenceItems) {
    suppressionReasons.push("Low-confidence items are down-ranked by profile settings.");
    suppressedByProfile = true;
    if (profile.strictMode || profile.riskTolerance === "low") {
      return { state: "excluded", suppressionReasons, suppressedByProfile };
    }

    return { state: "restricted_visibility", suppressionReasons, suppressedByProfile };
  }

  if (
    flags.forParts ||
    flags.replacementPartOnly ||
    flags.incompleteItem ||
    flags.accessoryOnly
  ) {
    suppressionReasons.push("Special-case inventory gets restricted visibility by default.");
    return { state: "restricted_visibility", suppressionReasons, suppressedByProfile };
  }

  if (classification.confidence < profile.minConfidence) {
    suppressionReasons.push("Classification confidence is below the preferred threshold.");
    return { state: "eligible_with_penalties", suppressionReasons, suppressedByProfile };
  }

  if (scoring.totalScore < profile.minScore) {
    suppressionReasons.push("Score is below the target threshold but still eligible for visibility review.");
    return { state: "eligible_with_penalties", suppressionReasons, suppressedByProfile };
  }

  if (flags.riskyCondition) {
    suppressionReasons.push("Condition risk reduces feed priority.");
    return { state: "eligible_with_penalties", suppressionReasons, suppressedByProfile };
  }

  return { state: "eligible", suppressionReasons, suppressedByProfile };
}

function mapStateToVisibilityLevel(
  state: EligibilityState,
  input: VisibilityInput,
): VisibilityLevel {
  const { profile, classification, scoring } = input;

  if (state === "excluded") {
    return "hidden";
  }

  if (state === "restricted_visibility") {
    if (profile.strictMode) {
      return "hidden";
    }

    return "secondary_feed";
  }

  if (state === "eligible_with_penalties") {
    if (profile.strictMode) {
      return "secondary_feed";
    }

    if (profile.riskTolerance === "high" && scoring.totalScore >= profile.minScore) {
      return "primary_feed";
    }

    if (
      profile.riskTolerance === "medium" &&
      classification.confidence >= Math.max(0.6, profile.minConfidence - 0.08)
    ) {
      return "primary_feed";
    }

    return "secondary_feed";
  }

  return "primary_feed";
}

export function decideVisibility(input: VisibilityInput): VisibilityAssessment {
  const { listing, profile } = input;
  const { state, suppressionReasons, suppressedByProfile } = resolveEligibilityState(input);
  const visibilityLevel = mapStateToVisibilityLevel(state, input);

  if (state === "eligible") {
    suppressionReasons.push("Eligible listings surface in the primary feed by default.");
  }

  if (state === "eligible_with_penalties" && visibilityLevel === "primary_feed") {
    suppressionReasons.push("Penalties were tolerated by the profile, so the listing stays in the primary feed.");
  }

  if (state === "eligible_with_penalties" && visibilityLevel === "secondary_feed") {
    suppressionReasons.push("Penalties reduced the listing to the secondary feed.");
  }

  return {
    listingId: listing.id,
    profileId: profile.id,
    visibilityLevel,
    isVisible: visibilityLevel !== "hidden",
    suppressedByProfile,
    suppressionReasons,
  };
}
