import type { Classification, Listing, ListingNormalized } from "@/lib/modules/contracts";

const BRAND_KEYWORDS = ["sony", "nintendo", "apple", "bosch", "dewalt", "canon"];

function inferBrand(text: string): string {
  const lowered = text.toLowerCase();
  const match = BRAND_KEYWORDS.find((brand) => lowered.includes(brand));
  return match ? match.toUpperCase() : "GENERIC";
}

function inferModel(text: string): string {
  const chunks = text.split(" ").filter((part) => /\d/.test(part) || /[A-Z]{2,}/.test(part));
  return chunks.slice(0, 2).join(" ") || "UNSPECIFIED";
}

export function classifyListing(listing: Listing, normalized: ListingNormalized): Classification {
  const text = `${listing.title} ${listing.subtitle ?? ""}`;
  const flags: string[] = [];
  const notes: string[] = [];

  if (/untested|as is|parts/i.test(text) || normalized.itemType === "FOR_PARTS_NOT_WORKING") {
    flags.push("risky_condition");
    notes.push("Listing title suggests inspection or repair risk.");
  }

  if (normalized.itemType === "FOR_PARTS_NOT_WORKING") {
    flags.push("for_parts_not_working");
  }

  if (normalized.itemType === "REPLACEMENT_PART_ONLY") {
    flags.push("replacement_part_only");
  }

  if (normalized.itemType === "INCOMPLETE_ITEM") {
    flags.push("incomplete_item");
  }

  if (normalized.itemType === "ACCESSORY_ONLY") {
    flags.push("accessory_only");
  }

  if (/box only|empty box|packaging only/i.test(text)) {
    flags.push("box_only");
    notes.push("Listing appears to be packaging or box-only inventory.");
  }

  if (listing.sellerRating < 96) {
    flags.push("seller_trust");
    notes.push("Seller rating is below the preferred threshold.");
  }

  if (!listing.returnsAccepted) {
    flags.push("no_returns");
    notes.push("Seller does not accept returns.");
  }

  const confidence = Math.max(
    0.55,
    Math.min(0.97, 0.72 + (listing.sellerRating - 95) * 0.02 - flags.length * 0.05),
  );

  return {
    listingId: listing.id,
    brand: inferBrand(text),
    model: inferModel(text),
    confidence: Number(confidence.toFixed(2)),
    flags,
    notes,
  };
}
