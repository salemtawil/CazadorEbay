import { describe, expect, it } from "vitest";
import { buildSystemStatusMessages, type SystemStatusSnapshot } from "../lib/modules/system-status";

function makeSnapshot(overrides: Partial<SystemStatusSnapshot> = {}): SystemStatusSnapshot {
  return {
    databaseConfigured: true,
    listingRawCount: 0,
    listingNormalizedCount: 0,
    listingEvaluationCount: 0,
    alertCount: 0,
    activeProfileCount: 0,
    useFixtureData: false,
    ebayEnabled: false,
    cronSecretConfigured: false,
    ...overrides,
  };
}

describe("system status messages", () => {
  it("warns when there are active profiles but no evaluations", () => {
    const messages = buildSystemStatusMessages(
      makeSnapshot({
        activeProfileCount: 2,
      }),
    );

    expect(messages.some((message) => message.title === "Perfiles activos sin evaluaciones")).toBe(true);
  });

  it("reports evaluations without alerts", () => {
    const messages = buildSystemStatusMessages(
      makeSnapshot({
        listingRawCount: 12,
        listingNormalizedCount: 12,
        listingEvaluationCount: 8,
        activeProfileCount: 2,
      }),
    );

    expect(messages.some((message) => message.title === "Evaluaciones sin alertas")).toBe(true);
  });

  it("explains fixture mode separately from database counts", () => {
    const messages = buildSystemStatusMessages(
      makeSnapshot({
        useFixtureData: true,
        listingRawCount: 3,
      }),
    );

    expect(messages.some((message) => message.title === "Fixtures activos en la app")).toBe(true);
  });
});
