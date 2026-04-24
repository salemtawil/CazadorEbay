import type {
  Alert,
  Classification,
  Decision,
  Listing,
  ScoreBreakdown,
  VisibilityAssessment,
} from "@/lib/modules/contracts";

export function buildAlerts(
  profileId: string,
  listing: Listing,
  classification: Classification,
  scoring: ScoreBreakdown,
  visibility: VisibilityAssessment,
  decision: Decision,
): Alert[] {
  const alerts: Alert[] = [];

  if (decision.status === "BUY") {
    alerts.push({
      id: `${listing.id}-${profileId}-buy`,
      listingId: listing.id,
      profileId,
      severity: "critical",
      channel: "dashboard",
      message: "High conviction candidate. Contact seller quickly.",
    });
  }

  if (classification.flags.includes("seller_trust")) {
    alerts.push({
      id: `${listing.id}-${profileId}-trust`,
      listingId: listing.id,
      profileId,
      severity: "warning",
      channel: "dashboard",
      message: "Seller trust is below threshold. Review history before buying.",
    });
  }

  if (scoring.priceScore >= 80) {
    alerts.push({
      id: `${listing.id}-${profileId}-price`,
      listingId: listing.id,
      profileId,
      severity: "info",
      channel: "email",
      message: "Listing is priced materially below current market median.",
    });
  }

  if (!visibility.isVisible) {
    alerts.push({
      id: `${listing.id}-${profileId}-hidden`,
      listingId: listing.id,
      profileId,
      severity: "info",
      channel: "dashboard",
      message: `Listing was evaluated but hidden by visibility rules: ${visibility.suppressionReasons.join(" ")}`,
    });
  }

  return alerts;
}
