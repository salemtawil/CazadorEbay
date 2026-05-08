import { formatCurrency, formatPercent, humanizeToken } from "@/lib/formatting";
import type { EvaluationResult } from "@/lib/modules/contracts";
import { readNumericSearchParam, readSearchParam, setSearchParam, type SearchParamsRecord } from "@/lib/url-state";

export type OpportunityDecisionFilter =
  | "all"
  | "buy_now"
  | "make_offer"
  | "watch"
  | "ignore"
  | "restricted_watch";
export type OpportunityVisibleFilter = "only" | "all";
export type OpportunitySort =
  | "ui_score_desc"
  | "ui_score_asc"
  | "updated_desc"
  | "updated_asc"
  | "total_price_desc"
  | "total_price_asc";
export type OpportunitySpecialItemFilter =
  | "all"
  | "none"
  | "replacement_part_only"
  | "for_parts_not_working"
  | "incomplete_item"
  | "accessory_only"
  | "box_only"
  | "manual_only"
  | "ambiguous_bundle"
  | "mixed_lot";
export type OpportunityRiskLevel = "low" | "medium" | "high";

export interface OpportunityFilters {
  query: string;
  decision: OpportunityDecisionFilter;
  visibilityLevel: "all" | "primary_feed" | "secondary_feed" | "hidden";
  specialItemType: OpportunitySpecialItemFilter;
  profile: string;
  source: string;
  uiScoreMin?: number;
  uiScoreMax?: number;
  visible: OpportunityVisibleFilter;
  sort: OpportunitySort;
}

export interface OpportunityExplanation {
  headline: string;
  summary: string;
  shortSummary: string;
  reasons: string[];
  risks: string[];
}

const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilters = {
  query: "",
  decision: "all",
  visibilityLevel: "all",
  specialItemType: "all",
  profile: "",
  source: "",
  visible: "only",
  sort: "ui_score_desc",
};

const DECISION_VALUES = new Set<OpportunityDecisionFilter>([
  "all",
  "buy_now",
  "make_offer",
  "watch",
  "ignore",
  "restricted_watch",
]);
const VISIBILITY_VALUES = new Set<OpportunityFilters["visibilityLevel"]>(["all", "primary_feed", "secondary_feed", "hidden"]);
const SPECIAL_ITEM_VALUES = new Set<OpportunitySpecialItemFilter>([
  "all",
  "none",
  "replacement_part_only",
  "for_parts_not_working",
  "incomplete_item",
  "accessory_only",
  "box_only",
  "manual_only",
  "ambiguous_bundle",
  "mixed_lot",
]);
const SORT_VALUES = new Set<OpportunitySort>([
  "ui_score_desc",
  "ui_score_asc",
  "updated_desc",
  "updated_asc",
  "total_price_desc",
  "total_price_asc",
]);

export const OPPORTUNITY_DECISION_OPTIONS: Array<{ value: OpportunityDecisionFilter; label: string }> = [
  { value: "all", label: "Todas las recomendaciones" },
  { value: "buy_now", label: "Comprar ya" },
  { value: "make_offer", label: "Hacer oferta" },
  { value: "watch", label: "Vigilar" },
  { value: "ignore", label: "Descartar" },
  { value: "restricted_watch", label: "Vigilar con cautela" },
];

export const OPPORTUNITY_VISIBILITY_OPTIONS: Array<{
  value: OpportunityFilters["visibilityLevel"];
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "primary_feed", label: "Lista principal" },
  { value: "secondary_feed", label: "Revision secundaria" },
  { value: "hidden", label: "Ocultas" },
];

export const OPPORTUNITY_SPECIAL_ITEM_OPTIONS: Array<{ value: OpportunitySpecialItemFilter; label: string }> = [
  { value: "all", label: "Todos los tipos" },
  { value: "none", label: "Articulos normales" },
  { value: "replacement_part_only", label: "Solo repuesto" },
  { value: "for_parts_not_working", label: "Para reparar / no funciona" },
  { value: "incomplete_item", label: "Incompleto" },
  { value: "accessory_only", label: "Solo accesorio" },
  { value: "box_only", label: "Solo caja" },
  { value: "manual_only", label: "Solo manual" },
  { value: "ambiguous_bundle", label: "Bundle ambiguo" },
  { value: "mixed_lot", label: "Lote mixto" },
];

export const OPPORTUNITY_VISIBLE_OPTIONS: Array<{ value: OpportunityVisibleFilter; label: string }> = [
  { value: "only", label: "Solo visibles" },
  { value: "all", label: "Incluir ocultas" },
];

