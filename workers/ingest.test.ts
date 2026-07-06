import { describe, expect, it } from "vitest";
import { metricCode, normalizeApiFootballStatus, numericStatValue } from "./ingest";

describe("API-Football match-stat normalization", () => {
  it("normalizes fixture status without treating postponed matches as finished", () => {
    expect(normalizeApiFootballStatus("FT")).toBe("finished");
    expect(normalizeApiFootballStatus("2H")).toBe("live");
    expect(normalizeApiFootballStatus("PST")).toBe("postponed");
    expect(normalizeApiFootballStatus("NS")).toBe("scheduled");
  });

  it("maps documented team statistics to stable internal codes", () => {
    expect(metricCode("Shots on Goal")).toBe("shots_on_target");
    expect(metricCode("Ball Possession")).toBe("possession");
    expect(metricCode("A New Provider Metric")).toBe("api_football_a_new_provider_metric");
  });

  it("parses count and percentage values while preserving non-numeric values as null", () => {
    expect(numericStatValue(12)).toBe(12);
    expect(numericStatValue("57%")).toBe(57);
    expect(numericStatValue("not available")).toBeNull();
  });
});
