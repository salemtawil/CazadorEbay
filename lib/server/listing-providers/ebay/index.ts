import type { ListingCondition, ListingRaw, SearchProfile } from "@/lib/modules/contracts";
import type { ListingProvider, ListingProviderSearchInput } from "@/lib/server/listing-providers/contracts";

type EbayEnvironment = "sandbox" | "production";

interface EbayConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  environment: EbayEnvironment;
  marketplaceId: string;
  scope: string;
  searchLimit: number;
}

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
}

interface EbayAmount {
  value?: string;
  currency?: string;
}

interface EbayShippingOption {
  shippingCostType?: string;
  shippingCost?: EbayAmount;
}

interface EbaySeller {
  username?: string;
  feedbackPercentage?: string | number;
  feedbackScore?: number;
}

interface EbayCategory {
  categoryId?: string;
  categoryName?: string;
}

interface EbayItemLocation {
  city?: string;
  stateOrProvince?: string;
  country?: string;
}

interface EbayItemSummary {
  itemId?: string;
  legacyItemId?: string;
  title?: string;
  shortDescription?: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  price?: EbayAmount;
  shippingOptions?: EbayShippingOption[];
  buyingOptions?: string[];
  seller?: EbaySeller;
  condition?: string;
  categories?: EbayCategory[];
  itemLocation?: EbayItemLocation;
  itemEndDate?: string;
  itemOriginDate?: string;
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getEbayConfigFromEnv(): EbayConfig {
  const environment = process.env.EBAY_ENVIRONMENT === "sandbox" ? "sandbox" : "production";

  return {
    enabled: process.env.EBAY_ENABLED === "true",
    clientId: process.env.EBAY_CLIENT_ID ?? "",
    clientSecret: process.env.EBAY_CLIENT_SECRET ?? "",
    environment,
    marketplaceId: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
    scope: process.env.EBAY_BROWSE_SCOPE ?? "https://api.ebay.com/oauth/api_scope",
    searchLimit: Math.min(parsePositiveInteger(process.env.EBAY_SEARCH_LIMIT, 12), 50),
  };
}

function getApiBaseUrl(environment: EbayEnvironment): string {
  return environment === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

function createBasicAuthorization(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function clampNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function parseAmount(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  return clampNumber(parsed);
}

function mapCondition(condition: string | undefined): ListingCondition {
  const lowered = condition?.toLowerCase() ?? "";

  if (/(new|brand new|new with)/.test(lowered)) {
    return "NEW";
  }

  if (/(parts|not working|for parts)/.test(lowered)) {
    return "PARTS";
  }

  if (/(excellent|very good|open box|certified refurbished)/.test(lowered)) {
    return "USED_EXCELLENT";
  }

  return "USED_GOOD";
}

function getShippingCost(item: EbayItemSummary): number {
  const firstOption = item.shippingOptions?.[0];
  if (!firstOption) {
    return 0;
  }

  if (firstOption.shippingCostType === "FREE") {
    return 0;
  }

  return parseAmount(firstOption.shippingCost?.value);
}

function formatLocation(location: EbayItemLocation | undefined): string {
  const parts = [location?.city, location?.stateOrProvince, location?.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}

function buildKeywords(profile: SearchProfile): string {
  return profile.keywords.slice(0, 4).join(" ").trim();
}

export function mapEbayItemSummaryToListingRaw(item: EbayItemSummary, profile: SearchProfile): ListingRaw | null {
  const externalId = item.legacyItemId ?? item.itemId;
  const title = item.title?.trim();
  const url = item.itemWebUrl ?? item.itemAffiliateWebUrl;

  if (!externalId || !title || !url) {
    return null;
  }

  const categoryName = item.categories?.[0]?.categoryName ?? profile.targetCategories[0] ?? "uncategorized";
  const categoryId = item.categories?.[0]?.categoryId;
  const price = parseAmount(item.price?.value);
  const shippingCost = getShippingCost(item);
  const scrapedAt = new Date().toISOString();

  return {
    id: `ebay-${externalId}`,
    marketplace: "EBAY",
    externalId,
    title,
    subtitle: item.shortDescription ?? undefined,
    url,
    // The current domain expects an internal category token; for the first integration
    // we preserve the profile's target category so the existing pipeline can classify it.
    category: profile.targetCategories[0] ?? "uncategorized",
    condition: mapCondition(item.condition),
    price,
    shippingCost,
    bestOfferAvailable: item.buyingOptions?.includes("BEST_OFFER") ?? false,
    currency: item.price?.currency ?? "USD",
    sellerName: item.seller?.username ?? "ebay-seller",
    sellerRating: Number(item.seller?.feedbackPercentage ?? 99),
    sellerSalesCount: Number(item.seller?.feedbackScore ?? 0),
    returnsAccepted: false,
    location: formatLocation(item.itemLocation),
    endAt: item.itemEndDate,
    scrapedAt,
    attributes: {
      sourceProvider: "ebay",
      providerCategoryName: categoryName,
      providerCategoryId: categoryId ?? "",
      providerCondition: item.condition ?? "",
      listingAgeDays: item.itemOriginDate
        ? Math.max(0, Math.round((Date.now() - new Date(item.itemOriginDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    },
  };
}

export class EbayBrowseListingProvider implements ListingProvider {
  readonly source = "ebay-browse";

  constructor(private readonly config: EbayConfig = getEbayConfigFromEnv()) {}

  isConfigured(): boolean {
    return this.config.enabled && Boolean(this.config.clientId) && Boolean(this.config.clientSecret);
  }

  async searchListings(input: ListingProviderSearchInput): Promise<ListingRaw[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const accessToken = await this.getAccessToken(input.signal);
    const query = buildKeywords(input.profile);

    if (!query) {
      return [];
    }

    const limit = Math.min(input.limit ?? this.config.searchLimit, 50);
    const url = new URL(`${getApiBaseUrl(this.config.environment)}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fieldgroups", "EXTENDED");
    url.searchParams.set("sort", "endingSoonest");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": this.config.marketplaceId,
        Accept: "application/json",
      },
      signal: input.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`eBay search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EbaySearchResponse;
    return (payload.itemSummaries ?? [])
      .map((item) => mapEbayItemSummaryToListingRaw(item, input.profile))
      .filter((item): item is ListingRaw => Boolean(item));
  }

  private async getAccessToken(signal?: AbortSignal): Promise<string> {
    if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
      return cachedToken.accessToken;
    }

    const response = await fetch(`${getApiBaseUrl(this.config.environment)}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${createBasicAuthorization(this.config.clientId, this.config.clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: this.config.scope,
      }),
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`eBay OAuth failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EbayTokenResponse;
    cachedToken = {
      accessToken: payload.access_token,
      expiresAtMs: Date.now() + payload.expires_in * 1000,
    };

    return payload.access_token;
  }
}