export const OPPORTUNITY_SORT_OPTIONS: Array<{ value: OpportunitySort; label: string }> = [
  { value: "ui_score_desc", label: "Mejor encaje primero" },
  { value: "updated_desc", label: "Mas recientes" },
  { value: "total_price_asc", label: "Mas baratas primero" },
  { value: "total_price_desc", label: "Mas caras primero" },
  { value: "ui_score_asc", label: "Menor prioridad" },
  { value: "updated_asc", label: "Mas antiguas" },
];

function parseEnumValue<T extends string>(rawValue: string | undefined, allowedValues: Set<T>, fallback: T): T {
  return rawValue && allowedValues.has(rawValue as T) ? (rawValue as T) : fallback;
}

function addUniqueMessage(target: string[], message: string | null | undefined) {
  if (!message) {
    return;
  }

  if (!target.includes(message)) {
    target.push(message);
  }
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function getOpportunityText(opportunity: EvaluationResult): string {
  return [
    opportunity.listingRaw.title,
    opportunity.classification.brand,
    opportunity.classification.model,
    opportunity.profile.name,
  ]
    .join(" ")
    .toLowerCase();
}

function getOpportunityDiscountRatio(opportunity: EvaluationResult): number {
  if (opportunity.market.medianPrice <= 0) {
    return 0;
  }

  return (opportunity.market.medianPrice - getOpportunityTotalPrice(opportunity)) / opportunity.market.medianPrice;
}

function normalizeIdentityValue(value: string | undefined, fallbackTokens: string[]): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return fallbackTokens.includes(trimmed.toLowerCase()) ? null : trimmed;
}

function translateDiscountReason(reason: string): string | null {
  const match = reason.match(/^Discount to market median: (-?\d+(?:\.\d+)?)%$/i);
  if (!match) {
    return null;
  }

  const discountValue = Number(match[1]);
  if (!Number.isFinite(discountValue)) {
    return null;
  }

  if (discountValue >= 0) {
    return `Esta ${Math.abs(discountValue).toFixed(1)}% por debajo de la mediana del mercado.`;
  }

  return `Esta ${Math.abs(discountValue).toFixed(1)}% por encima de la mediana del mercado.`;
}

function translateDemandReason(reason: string): string | null {
  const match = reason.match(/^Demand index (\d+(?:\.\d+)?) with sell-through (\d+)%$/i);
  if (!match) {
    return null;
  }

  return `La demanda luce saludable, con indice ${match[1]} y sell-through de ${match[2]}%.`;
}

function translateSellerReason(reason: string): string | null {
  const match = reason.match(/^Seller rating (\d+(?:\.\d+)?) with (\d+) historical sales$/i);
  if (!match) {
    return null;
  }

  return `El vendedor muestra ${match[1]}% de reputacion y ${match[2]} ventas historicas.`;
}

function translatePenaltyReason(reason: string): string | null {
  const match = reason.match(/^Risk penalty (\d+(?:\.\d+)?) and confidence penalty (\d+(?:\.\d+)?)$/i);
  if (!match) {
    return null;
  }

  return `El analisis detecta penalizaciones de riesgo (${match[1]}) y confianza (${match[2]}).`;
}

function translateOfferContextReason(reason: string, opportunity: EvaluationResult): string | null {
  const match = reason.match(
    /^Current total price (\d+(?:\.\d+)?) vs median (\d+(?:\.\d+)?), p25 (\d+(?:\.\d+)?), p10 (\d+(?:\.\d+)?)\.$/i,
  );
  if (!match) {
    return null;
  }

  return `El precio total actual es ${formatCurrency(Number(match[1]), opportunity.listingRaw.currency)} frente a una mediana de ${formatCurrency(Number(match[2]), opportunity.listingRaw.currency)}.`;
}

function translateListingAgeReason(reason: string): string | null {
  const match = reason.match(/^Listing age signal: (\d+) day\(s\) on market\.$/i);
  if (!match) {
    return null;
  }

  return `Lleva ${match[1]} dia(s) publicado.`;
}

function translateExpectedValueReason(reason: string, opportunity: EvaluationResult): string | null {
  const resaleMatch = reason.match(/^Expected resale net of fees: (-?\d+(?:\.\d+)?)$/i);
  if (resaleMatch) {
    return `La reventa estimada despues de comisiones ronda ${formatCurrency(Number(resaleMatch[1]), opportunity.listingRaw.currency)}.`;
  }

  const marginMatch = reason.match(/^Expected gross margin before refurbishment: (-?\d+(?:\.\d+)?)$/i);
  if (marginMatch) {
    return `El margen bruto estimado antes de reacondicionar ronda ${formatCurrency(Number(marginMatch[1]), opportunity.listingRaw.currency)}.`;
  }

  return null;
}

