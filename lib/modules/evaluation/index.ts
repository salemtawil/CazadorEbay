import {
  fixtureListings,
  fixtureMarket,
  fixtureProfiles,
  fixtureUsers,
} from "@/lib/fixtures/seed-data";
import { buildAlerts } from "@/lib/modules/alerts";
import { classifyListing } from "@/lib/modules/classification";
import type {
  DashboardMetrics,
  EvaluationResult,
  Listing,
  OpportunityCatalog,
  SearchProfile,
} from "@/lib/modules/contracts";
import { decideListing } from "@/lib/modules/decisions";
import { normalizeListing, normalizeListings } from "@/lib/modules/listings";
import { getMarketSnapshot } from "@/lib/modules/market";
import { planOffer } from "@/lib/modules/offers";
import { getActiveProfiles, listingMatchesProfile } from "@/lib/modules/search-profiles";
import { scoreListing } from "@/lib/modules/scoring";
import { getPrimaryUser } from "@/lib/modules/users";
import { decideVisibility } from "@/lib/modules/visibility";

function isValidListingInput(listing: Listing): boolean {
  return Boolean(
    listing.id &&
      listing.title &&
      listing.url &&
      Number.isFinite(listing.price) &&
      Number.isFinite(listing.shippingCost),
  );
}

function isExcludedByProfile(listing: Listing, profile: SearchProfile): boolean {
  return !listingMatchesProfile(listing, profile);
}

function buildFinalEvaluationResult(evaluation: EvaluationResult): EvaluationResult {
  return evaluation;
}

export function evaluateListingForProfile(
  listingRaw: Listing,
  profile: SearchProfile,
  catalog: OpportunityCatalog,
): EvaluationResult | null {
  if (!isValidListingInput(listingRaw) || isExcludedByProfile(listingRaw, profile)) {
    return null;
  }

  const listingNormalized = normalizeListing(listingRaw);
  const market = getMarketSnapshot(listingRaw, catalog.market);
  const classification = classifyListing(listingRaw, listingNormalized);
  const scoring = scoreListing(listingRaw, listingNormalized, profile, classification, market);
  const visibility = decideVisibility({
    listing: listingRaw,
    profile,
    classification,
    scoring,
  });
  const decision = decideListing(profile.id, listingRaw, listingNormalized, scoring, classification, visibility, market);
  const offer = planOffer({
    profile,
    listing: listingRaw,
    market,
    classification,
    scoring,
    decision,
  });
  const alerts = buildAlerts(profile.id, listingRaw, classification, scoring, visibility, decision);

  return buildFinalEvaluationResult({
    id: `${listingRaw.id}:${profile.id}`,
    listingRaw,
    listingNormalized,
    profile,
    market,
    classification,
    visibility,
    scoring,
    decision,
    offer,
    alerts,
  });
}

export function evaluateCatalog(catalog: OpportunityCatalog): EvaluationResult[] {
  if (catalog.users.length === 0 || catalog.profiles.length === 0 || catalog.listings.length === 0) {
    return [];
  }

  const user = getPrimaryUser(catalog.users);
  const profiles = getActiveProfiles(catalog.profiles).filter((profile) => profile.userId === user.id);
  const listings = normalizeListings(catalog.listings);

  return listings
    .flatMap((listingRaw) =>
      profiles
        .map((profile) => evaluateListingForProfile(listingRaw, profile, catalog))
        .filter((evaluation): evaluation is EvaluationResult => Boolean(evaluation)),
    )
    .sort((a, b) => {
      if (a.visibility.visibilityLevel !== b.visibility.visibilityLevel) {
        return a.visibility.visibilityLevel === "primary_feed"
          ? -1
          : b.visibility.visibilityLevel === "primary_feed"
            ? 1
            : a.visibility.visibilityLevel === "secondary_feed" && b.visibility.visibilityLevel === "hidden"
              ? -1
              : 1;
      }

      return b.scoring.totalScore - a.scoring.totalScore;
    });
}

export function getVisibleEvaluations(evaluations: EvaluationResult[]): EvaluationResult[] {
  return evaluations.filter((evaluation) => evaluation.visibility.isVisible);
}

export function evaluateFixtures(): EvaluationResult[] {
  return evaluateCatalog({
    users: fixtureUsers,
    profiles: fixtureProfiles,
    listings: fixtureListings,
    market: fixtureMarket,
  });
}

export function getDashboardMetrics(evaluations: EvaluationResult[]): DashboardMetrics {
  const visible = getVisibleEvaluations(evaluations);
  const activeProfiles = new Set(evaluations.map((evaluation) => evaluation.profile.id)).size;
  const evaluatedListings = new Set(evaluations.map((evaluation) => evaluation.listingRaw.id)).size;
  const averageMargin =
    visible.reduce((sum, evaluation) => sum + evaluation.decision.expectedMargin, 0) /
    Math.max(visible.length, 1);

  return {
    activeProfiles,
    evaluatedListings,
    buyNowCount: visible.filter((evaluation) => evaluation.decision.status === "BUY").length,
    negotiateCount: visible.filter((evaluation) => evaluation.decision.status === "NEGOTIATE").length,
    averageMargin: Number(averageMargin.toFixed(0)),
  };
}
