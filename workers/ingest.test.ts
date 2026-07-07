import { describe, expect, it } from "vitest";
import {
  metricCode,
  normalizeApiFootballStatus,
  numericStatValue,
  optionalScheduledScopes,
  resolveOpenLigaScore,
} from "./ingest";

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

describe("OpenLigaDB live-score selection", () => {
  it("prefers the latest goal snapshot over stale match results", () => {
    expect(resolveOpenLigaScore(
      [{ pointsTeam1: 0, pointsTeam2: 0, resultOrderID: 1 }],
      [
        { goalID: 10, scoreTeam1: 1, scoreTeam2: 0 },
        { goalID: 12, scoreTeam1: 1, scoreTeam2: 1 },
      ],
    )).toEqual({ home: 1, away: 1 });
  });

  it("falls back to the highest-order match result when there are no goals", () => {
    expect(resolveOpenLigaScore(
      [
        { pointsTeam1: 1, pointsTeam2: 1, resultOrderID: 1 },
        { pointsTeam1: 4, pointsTeam2: 3, resultOrderID: 2 },
      ],
      [],
    )).toEqual({ home: 4, away: 3 });
  });
});

describe("single-cron optional schedule", () => {
  it("schedules standings and transfers on a six-hour boundary", () => {
    expect(optionalScheduledScopes(new Date("2026-07-07T06:00:00Z")))
      .toEqual(["standings", "transfers"]);
  });

  it("schedules deep statistics on the daily half-hour slot", () => {
    expect(optionalScheduledScopes(new Date("2026-07-07T03:30:00Z")))
      .toEqual(["stats"]);
  });

  it("does not return unreachable quarter-hour work for a 30-minute cron", () => {
    expect(optionalScheduledScopes(new Date("2026-07-07T00:15:00Z"))).toEqual([]);
  });
});