function buildHeuristicReasons(opportunity: EvaluationResult): string[] {
  const reasons: string[] = [];
  const uiScore = getOpportunityUiScore(opportunity);
  const decision = getOpportunityActionDecision(opportunity);
  const discountRatio = getOpportunityDiscountRatio(opportunity);
  const fitScore = opportunity.scoring.fitScore;
  const riskPenalty = opportunity.scoring.riskPenalty + opportunity.scoring.confidencePenalty;

  if (discountRatio >= 0.08) {
    addUniqueMessage(reasons, "El precio total esta por debajo de lo normal para este tipo de producto.");
  }

  if (decision === "buy_now") {
    addUniqueMessage(reasons, "La app ve una ventana clara para comprar antes de que se vaya.");
  }

  if (decision === "make_offer") {
    addUniqueMessage(reasons, "Todavia hay espacio para negociar sin salirte del rango razonable.");
  }

  if (uiScore >= 80) {
    addUniqueMessage(reasons, "Encaja muy bien con tu busqueda actual.");
  } else if (uiScore >= 65) {
    addUniqueMessage(reasons, "Encaja bastante bien y merece revision prioritaria.");
  }

  if (fitScore >= 75 || opportunity.classification.confidence >= opportunity.profile.minConfidence) {
    addUniqueMessage(reasons, "Parece una coincidencia solida para lo que estas cazando.");
  }

  if (
    getOpportunityTotalPrice(opportunity) <= (opportunity.market.p25Price ?? opportunity.market.medianPrice * 0.9) ||
    discountRatio >= 0.15
  ) {
    addUniqueMessage(reasons, "El precio de entrada es atractivo frente a referencias comparables.");
  }

  if (riskPenalty <= 8) {
    addUniqueMessage(reasons, "No arrastra penalizaciones fuertes de riesgo o confianza.");
  }

  if (opportunity.listingRaw.sellerRating >= 98) {
    addUniqueMessage(reasons, "El vendedor tiene una reputacion fuerte.");
  }

  if (opportunity.offer.offerStrategy === "offer_now" && opportunity.listingRaw.bestOfferAvailable) {
    addUniqueMessage(reasons, "Acepta ofertas, asi que puedes intentar mejorar el precio.");
  }

  return reasons;
}

function buildHeuristicRisks(opportunity: EvaluationResult): string[] {
  const risks: string[] = [];
  const decision = getOpportunityActionDecision(opportunity);
  const specialItemType = getOpportunitySpecialItemType(opportunity);
  const riskPenalty = opportunity.scoring.riskPenalty + opportunity.scoring.confidencePenalty;

  if (decision === "restricted_watch") {
    addUniqueMessage(risks, "Tiene senales buenas, pero no alcanza para ponerla arriba de todo.");
  }

  if (decision === "ignore") {
    addUniqueMessage(risks, "Con el precio y riesgo actuales no se ve como una compra clara.");
  }

  if (specialItemType === "for_parts_not_working") {
    addUniqueMessage(risks, "Es un articulo para reparar o sin funcionamiento confirmado.");
  } else if (specialItemType === "replacement_part_only") {
    addUniqueMessage(risks, "Es solo un repuesto y su utilidad es mas limitada.");
  } else if (specialItemType === "incomplete_item") {
    addUniqueMessage(risks, "Puede venir incompleto y afectar el valor real.");
  } else if (specialItemType === "accessory_only") {
    addUniqueMessage(risks, "Es un accesorio suelto, no el producto principal.");
  } else if (specialItemType === "box_only") {
    addUniqueMessage(risks, "Podria ser solo caja o empaque; revisa exactamente que incluye.");
  } else if (specialItemType === "manual_only") {
    addUniqueMessage(risks, "Podria ser solo manual o documentacion.");
  } else if (specialItemType === "ambiguous_bundle" || specialItemType === "mixed_lot") {
    addUniqueMessage(risks, "El lote o bundle no esta del todo claro y necesita revision manual.");
  }

  if (opportunity.visibility.visibilityLevel === "secondary_feed") {
    addUniqueMessage(risks, "La app la bajo a revision secundaria por compatibilidad parcial o penalizaciones.");
  }

  if (opportunity.visibility.visibilityLevel === "hidden") {
    addUniqueMessage(risks, "Quedo fuera de la vista principal por las reglas del perfil.");
  }

  if (opportunity.classification.confidence < opportunity.profile.minConfidence) {
    addUniqueMessage(risks, "La identificacion del producto todavia no es del todo segura.");
  }

  if (riskPenalty >= 15) {
    addUniqueMessage(risks, "La evaluacion detecta un nivel de riesgo alto para este perfil.");
  }

  if (!opportunity.listingRaw.returnsAccepted) {
    addUniqueMessage(risks, "El vendedor no acepta devoluciones.");
  }

  if (opportunity.listingRaw.sellerRating < 96) {
    addUniqueMessage(risks, "La reputacion del vendedor esta por debajo de lo ideal.");
  }

  if (!getOpportunityListingUrl(opportunity)) {
    addUniqueMessage(risks, "No hay enlace original para revisar el anuncio con calma.");
  }

  return risks;
}

