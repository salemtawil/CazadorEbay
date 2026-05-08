import { describe, expect, it } from "vitest";
import {
  PROFILE_PRESETS,
  applyPresetToDraft,
  buildProfileSummary,
  normalizeProfileTerms,
  serializeProfileTerms,
} from "@/lib/profiles/presentation";
import { makeProfile } from "./helpers/domain-fixtures";

describe("profile presentation", () => {
  it("builds a human summary from a persisted profile", () => {
    const summary = buildProfileSummary(
      makeProfile({
        keywords: ["ram ddr4", "32gb", "desktop"],
        blockedTerms: ["ecc", "server"],
        strategyMode: "buy_and_hold",
        riskTolerance: "low",
        strictMode: true,
      }),
    );

    expect(summary).toContain("Busca ram ddr4, 32gb y 1 mas");
    expect(summary).toContain("excluye ecc y server");
    expect(summary).toContain("modo comprador");
    expect(summary).toContain("riesgo bajo");
    expect(summary).toContain("filtrado estricto");
  });

  it("normalizes and serializes editable terms", () => {
    const terms = normalizeProfileTerms("gpu, rtx 4070\nfor parts ; gpu");

    expect(terms).toEqual(["gpu", "rtx 4070", "for parts"]);
    expect(serializeProfileTerms(terms)).toBe("gpu\nrtx 4070\nfor parts");
  });

  it("applies basic presets with useful defaults", () => {
    const draft = applyPresetToDraft("gpu");

    expect(draft.name).toBe("GPU para reventa");
    expect(draft.objective).toBe("reseller");
    expect(draft.strategyMode).toBe("flip");
    expect(draft.riskTolerance).toBe("medium");
    expect(draft.keywords.length).toBeGreaterThan(2);
    expect(PROFILE_PRESETS.some((preset) => preset.id === "smartphone")).toBe(true);
  });
});
