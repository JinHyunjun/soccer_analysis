import { z } from "zod";
import type { LeagueTable, MatchSummary, SourceMeta } from "@/lib/domain";

const BASE_URL = "https://api.football-data.org/v4";

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullish(),
  crest: z.string().url().nullish(),
});

const matchSchema = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  minute: z.number().nullish(),
  injuryTime: z.number().nullish(),
  stage: z.string().nullish(),
  competition: z.object({ name: z.string() }),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: z.object({
    fullTime: z.object({
      home: z.number().nullish(),
      away: z.number().nullish(),
    }),
  }),
});

const matchesResponseSchema = z.object({ matches: z.array(matchSchema) });

const standingsResponseSchema = z.object({
  competition: z.object({ code: z.string(), name: z.string(), type: z.string() }),
  standings: z.array(
    z.object({
      type: z.string(),
      table: z.array(
        z.object({
          position: z.number(),
          team: teamSchema,
          playedGames: z.number(),
          won: z.number(),
          draw: z.number(),
          lost: z.number(),
          goalDifference: z.number(),
          points: z.number(),
        }),
      ),
    }),
  ),
});

function normalizeStatus(status: string): MatchSummary["status"] {
  if (["IN_PLAY", "PAUSED", "HALFTIME", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(status)) return "live";
  if (status === "FINISHED") return "finished";
  if (["POSTPONED", "SUSPENDED", "CANCELLED"].includes(status)) return "postponed";
  return "scheduled";
}

export function normalizeMatches(input: unknown): MatchSummary[] {
  const { matches } = matchesResponseSchema.parse(input);
  return matches.map((match) => ({
    id: `fd-${match.id}`,
    competition: match.competition.name,
    stage: match.stage ?? undefined,
    kickoff: match.utcDate,
    status: normalizeStatus(match.status),
    minute: match.minute ? `${match.minute}${match.injuryTime ? `+${match.injuryTime}` : ""}'` : undefined,
    home: {
      id: String(match.homeTeam.id),
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName ?? undefined,
      crest: match.homeTeam.crest ?? undefined,
    },
    away: {
      id: String(match.awayTeam.id),
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName ?? undefined,
      crest: match.awayTeam.crest ?? undefined,
    },
    homeScore: match.score.fullTime.home ?? null,
    awayScore: match.score.fullTime.away ?? null,
    source: "football-data.org",
  }));
}

export function normalizeTable(input: unknown): LeagueTable | null {
  const response = standingsResponseSchema.parse(input);
  const standing = response.standings.find((item) => item.type === "TOTAL") ?? response.standings[0];
  if (!standing) return null;

  return {
    code: response.competition.code,
    name: response.competition.name,
    type: response.competition.type,
    source: "football-data.org",
    rows: standing.table.map((row) => ({
      position: row.position,
      team: {
        id: String(row.team.id),
        name: row.team.name,
        shortName: row.team.shortName ?? undefined,
        crest: row.team.crest ?? undefined,
      },
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      goalDifference: row.goalDifference,
      points: row.points,
    })),
  };
}

async function request(path: string, token: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`football-data.org ${response.status}: ${path}`);
  }
  return response.json();
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getFootballData(): Promise<{
  matches: MatchSummary[];
  tables: LeagueTable[];
  meta: SourceMeta;
}> {
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) {
    return {
      matches: [],
      tables: [],
      meta: {
        provider: "football-data.org",
        state: "unavailable",
        updatedAt: new Date().toISOString(),
        attribution: "Data provided by football-data.org",
        note: "FOOTBALL_DATA_TOKEN이 설정되지 않았습니다.",
      },
    };
  }

  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + 3);
  const competitions = (process.env.FOOTBALL_DATA_COMPETITIONS ?? "WC,PL,PD,BL1,SA,FL1")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  const matchesPromise = request(`/matches?dateFrom=${dateString(now)}&dateTo=${dateString(until)}`, token)
    .then(normalizeMatches)
    .catch(() => [] as MatchSummary[]);

  const tablePromises = competitions.map((code) =>
    request(`/competitions/${encodeURIComponent(code)}/standings`, token)
      .then(normalizeTable)
      .catch(() => null),
  );

  const [matches, ...tables] = await Promise.all([matchesPromise, ...tablePromises]);

  return {
    matches,
    tables: tables.filter((table): table is LeagueTable => table !== null),
    meta: {
      provider: "football-data.org",
      state: "live",
      updatedAt: new Date().toISOString(),
      attribution: "Data provided by football-data.org",
      note: "무료 플랜은 분당 10회 제한입니다.",
    },
  };
}