export function translateOpportunityReason(reason: string, opportunity: EvaluationResult): string | null {
  const translatedReason =
    translateDiscountReason(reason) ??
    translateDemandReason(reason) ??
    translateSellerReason(reason) ??
    translatePenaltyReason(reason) ??
    translateOfferContextReason(reason, opportunity) ??
    translateListingAgeReason(reason) ??
    translateExpectedValueReason(reason, opportunity);

  if (translatedReason) {
    return translatedReason;
  }

  switch (reason) {
    case "Budget, risk or decision constraints make the listing non-actionable.":
      return "Las restricciones de presupuesto, riesgo o decision hacen que no sea accionable ahora mismo.";
    case "Clear bargain with high urgency and no Best Offer path. Do not risk losing it.":
      return "Parece una ganga clara y con urgencia alta; conviene no dejarla pasar.";
    case "Best Offer is unavailable, so the engine avoids inventing a negotiation path.":
      return "No acepta ofertas, asi que no hay una ruta realista de negociacion.";
    case "Risk or low confidence reduces aggressiveness and blocks a strong offer.":
      return "La confianza o el riesgo actual recomiendan ser mas conservador.";
    case "The listing is cheap enough relative to walk-away price and urgency is high.":
      return "El precio actual queda dentro del rango aceptable y la urgencia es alta.";
    case "Negotiation path is available and the listing remains actionable.":
      return "Se puede negociar y la oportunidad sigue siendo accionable.";
    case "Signals are not strong enough for an immediate offer.":
      return "Todavia no hay senales suficientes para hacer una oferta inmediata.";
    case "Reseller mode requires a tighter margin, so walk-away price is capped more aggressively.":
      return "Para este perfil de reventa se exige un margen mas estricto.";
    case "Price is at or below deep-discount territory and urgency is high.":
      return "El precio esta en zona de descuento profundo y la urgencia es alta.";
    case "Best Offer is available, so negotiation is a valid path.":
      return "Acepta ofertas, asi que negociar es una opcion real.";
    case "Profile excludes parts and repairs.":
      return "Este perfil excluye articulos para partes o reparacion.";
    case "Profile excludes replacement-part-only listings.":
      return "Este perfil excluye repuestos sueltos.";
    case "Profile excludes incomplete items.":
      return "Este perfil excluye articulos incompletos.";
    case "Profile excludes accessory-only listings.":
      return "Este perfil excluye accesorios sueltos.";
    case "Low-confidence items are down-ranked by profile settings.":
      return "La confianza de identificacion es baja para este perfil.";
    case "Special-case inventory gets restricted visibility by default.":
      return "Es un tipo de articulo especial y por eso se revisa con mas cautela.";
    case "Classification confidence is below the preferred threshold.":
      return "La identificacion del producto sigue por debajo de la confianza preferida.";
    case "Score is below the target threshold but still eligible for visibility review.":
      return "El score quedo por debajo del objetivo, aunque todavia merece revision.";
    case "Condition risk reduces feed priority.":
      return "El estado del articulo reduce su prioridad.";
    case "Penalties were tolerated by the profile, so the listing stays in the primary feed.":
      return "Aun con penalizaciones, el perfil la mantiene en la lista principal.";
    case "Penalties reduced the listing to the secondary feed.":
      return "Las penalizaciones la movieron a una revision secundaria.";
    case "Eligible listings surface in the primary feed by default.":
      return null;
    case "Visibility rules kept this listing out of the actionable feeds.":
      return "Las reglas de visibilidad la dejaron fuera de los feeds accionables.";
    case "Condition risk reduced the aggressiveness of the decision.":
      return "El riesgo de condicion hizo la recomendacion menos agresiva.";
    case "Replacement-part-only inventory cannot be treated as a primary buy candidate.":
      return "Al ser un repuesto suelto, no se trata como una compra principal.";
    default:
      return reason;
  }
}

