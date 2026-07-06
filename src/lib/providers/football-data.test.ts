import { describe, expect, it } from "vitest";
import { normalizeMatches, normalizeTable } from "./football-data";

const team = (id: number, name: string) => ({ id, name, shortName: name, crest: null });

describe("football-data.org normalizers", () => {
  it("normalizes a live match without inventing missing scores", () => {
    const matches = normalizeMatches({
      matches: [{
        id: 99,
        utcDate: "2026-07-05T18:00:00Z",
        status: "IN_PLAY",
        minute: 72,
        injuryTime: null,
        stage: "LAST_16",
        competition: { name: "World Cup" },
        homeTeam: team(1, "Korea Republic"),
        awayTeam: team(2, "France"),
        score: { fullTime: { home: 1, away: 1 } },
      }],
    });

    expect(matches[0]).toMatchObject({ status: "live", minute: "72'", homeScore: 1, awayScore: 1 });
  });

  it("selects the TOTAL standings table", () => {
    const table = normalizeTable({
      competition: { code: "PL", name: "Premier League", type: "LEAGUE" },
      standings: [{
        type: "TOTAL",
        table: [{ position: 1, team: team(1, "Arsenal"), playedGames: 2, won: 2, draw: 0, lost: 0, goalDifference: 4, points: 6 }],
      }],
    });
    expect(table?.rows[0]).toMatchObject({ position: 1, points: 6, played: 2 });
  });
});
