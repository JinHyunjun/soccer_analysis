import { describe, expect, it } from "vitest";
import { normalizeTransfers } from "./api-football";

describe("API-Football transfer normalizer", () => {
  it("flattens each player's transfer history", () => {
    const items = normalizeTransfers({
      response: [{
        player: { id: 7, name: "Example Player" },
        transfers: [{
          date: "2026-07-01",
          type: "Permanent",
          teams: { in: { id: 2, name: "New Club" }, out: { id: 1, name: "Old Club" } },
        }],
      }],
    });

    expect(items[0]).toMatchObject({ playerName: "Example Player", date: "2026-07-01", type: "Permanent" });
    expect(items[0].from.name).toBe("Old Club");
    expect(items[0].to.name).toBe("New Club");
  });
});