export function parseOpportunityFilters(params: SearchParamsRecord): OpportunityFilters {
  return {
    query: readSearchParam(params, "q") ?? DEFAULT_OPPORTUNITY_FILTERS.query,
    decision: parseEnumValue(readSearchParam(params, "decision"), DECISION_VALUES, DEFAULT_OPPORTUNITY_FILTERS.decision),
    visibilityLevel: parseEnumValue(
      readSearchParam(params, "visibility"),
      VISIBILITY_VALUES,
      DEFAULT_OPPORTUNITY_FILTERS.visibilityLevel,
    ),
    specialItemType: parseEnumValue(
      readSearchParam(params, "specialItemType"),
      SPECIAL_ITEM_VALUES,
      DEFAULT_OPPORTUNITY_FILTERS.specialItemType,
    ),
    profile: readSearchParam(params, "profile") ?? DEFAULT_OPPORTUNITY_FILTERS.profile,
    source: readSearchParam(params, "source") ?? DEFAULT_OPPORTUNITY_FILTERS.source,
    uiScoreMin: readNumericSearchParam(params, "uiScoreMin"),
    uiScoreMax: readNumericSearchParam(params, "uiScoreMax"),
    visible: readSearchParam(params, "visible") === "all" ? "all" : DEFAULT_OPPORTUNITY_FILTERS.visible,
    sort: parseEnumValue(readSearchParam(params, "sort"), SORT_VALUES, DEFAULT_OPPORTUNITY_FILTERS.sort),
  };
}

export function serializeOpportunityFilters(filters: OpportunityFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  setSearchParam(searchParams, "q", filters.query);
  if (filters.decision !== DEFAULT_OPPORTUNITY_FILTERS.decision) {
    setSearchParam(searchParams, "decision", filters.decision);
  }
  if (filters.visibilityLevel !== DEFAULT_OPPORTUNITY_FILTERS.visibilityLevel) {
    setSearchParam(searchParams, "visibility", filters.visibilityLevel);
  }
  if (filters.specialItemType !== DEFAULT_OPPORTUNITY_FILTERS.specialItemType) {
    setSearchParam(searchParams, "specialItemType", filters.specialItemType);
  }
  setSearchParam(searchParams, "profile", filters.profile);
  setSearchParam(searchParams, "source", filters.source);
  setSearchParam(searchParams, "uiScoreMin", filters.uiScoreMin);
  setSearchParam(searchParams, "uiScoreMax", filters.uiScoreMax);
  if (filters.visible !== DEFAULT_OPPORTUNITY_FILTERS.visible) {
    setSearchParam(searchParams, "visible", filters.visible);
  }
  if (filters.sort !== DEFAULT_OPPORTUNITY_FILTERS.sort) {
    setSearchParam(searchParams, "sort", filters.sort);
  }

  return searchParams;
}

export function getOpportunityUiScore(opportunity: EvaluationResult): number {
  return opportunity.inspection?.uiScore ?? opportunity.scoring.totalScore;
}

export function getOpportunityTotalPrice(opportunity: EvaluationResult): number {
  return opportunity.listingNormalized.totalAcquisitionCost;
}

export function getOpportunityUpdatedAt(opportunity: EvaluationResult): string {
  return opportunity.inspection?.updatedAt ?? opportunity.listingRaw.scrapedAt;
}

export function getOpportunityListingUrl(opportunity: EvaluationResult): string | null {
  const rawUrl = opportunity.listingRaw.url?.trim();
  if (!rawUrl) {
    return null;
  }

  return /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
}

