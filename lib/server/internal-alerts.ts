import type {
  AlertSeverity,
  EvaluationResult,
  InternalAlertType,
  Listing,
} from "@/lib/modules/contracts";

export interface AlertEvaluationSnapshot {
  id: string;
  totalScore: number;
  offerStrategy: EvaluationResult["offer"]["offerStrategy"];
  decisionStatus: EvaluationResult["decision"]["status"];
  visibilityLevel: EvaluationResult["visibility"]["visibilityLevel"];
}

export interface AlertGenerationContext {
  listingCreated: boolean;
  previousListing: Listing | null;
  currentListing: Listing;
  previousEvaluation: AlertEvaluationSnapshot | null;
  currentEvaluation: EvaluationResult;
}

export interface GeneratedInternalAlert {
  listingRawId: string;
  searchProfileId: string;
  listingEvaluationId?: string;
  alertType: InternalAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  dedupeKey: string;
}

const HIGH_SCORE_THRESHOLD = 80;
const PRICE_DROP_MIN_ABSOLUTE = 10;
const PRICE_DROP_MIN_PERCENT = 0.05;

function getTotalPrice(listing: Listing): number {
  return listing.price + listing.shippingCost;
}

function isHighScoreOpportunity(evaluation: EvaluationResult): boolean {
  return evaluation.visibility.isVisible && evaluation.scoring.totalScore >= HIGH_SCORE_THRESHOLD;
}

function isWatchLikeStrategy(value: EvaluationResult["offer"]["offerStrategy"] | null | undefined): boolean {
  return value === "watch" || value === "skip" || value === null || value === undefined;
}

function shouldAlertPriceDrop(previousListing: Listing, currentListing: Listing): boolean {
  const previousTotal = getTotalPrice(previousListing);
  const currentTotal = getTotalPrice(currentListing);

  if (currentTotal >= previousTotal) {
    return false;
  }

  const absoluteDrop = previousTotal - currentTotal;
  const percentDrop = previousTotal > 0 ? absoluteDrop / previousTotal : 0;

  return absoluteDrop >= PRICE_DROP_MIN_ABSOLUTE || percentDrop >= PRICE_DROP_MIN_PERCENT;
}

export function generateInternalAlerts(context: AlertGenerationContext): GeneratedInternalAlert[] {
  const alerts: GeneratedInternalAlert[] = [];
  const { listingCreated, previousListing, currentListing, previousEvaluation, currentEvaluation } = context;
  const listingRawId = currentEvaluation.listingRaw.id;
  const searchProfileId = currentEvaluation.profile.id;

  if (listingCreated) {
    alerts.push({
      listingRawId,
      searchProfileId,
      listingEvaluationId: previousEvaluation?.id ?? undefined,
      alertType: "NEW_LISTING_MATCHED_PROFILE",
      severity: "info",
      title: "Nuevo listing detectado para el perfil",
      message: `El listing "${currentEvaluation.listingRaw.title}" entro por primera vez y matchea el perfil ${currentEvaluation.profile.name}.`,
      metadata: {
        listingTitle: currentEvaluation.listingRaw.title,
        profileName: currentEvaluation.profile.name,
        totalPrice: getTotalPrice(currentEvaluation.listingRaw),
      },
      dedupeKey: `NEW_LISTING_MATCHED_PROFILE:${listingRawId}:${searchProfileId}`,
    });
  }

  if (isHighScoreOpportunity(currentEvaluation) && (!previousEvaluation || previousEvaluation.totalScore < HIGH_SCORE_THRESHOLD)) {
    alerts.push({
      listingRawId,
      searchProfileId,
      listingEvaluationId: previousEvaluation?.id ?? undefined,
      alertType: "NEW_HIGH_SCORE_OPPORTUNITY",
      severity: currentEvaluation.offer.offerStrategy === "buy_now" ? "critical" : "warning",
      title: "Nueva oportunidad de score alto",
      message: `El listing "${currentEvaluation.listingRaw.title}" supero el threshold de score alto para ${currentEvaluation.profile.name}.`,
      metadata: {
        totalScore: currentEvaluation.scoring.totalScore,
        visibilityLevel: currentEvaluation.visibility.visibilityLevel,
        offerStrategy: currentEvaluation.offer.offerStrategy,
      },
      dedupeKey: `NEW_HIGH_SCORE_OPPORTUNITY:${listingRawId}:${searchProfileId}`,
    });
  }

  if (previousListing && shouldAlertPriceDrop(previousListing, currentListing)) {
    const previousTotal = getTotalPrice(previousListing);
    const currentTotal = getTotalPrice(currentListing);
    const absoluteDrop = previousTotal - currentTotal;

    alerts.push({
      listingRawId,
      searchProfileId,
      listingEvaluationId: previousEvaluation?.id ?? undefined,
      alertType: "PRICE_DROPPED",
      severity: absoluteDrop >= 25 ? "critical" : "warning",
      title: "Bajo el precio de la oportunidad",
      message: `El precio total de "${currentEvaluation.listingRaw.title}" bajo de $${previousTotal} a $${currentTotal}.`,
      metadata: {
        previousTotal,
        currentTotal,
        absoluteDrop,
      },
      dedupeKey: `PRICE_DROPPED:${listingRawId}:${searchProfileId}:${currentTotal}`,
    });
  }

  if (currentEvaluation.offer.offerStrategy === "buy_now" && previousEvaluation?.offerStrategy !== "buy_now") {
    alerts.push({
      listingRawId,
      searchProfileId,
      listingEvaluationId: previousEvaluation?.id ?? undefined,
      alertType: "DECISION_UPGRADED_TO_BUY_NOW",
      severity: "critical",
      title: "La oportunidad paso a buy now",
      message: `El listing "${currentEvaluation.listingRaw.title}" escalo a buy now para ${currentEvaluation.profile.name}.`,
      metadata: {
        previousOfferStrategy: previousEvaluation?.offerStrategy ?? null,
        currentOfferStrategy: currentEvaluation.offer.offerStrategy,
        decisionStatus: currentEvaluation.decision.status,
      },
      dedupeKey: `DECISION_UPGRADED_TO_BUY_NOW:${listingRawId}:${searchProfileId}:buy_now`,
    });
  }

  if (
    currentEvaluation.offer.offerStrategy === "offer_now" &&
    isWatchLikeStrategy(previousEvaluation?.offerStrategy)
  ) {
    alerts.push({
      listingRawId,
      searchProfileId,
      listingEvaluationId: previousEvaluation?.id ?? undefined,
      alertType: "DECISION_UPGRADED_TO_MAKE_OFFER",
      severity: "warning",
      title: "La oportunidad paso a make offer",
      message: `El listing "${currentEvaluation.listingRaw.title}" ahora amerita oferta para ${currentEvaluation.profile.name}.`,
      metadata: {
        previousOfferStrategy: previousEvaluation?.offerStrategy ?? null,
        currentOfferStrategy: currentEvaluation.offer.offerStrategy,
        decisionStatus: currentEvaluation.decision.status,
      },
      dedupeKey: `DECISION_UPGRADED_TO_MAKE_OFFER:${listingRawId}:${searchProfileId}:offer_now`,
    });
  }

  return alerts;
}
