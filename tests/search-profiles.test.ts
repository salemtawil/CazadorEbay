import { describe, expect, it } from "vitest";
import { getActiveProfiles } from "../lib/modules/search-profiles";
import { makeProfile } from "./helpers/domain-fixtures";

describe("search profiles", () => {
  it("returns only active profiles", () => {
    const profiles = [
      makeProfile({ id: "prof_active", status: "active" }),
      makeProfile({ id: "prof_paused", status: "paused" }),
      makeProfile({ id: "prof_archived", status: "archived" }),
    ];

    expect(getActiveProfiles(profiles).map((profile) => profile.id)).toEqual(["prof_active"]);
  });
});
