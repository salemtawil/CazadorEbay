import type { EvaluationResult, ListingNormalized, OpportunityInspection } from "@/lib/modules/contracts";

function uniqueReasons(reasons: string[]): string[] {
  const seen = new Set<string>();

  return reasons
    .map((reason) => reason.trim())
    .filter((reason) => {
      if (!reason || seen.has(reason)) {
        return false;
      }

      seen.add(reason);
      return true;
    });
}

export function getOpportunityListingState(
  itemType: ListingNormalized["itemType"],
): OpportunityInspection["listingState"] {
  if (itemType === "ACCESSORY_ONLY") {
    return "accessory_only";
  }

  if (itemType === "INCOMPLETE_ITEM") {
    return "incomplete";
  }

  if (itemType === "FOR_PARTS_NOT_WORKING" || itemType === "REPLACEMENT_PART_ONLY") {
    return "parts_repair";
  }

  return "standard";
}

export function getOpportunitySpecialItemType(
  itemType: ListingNormalized["itemType"],
): OpportunityInspection["specialItemType"] {
  if (itemType === "ACCESSORY_ONLY") {
    return "accessory";
  }

  if (itemType === "FOR_PARTS_NOT_WORKING" || itemType === "REPLACEMENT_PART_ONLY") {
    return "parts_repair";
  }

  return "none";
}

export function buildOpportunityInspection(
  evaluation: Pick<
    EvaluationResult,
    "listingRaw" | "listingNormalized" | "classification" | "scoring" | "visibility" | "decision" | "offer"
  >,
  overrides: Partial<OpportunityInspection> = {},
): OpportunityInspection {
  return {
    listingState: overrides.listingState ?? getOpportunityListingState(evaluation.listingNormalized.itemType),
    specialItemType: overrides.specialItemType ?? getOpportunitySpecialItemType(evaluation.listingNormalized.itemType),
    comparableMatchConfidence: overrides.comparableMatchConfidence ?? evaluation.classification.confidence,
    profileCompatibility:
      overrides.profileCompatibility ?? Number(Math.min(1, evaluation.scoring.fitScore / 100).toFixed(4)),
    rawScore:
      overrides.rawScore ??
      Number((evaluation.scoring.totalScore + evaluation.scoring.riskPenalty + evaluation.scoring.confidencePenalty).toFixed(1)),
    uiScore: overrides.uiScore ?? evaluation.scoring.totalScore,
    driversPositive: uniqueReasons(overrides.driversPositive ?? evaluation.scoring.reasoning.concat(evaluation.offer.reasoning)),
    driversNegative: uniqueReasons(
      overrides.driversNegative ?? evaluation.visibility.suppressionReasons.concat(evaluation.decision.notes),
    ),
    updatedAt: overrides.updatedAt ?? evaluation.listingRaw.scrapedAt,
  };
}
