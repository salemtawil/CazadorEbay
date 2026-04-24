export type Marketplace = "EBAY" | "FACEBOOK" | "MERCARI";
export type ListingCondition = "NEW" | "USED_EXCELLENT" | "USED_GOOD" | "PARTS";
export type DecisionStatus = "WATCH" | "REVIEW" | "BUY" | "NEGOTIATE" | "SKIP";
export type AlertSeverity = "info" | "warning" | "critical";
export type VisibilityLevel = "primary_feed" | "secondary_feed" | "hidden";
export type RiskTolerance = "low" | "medium" | "high";

export interface User {
  id: string;
  name: string;
  email: string;
  budget: number;
  preferredCurrency: string;
}

export interface SearchProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  strategyMode?: "flip" | "buy_and_hold" | "arbitrage" | "custom";
  riskTolerance: RiskTolerance;
  strictMode: boolean;
  includePartsRepairs: boolean;
  includeIncompleteItems: boolean;
  includeAccessories: boolean;
  showLowConfidenceItems: boolean;
  keywords: string[];
  blockedTerms: string[];
  targetCategories: string[];
  preferredConditions: ListingCondition[];
  minPrice: number;
  maxPrice: number;
  minScore: number;
  minConfidence: number;
  maxBudget?: number;
  minResaleMarginPct?: number;
  offerStrategy: "aggressive" | "balanced" | "conservative";
}

export interface Listing {
  id: string;
  marketplace: Marketplace;
  externalId: string;
  title: string;
  subtitle?: string;
  url: string;
  category: string;
  condition: ListingCondition;
  price: number;
  shippingCost: number;
  bestOfferAvailable?: boolean;
  currency: string;
  sellerName: string;
  sellerRating: number;
  sellerSalesCount: number;
  returnsAccepted: boolean;
  location: string;
  endAt?: string;
  scrapedAt: string;
  attributes: Record<string, string | number | boolean>;
}

export type ListingRaw = Listing;

export interface ListingNormalized {
  listingId: string;
  category: string;
  normalizedCondition: ListingCondition;
  itemType:
    | "STANDARD"
    | "FOR_PARTS_NOT_WORKING"
    | "REPLACEMENT_PART_ONLY"
    | "INCOMPLETE_ITEM"
    | "ACCESSORY_ONLY";
  totalAcquisitionCost: number;
}

export interface MarketSnapshot {
  id: string;
  marketplace: Marketplace;
  category: string;
  sampleSize?: number;
  medianPrice: number;
  p25Price?: number;
  p10Price?: number;
  lowPrice: number;
  highPrice: number;
  sellThroughRate: number;
  demandIndex: number;
  feeRate: number;
}

export interface Classification {
  listingId: string;
  brand: string;
  model: string;
  confidence: number;
  flags: string[];
  notes: string[];
}

export interface ScoreBreakdown {
  listingId: string;
  profileId: string;
  totalScore: number;
  priceScore: number;
  demandScore: number;
  trustScore: number;
  fitScore: number;
  liquidityScore: number;
  riskPenalty: number;
  confidencePenalty: number;
  reasoning: string[];
}

export interface VisibilityAssessment {
  listingId: string;
  profileId: string;
  visibilityLevel: VisibilityLevel;
  isVisible: boolean;
  suppressedByProfile: boolean;
  suppressionReasons: string[];
}

export interface Decision {
  listingId: string;
  profileId: string;
  status: DecisionStatus;
  confidence: number;
  expectedResale: number;
  expectedMargin: number;
  maxBid: number;
  recommendedOffer: number;
  notes: string[];
}

export interface OfferPlan {
  listingId: string;
  profileId: string;
  offerStrategy: "buy_now" | "offer_now" | "watch" | "skip";
  anchorOffer: number | null;
  recommendedOffer: number | null;
  walkAwayPrice: number | null;
  offerConfidence: number;
  reasoning: string[];
}

export interface Alert {
  id: string;
  listingId: string;
  profileId: string;
  severity: AlertSeverity;
  channel: "dashboard" | "email";
  message: string;
}

export interface Opportunity {
  id: string;
  listingRaw: Listing;
  listingNormalized: ListingNormalized;
  profile: SearchProfile;
  market: MarketSnapshot;
  classification: Classification;
  scoring: ScoreBreakdown;
  visibility: VisibilityAssessment;
  decision: Decision;
  offer: OfferPlan;
  alerts: Alert[];
}

export type EvaluationResult = Opportunity;

export interface DashboardMetrics {
  activeProfiles: number;
  evaluatedListings: number;
  buyNowCount: number;
  negotiateCount: number;
  averageMargin: number;
}

export interface OpportunityCatalog {
  users: User[];
  profiles: SearchProfile[];
  listings: Listing[];
  market: MarketSnapshot[];
}
