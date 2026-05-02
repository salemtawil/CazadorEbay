import { describe, expect, it } from "vitest";
import { filterAlerts, getAlertState, sortAlerts } from "@/lib/alerts/presentation";
import type { InternalAlert } from "@/lib/modules/contracts";

function makeAlert(overrides: Partial<InternalAlert> = {}): InternalAlert {
  return {
    id: "alert_1",
    listingRawId: "lst_1",
    searchProfileId: "prof_1",
    alertType: "PRICE_DROPPED",
    severity: "warning",
    title: "Precio bajo",
    message: "El listing bajo de precio",
    metadata: {},
    createdAt: "2026-04-24T12:00:00.000Z",
    listingTitle: "Nintendo Switch OLED",
    profileName: "Consolas",
    ...overrides,
  };
}

describe("alerts presentation", () => {
  it("filters alerts by severity and state", () => {
    const unreadWarning = makeAlert({ id: "alert_unread_warning" });
    const readWarning = makeAlert({
      id: "alert_read_warning",
      readAt: "2026-04-24T13:00:00.000Z",
    });
    const dismissedCritical = makeAlert({
      id: "alert_dismissed_critical",
      severity: "critical",
      dismissedAt: "2026-04-24T14:00:00.000Z",
    });

    const results = filterAlerts([unreadWarning, readWarning, dismissedCritical], {
      query: "",
      alertType: "all",
      severity: "warning",
      state: "unread",
      profile: "",
      sort: "newest",
    });

    expect(results.map((alert) => alert.id)).toEqual(["alert_unread_warning"]);
  });

  it("orders alerts by severity and then by recency", () => {
    const warning = makeAlert({
      id: "alert_warning",
      severity: "warning",
      createdAt: "2026-04-24T12:00:00.000Z",
    });
    const critical = makeAlert({
      id: "alert_critical",
      severity: "critical",
      createdAt: "2026-04-24T11:00:00.000Z",
    });
    const info = makeAlert({
      id: "alert_info",
      severity: "info",
      createdAt: "2026-04-24T13:00:00.000Z",
    });

    const results = sortAlerts([warning, critical, info], "severity");

    expect(results.map((alert) => alert.id)).toEqual(["alert_critical", "alert_warning", "alert_info"]);
  });

  it("derives alert state from read and dismissed timestamps", () => {
    expect(getAlertState(makeAlert())).toBe("unread");
    expect(getAlertState(makeAlert({ readAt: "2026-04-24T13:00:00.000Z" }))).toBe("read");
    expect(getAlertState(makeAlert({ dismissedAt: "2026-04-24T13:00:00.000Z" }))).toBe("dismissed");
  });
});