export function getOpportunityImageUrl(opportunity: EvaluationResult): string | null {
  const candidateKeys = ["imageUrl", "image", "thumbnailUrl", "thumbnail", "pictureUrl", "photoUrl"] as const;

  for (const key of candidateKeys) {
    const value = opportunity.listingRaw.attributes[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }

  return null;
}

export function getOpportunityBrand(opportunity: EvaluationResult): string | null {
  return normalizeIdentityValue(opportunity.classification.brand, ["generic", "unknown-brand"]);
}

export function getOpportunityModel(opportunity: EvaluationResult): string | null {
  return normalizeIdentityValue(opportunity.classification.model, ["unspecified", "unknown-model"]);
}

export function getOpportunityBrandModelLabel(opportunity: EvaluationResult): string | null {
  const brand = getOpportunityBrand(opportunity);
  const model = getOpportunityModel(opportunity);

  if (brand && model) {
    return brand === model ? brand : `${brand} ${model}`;
  }

  return brand ?? model;
}

export function getOpportunitySourceId(opportunity: EvaluationResult): string {
  const provider = opportunity.listingRaw.attributes.sourceProvider;
  if (typeof provider === "string" && provider.trim()) {
    return provider.trim().toLowerCase();
  }

  return opportunity.listingRaw.marketplace.toLowerCase();
}

export function formatOpportunitySourceLabel(source: string): string {
  if (source === "ebay" || source === "ebay-browse") {
    return "eBay";
  }

  return humanizeToken(source);
}

export function getOpportunitySourceLabel(opportunity: EvaluationResult): string {
  return formatOpportunitySourceLabel(getOpportunitySourceId(opportunity));
}

export function getOpportunityActionDecision(opportunity: EvaluationResult): OpportunityDecisionFilter {
  if (opportunity.offer.offerStrategy === "buy_now") {
    return "buy_now";
  }

  if (opportunity.offer.offerStrategy === "offer_now") {
    return "make_offer";
  }

  if (opportunity.offer.offerStrategy === "watch" && opportunity.visibility.visibilityLevel !== "primary_feed") {
    return "restricted_watch";
  }

  if (opportunity.offer.offerStrategy === "watch") {
    return "watch";
  }

  return "ignore";
}

export function getOpportunityActionLabel(decision: OpportunityDecisionFilter): string {
  return OPPORTUNITY_DECISION_OPTIONS.find((option) => option.value === decision)?.label ?? humanizeToken(decision);
}

export function getOpportunityActionDescription(decision: OpportunityDecisionFilter): string {
  switch (decision) {
    case "buy_now":
      return "Se ve accionable ahora mismo y con urgencia alta.";
    case "make_offer":
      return "Tiene sentido negociar antes de comprometer la compra.";
    case "watch":
      return "Conviene seguirla, pero todavia no exige movimiento inmediato.";
    case "restricted_watch":
      return "Merece mirada manual, aunque no es una prioridad limpia.";
    case "ignore":
      return "No destaca como compra razonable con la informacion actual.";
    default:
      return "Requiere una revision manual adicional.";
  }
}

export function getOpportunityVisibilityLabel(
  visibilityLevel: OpportunityFilters["visibilityLevel"] | "primary_feed" | "secondary_feed" | "hidden",
): string {
  return OPPORTUNITY_VISIBILITY_OPTIONS.find((option) => option.value === visibilityLevel)?.label ?? humanizeToken(visibilityLevel);
}

export function getOpportunitySpecialItemType(opportunity: EvaluationResult): OpportunitySpecialItemFilter {
  const titleText = `${opportunity.listingRaw.title} ${opportunity.listingRaw.subtitle ?? ""}`.toLowerCase();
  const itemType = opportunity.listingNormalized.itemType;

  if (itemType === "REPLACEMENT_PART_ONLY") {
    return "replacement_part_only";
  }

  if (itemType === "FOR_PARTS_NOT_WORKING") {
    return "for_parts_not_working";
  }

  if (itemType === "INCOMPLETE_ITEM") {
    return "incomplete_item";
  }

  if (/manual only|owners? manual|instruction manual/i.test(titleText)) {
    return "manual_only";
  }

  if (opportunity.classification.flags.includes("box_only") || /box only|empty box|packaging only/i.test(titleText)) {
    return "box_only";
  }

  if (itemType === "ACCESSORY_ONLY") {
    return "accessory_only";
  }

  if (
    opportunity.inspection?.listingState === "lot" ||
    opportunity.inspection?.specialItemType === "lot" ||
    /mixed lot|assorted lot|lot of \d+|mixed bundle/i.test(titleText)
  ) {
    return "mixed_lot";
  }

  if (
    opportunity.inspection?.specialItemType === "bundle" ||
    ((/bundle|assorted/i.test(titleText) || opportunity.listingRaw.attributes.bundle === true) &&
      opportunity.classification.confidence < Math.max(0.78, opportunity.profile.minConfidence))
  ) {
    return "ambiguous_bundle";
  }

  return "none";
}

export function getOpportunitySpecialItemLabel(value: OpportunitySpecialItemFilter): string {
  return OPPORTUNITY_SPECIAL_ITEM_OPTIONS.find((option) => option.value === value)?.label ?? humanizeToken(value);
}

export function filterOpportunities(opportunities: EvaluationResult[], filters: OpportunityFilters): EvaluationResult[] {
  const normalizedQuery = normalizeSearchText(filters.query);

  return opportunities.filter((opportunity) => {
    const uiScore = getOpportunityUiScore(opportunity);
    const totalSearchText = getOpportunityText(opportunity);
    const actionDecision = getOpportunityActionDecision(opportunity);
    const specialItemType = getOpportunitySpecialItemType(opportunity);
    const source = getOpportunitySourceId(opportunity);

    if (filters.visible === "only" && !opportunity.visibility.isVisible) {
      return false;
    }

    if (normalizedQuery && !totalSearchText.includes(normalizedQuery)) {
      return false;
    }

    if (filters.decision !== "all" && actionDecision !== filters.decision) {
      return false;
    }

    if (filters.visibilityLevel !== "all" && opportunity.visibility.visibilityLevel !== filters.visibilityLevel) {
      return false;
    }

    if (filters.specialItemType !== "all" && specialItemType !== filters.specialItemType) {
      return false;
    }

    if (filters.profile && opportunity.profile.id !== filters.profile) {
      return false;
    }

    if (filters.source && source !== filters.source) {
      return false;
    }

    if (filters.uiScoreMin !== undefined && uiScore < filters.uiScoreMin) {
      return false;
    }

    if (filters.uiScoreMax !== undefined && uiScore > filters.uiScoreMax) {
      return false;
    }

    return true;
  });
}

export function sortOpportunities(opportunities: EvaluationResult[], sort: OpportunitySort): EvaluationResult[] {
  return [...opportunities].sort((left, right) => {
    if (sort === "ui_score_asc") {
      return getOpportunityUiScore(left) - getOpportunityUiScore(right);
    }

    if (sort === "ui_score_desc") {
      return getOpportunityUiScore(right) - getOpportunityUiScore(left);
    }

    if (sort === "updated_asc") {
      return new Date(getOpportunityUpdatedAt(left)).getTime() - new Date(getOpportunityUpdatedAt(right)).getTime();
    }

    if (sort === "updated_desc") {
      return new Date(getOpportunityUpdatedAt(right)).getTime() - new Date(getOpportunityUpdatedAt(left)).getTime();
    }

    if (sort === "total_price_asc") {
      return getOpportunityTotalPrice(left) - getOpportunityTotalPrice(right);
    }

    return getOpportunityTotalPrice(right) - getOpportunityTotalPrice(left);
  });
}

export function applyOpportunityFilters(opportunities: EvaluationResult[], filters: OpportunityFilters): EvaluationResult[] {
  return sortOpportunities(filterOpportunities(opportunities, filters), filters.sort);
}

export function buildOpportunityExplanation(opportunity: EvaluationResult): OpportunityExplanation {
  const reasons = buildHeuristicReasons(opportunity);
  const risks = buildHeuristicRisks(opportunity);
  const translatedPositiveReasons = (opportunity.inspection?.driversPositive ?? [])
    .map((reason) => translateOpportunityReason(reason, opportunity))
    .filter((reason): reason is string => Boolean(reason));
  const translatedNegativeReasons = (opportunity.inspection?.driversNegative ?? [])
    .map((reason) => translateOpportunityReason(reason, opportunity))
    .filter((reason): reason is string => Boolean(reason));

  translatedPositiveReasons.forEach((reason) => addUniqueMessage(reasons, reason));
  translatedNegativeReasons.forEach((risk) => addUniqueMessage(risks, risk));

  const actionDecision = getOpportunityActionDecision(opportunity);
  const headline = getOpportunityActionLabel(actionDecision);
  const summaryParts = reasons.slice(0, 2);
  const summary =
    summaryParts.length > 0
      ? `${summaryParts.join(" ")}${risks[0] ? ` Riesgo principal: ${risks[0]}` : ""}`
      : risks[0] ?? "No hay suficientes senales explicativas todavia.";

  return {
    headline,
    summary,
    shortSummary: summaryParts.join(" ") || risks[0] || "No hay suficientes senales explicativas todavia.",
    reasons,
    risks,
  };
}

export function buildOpportunityShortSummary(opportunity: EvaluationResult): string {
  return buildOpportunityExplanation(opportunity).shortSummary;
}

export function getOpportunityMarketReference(opportunity: EvaluationResult): number | null {
  return opportunity.market.medianPrice > 0 ? opportunity.market.medianPrice : null;
}

export function getOpportunityEstimatedSavings(opportunity: EvaluationResult): number | null {
  const reference = getOpportunityMarketReference(opportunity);
  if (!reference) {
    return null;
  }

  const savings = reference - getOpportunityTotalPrice(opportunity);
  return Number.isFinite(savings) ? savings : null;
}

export function getOpportunityPriceContext(opportunity: EvaluationResult): string {
  const reference = getOpportunityMarketReference(opportunity);
  if (!reference) {
    return `${formatCurrency(getOpportunityTotalPrice(opportunity), opportunity.listingRaw.currency)} total`;
  }

  const savings = getOpportunityEstimatedSavings(opportunity) ?? 0;
  const savingsLabel =
    savings >= 0
      ? `${formatCurrency(savings, opportunity.listingRaw.currency)} por debajo de referencia`
      : `${formatCurrency(Math.abs(savings), opportunity.listingRaw.currency)} por encima de referencia`;

  return `${formatCurrency(getOpportunityTotalPrice(opportunity), opportunity.listingRaw.currency)} total · ${savingsLabel}`;
}

export function getOpportunityRiskLevel(opportunity: EvaluationResult): OpportunityRiskLevel {
  const riskPenalty = opportunity.scoring.riskPenalty + opportunity.scoring.confidencePenalty;
  const specialType = getOpportunitySpecialItemType(opportunity);
  const confidenceGap = opportunity.classification.confidence < opportunity.profile.minConfidence;
  const sellerWeak = opportunity.listingRaw.sellerRating < 96 || !opportunity.listingRaw.returnsAccepted;
  const specialRisky =
    specialType === "for_parts_not_working" ||
    specialType === "replacement_part_only" ||
    specialType === "incomplete_item" ||
    specialType === "mixed_lot" ||
    specialType === "ambiguous_bundle";

  if (riskPenalty >= 15 || specialRisky || opportunity.visibility.visibilityLevel === "hidden") {
    return "high";
  }

  if (riskPenalty >= 8 || confidenceGap || sellerWeak || opportunity.visibility.visibilityLevel === "secondary_feed") {
    return "medium";
  }

  return "low";
}

export function getOpportunityRiskLabel(level: OpportunityRiskLevel): string {
  if (level === "low") {
    return "Riesgo bajo";
  }

  if (level === "high") {
    return "Riesgo alto";
  }

  return "Riesgo medio";
}

export function getOpportunityRiskSummary(opportunity: EvaluationResult): string {
  const explanation = buildOpportunityExplanation(opportunity);
  return explanation.risks[0] ?? "No aparecen senales fuertes de riesgo con los datos actuales.";
}

export function getOpportunityRecommendedOfferLabel(opportunity: EvaluationResult): string | null {
  if (opportunity.offer.recommendedOffer === null || opportunity.offer.recommendedOffer === undefined) {
    return null;
  }

  return formatCurrency(opportunity.offer.recommendedOffer, opportunity.listingRaw.currency);
}

export function getOpportunityMaxReasonablePriceLabel(opportunity: EvaluationResult): string | null {
  if (opportunity.offer.walkAwayPrice === null || opportunity.offer.walkAwayPrice === undefined) {
    return null;
  }

  return formatCurrency(opportunity.offer.walkAwayPrice, opportunity.listingRaw.currency);
}

export function getOpportunitySellerSummary(opportunity: EvaluationResult): string {
  const parts = [opportunity.listingRaw.sellerName];

  if (opportunity.listingRaw.sellerRating > 0) {
    parts.push(`${opportunity.listingRaw.sellerRating}% reputacion`);
  }

  if (opportunity.listingRaw.sellerSalesCount > 0) {
    parts.push(`${opportunity.listingRaw.sellerSalesCount} ventas`);
  }

  return parts.join(" · ");
}

export function getOpportunityPrimaryReasons(opportunity: EvaluationResult, limit = 3): string[] {
  return buildOpportunityExplanation(opportunity).reasons.slice(0, limit);
}

export function getOpportunityWhatToDoNow(opportunity: EvaluationResult): string {
  const decision = getOpportunityActionDecision(opportunity);
  const recommendedOffer = getOpportunityRecommendedOfferLabel(opportunity);
  const walkAwayPrice = getOpportunityMaxReasonablePriceLabel(opportunity);

  if (decision === "buy_now") {
    return walkAwayPrice ? `Abrir eBay y comprar si sigue en ${walkAwayPrice} o menos.` : "Abrir eBay y revisar si sigue disponible.";
  }

  if (decision === "make_offer") {
    return recommendedOffer ? `Abrir eBay y probar una oferta cerca de ${recommendedOffer}.` : "Abrir eBay y revisar margen para hacer oferta.";
  }

  if (decision === "watch" || decision === "restricted_watch") {
    return "Seguirla de cerca y volver a revisar si cambia precio o estado.";
  }

  return "No mover ficha todavia; solo vale una revision manual si te interesa mucho.";
}
