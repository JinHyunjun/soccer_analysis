import { XMLParser } from "fast-xml-parser";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const MAX_RSS_BYTES = 1_000_000;
const BATCH_SIZE = 40;

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullish(),
  crest: z.string().url().nullish(),
});

const matchesSchema = z.object({
  matches: z.array(z.object({
    id: z.number(),
    utcDate: z.string(),
    status: z.string(),
    minute: z.number().nullish(),
    injuryTime: z.number().nullish(),
    stage: z.string().nullish(),
    competition: z.object({ id: z.number(), code: z.string().nullish(), name: z.string(), type: z.string().nullish() }),
    homeTeam: teamSchema,
    awayTeam: teamSchema,
    score: z.object({ fullTime: z.object({ home: z.number().nullish(), away: z.number().nullish() }) }),
  })),
});

const standingsSchema = z.object({
  competition: z.object({ id: z.number(), code: z.string().nullish(), name: z.string(), type: z.string().nullish() }),
  season: z.object({ startDate: z.string() }),
  standings: z.array(z.object({
    type: z.string(),
    table: z.array(z.object({
      position: z.number(),
      team: teamSchema,
      playedGames: z.number(),
      won: z.number(),
      draw: z.number(),
      lost: z.number(),
      goalDifference: z.number(),
      points: z.number(),
    })),
  })),
});

const transfersSchema = z.object({
  response: z.array(z.object({
    player: z.object({ id: z.number(), name: z.string() }),
    transfers: z.array(z.object({
      date: z.string(),
      type: z.string().nullish(),
      teams: z.object({
        in: z.object({ id: z.number().nullable(), name: z.string() }),
        out: z.object({ id: z.number().nullable(), name: z.string() }),
      }),
    })),
  })),
});

const apiNullableNumber = z.preprocess(
  (value) => value === null || value === undefined || value === "" ? null : Number(value),
  z.number().finite().nullable(),
);

const openLigaTeamSchema = z.object({
  teamId: z.number(),
  teamName: z.string(),
  shortName: z.string().nullish(),
  teamIconUrl: z.string().nullish(),
});

const openLigaMatchesSchema = z.array(z.object({
  matchID: z.number(),
  matchDateTimeUTC: z.string().nullish(),
  matchDateTime: z.string(),
  leagueId: z.number(),
  leagueName: z.string(),
  leagueSeason: z.number(),
  leagueShortcut: z.string(),
  group: z.object({ groupName: z.string().nullish() }).nullish(),
  team1: openLigaTeamSchema,
  team2: openLigaTeamSchema,
  matchIsFinished: z.boolean(),
  matchResults: z.array(z.object({
    pointsTeam1: z.number(),
    pointsTeam2: z.number(),
    resultOrderID: z.number(),
  })).default([]),
  goals: z.array(z.object({
    goalID: z.number(),
    scoreTeam1: z.number(),
    scoreTeam2: z.number(),
    matchMinute: z.number().nullish(),
    goalGetterID: z.number().nullish(),
    goalGetterName: z.string().nullish(),
    scoringTeamId: z.number().nullish(),
    isPenalty: z.boolean(),
    isOwnGoal: z.boolean(),
    isOvertime: z.boolean(),
  })).default([]),
}));

const apiFootballFixtureSchema = z.object({
  fixture: z.object({
    id: z.number(),
    date: z.string(),
    status: z.object({ short: z.string(), elapsed: z.number().nullish(), extra: z.number().nullish() }),
  }),
  league: z.object({ id: z.number(), name: z.string(), season: z.number(), round: z.string().nullish() }),
  teams: z.object({
    home: z.object({ id: z.number(), name: z.string(), logo: z.string().nullish() }),
    away: z.object({ id: z.number(), name: z.string(), logo: z.string().nullish() }),
  }),
  goals: z.object({ home: z.number().nullish(), away: z.number().nullish() }),
});

const apiFootballFixturesSchema = z.object({ response: z.array(apiFootballFixtureSchema) });

const apiFootballTeamStatsSchema = z.object({
  response: z.array(z.object({
    team: z.object({ id: z.number(), name: z.string(), logo: z.string().nullish() }),
    statistics: z.array(z.object({ type: z.string(), value: z.union([z.string(), z.number()]).nullish() })),
  })),
});

const apiFootballPlayerStatsSchema = z.object({
  response: z.array(z.object({
    team: z.object({ id: z.number(), name: z.string(), logo: z.string().nullish() }),
    players: z.array(z.object({
      player: z.object({ id: z.number(), name: z.string(), photo: z.string().nullish() }),
      statistics: z.array(z.object({
        games: z.object({
          minutes: apiNullableNumber,
          number: apiNullableNumber,
          position: z.string().nullish(),
          rating: apiNullableNumber,
          captain: z.boolean().nullish(),
          substitute: z.boolean().nullish(),
        }),
        offsides: apiNullableNumber.optional(),
        shots: z.object({ total: apiNullableNumber, on: apiNullableNumber }),
        goals: z.object({
          total: apiNullableNumber,
          conceded: apiNullableNumber,
          assists: apiNullableNumber,
          saves: apiNullableNumber,
        }),
        passes: z.object({ total: apiNullableNumber, key: apiNullableNumber, accuracy: apiNullableNumber }),
        tackles: z.object({ total: apiNullableNumber, blocks: apiNullableNumber, interceptions: apiNullableNumber }),
        duels: z.object({ total: apiNullableNumber, won: apiNullableNumber }),
        dribbles: z.object({ attempts: apiNullableNumber, success: apiNullableNumber, past: apiNullableNumber }),
        fouls: z.object({ drawn: apiNullableNumber, committed: apiNullableNumber }),
        cards: z.object({ yellow: apiNullableNumber, red: apiNullableNumber }),
        penalty: z.object({
          won: apiNullableNumber,
          commited: apiNullableNumber.optional(),
          conceded: apiNullableNumber.optional(),
          scored: apiNullableNumber,
          missed: apiNullableNumber,
          saved: apiNullableNumber,
        }),
      })).min(1),
    })),
  })),
});

const rssRootSchema = z.object({
  rss: z.object({
    channel: z.object({
      item: z.union([z.array(z.unknown()), z.unknown()]).optional(),
    }).passthrough(),
  }),
});

const rssItemSchema = z.object({
  title: z.unknown(),
  link: z.unknown(),
  pubDate: z.unknown().optional(),
  description: z.unknown().optional(),
  guid: z.unknown().optional(),
}).passthrough();

const marketValueImportSchema = z.object({
  items: z.array(z.object({
    playerName: z.string().trim().min(1).max(150),
    playerExternalId: z.string().trim().min(1).max(150).optional(),
    transfermarktId: z.string().trim().max(50).optional(),
    teamName: z.string().trim().max(150).optional(),
    valueEur: z.number().int().nonnegative().max(1_000_000_000),
    valuedAt: z.iso.date(),
    sourceUrl: z.string().url().max(1000),
    sourceNote: z.string().trim().max(500).optional(),
  })).min(1).max(500),
});

type SyncScope = "matches" | "standings" | "news" | "transfers" | "stats" | "all";

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function featureEnabled(value: string): boolean {
  return value.toLowerCase() === "true";
}

function todayUtc(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function normalizeMatchStatus(status: string): "scheduled" | "live" | "finished" | "postponed" {
  if (["IN_PLAY", "PAUSED", "HALFTIME", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(status)) return "live";
  if (status === "FINISHED") return "finished";
  if (["POSTPONED", "SUSPENDED", "CANCELLED"].includes(status)) return "postponed";
  return "scheduled";
}

function classifyNews(title: string): "gossip" | "transfer" | "news" {
  if (/gossip|rumou?r|linked with|could join|eyeing|targeting/i.test(title)) return "gossip";
  if (/transfer|signs?|signed|joins?|joined|deal|loan|move|departure|contract/i.test(title)) return "transfer";
  return "news";
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object" && "#text" in value) {
    const text = Reflect.get(value, "#text");
    return typeof text === "string" || typeof text === "number" ? String(text).trim() : "";
  }
  return "";
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

async function stableId(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function secureEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(providedHash), new Uint8Array(expectedHash));
}

async function isAuthorized(request: Request, env: IngestEnv): Promise<boolean> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ") || typeof env.SYNC_ADMIN_TOKEN !== "string" || env.SYNC_ADMIN_TOKEN.length < 32) {
    return false;
  }
  return secureEqual(header.slice(7), env.SYNC_ADMIN_TOKEN);
}

async function runBatches(db: D1Database, statements: D1PreparedStatement[]): Promise<number> {
  let written = 0;
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    const batch = statements.slice(index, index + BATCH_SIZE);
    const results = await db.batch(batch);
    written += results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);
  }
  return written;
}

async function withSyncRun(
  env: IngestEnv,
  providerId: string,
  syncType: string,
  task: () => Promise<number>,
): Promise<number> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO sync_runs (id, provider_id, sync_type, status, started_at)
    VALUES (?, ?, ?, 'running', ?)
  `).bind(id, providerId, syncType, startedAt).run();

  try {
    const records = await task();
    await env.DB.prepare(`
      UPDATE sync_runs SET status = 'success', finished_at = ?, records_written = ? WHERE id = ?
    `).bind(new Date().toISOString(), records, id).run();
    return records;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    try {
      await env.DB.prepare(`
        UPDATE sync_runs SET status = 'failed', finished_at = ?, error_message = ? WHERE id = ?
      `).bind(new Date().toISOString(), message.slice(0, 1000), id).run();
    } catch (recordError) {
      console.error(JSON.stringify({
        message: "failed to persist sync failure",
        providerId,
        syncType,
        error: recordError instanceof Error ? recordError.message : "Unknown D1 error",
      }));
    }
    throw error;
  }
}

async function footballDataRequest(path: string, env: IngestEnv): Promise<unknown> {
  const response = await fetch(`${FOOTBALL_DATA_BASE}${path}`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`football-data.org ${response.status}: ${path}`);
  return response.json();
}

function upsertTeam(db: D1Database, team: z.infer<typeof teamSchema>, now: string): D1PreparedStatement {
  const id = `football-data:team:${team.id}`;
  return db.prepare(`
    INSERT INTO teams (id, provider_id, external_id, name, short_name, crest_url, updated_at)
    VALUES (?, 'football-data', ?, ?, ?, ?, ?)
    ON CONFLICT(provider_id, external_id) DO UPDATE SET
      name = excluded.name, short_name = excluded.short_name,
      crest_url = excluded.crest_url, updated_at = excluded.updated_at
    WHERE teams.name IS NOT excluded.name
       OR teams.short_name IS NOT excluded.short_name
       OR teams.crest_url IS NOT excluded.crest_url
  `).bind(id, String(team.id), team.name, team.shortName ?? null, team.crest ?? null, now);
}

async function syncFootballDataMatches(env: IngestEnv): Promise<number> {
  return withSyncRun(env, "football-data", "matches", async () => {
    // Free plan blocks the global /matches endpoint — query per competition instead.
    const codes = env.FOOTBALL_DATA_COMPETITIONS.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 6);
    const allMatches: z.infer<typeof matchesSchema>["matches"] = [];
    const errors: string[] = [];
    let successfulRequests = 0;
    for (const code of codes) {
      try {
        const p = matchesSchema.parse(await footballDataRequest(
          `/competitions/${encodeURIComponent(code)}/matches?dateFrom=${todayUtc(-1)}&dateTo=${todayUtc(3)}`,
          env,
        ));
        successfulRequests += 1;
        allMatches.push(...p.matches);
      } catch (error) {
        errors.push(`${code}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
    if (successfulRequests === 0) {
      throw new Error(`football-data.org match sync failed for every competition: ${errors.join(" | ").slice(0, 800)}`);
    }
    if (errors.length > 0) {
      console.warn(JSON.stringify({ message: "football-data.org partial match sync", errors }));
    }
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const match of allMatches) {
      const competitionId = `football-data:competition:${match.competition.id}`;
      statements.push(
        env.DB.prepare(`
          INSERT INTO competitions (id, provider_id, external_id, code, name, competition_type, updated_at)
          VALUES (?, 'football-data', ?, ?, ?, ?, ?)
          ON CONFLICT(provider_id, external_id) DO UPDATE SET
            code = excluded.code, name = excluded.name,
            competition_type = excluded.competition_type, updated_at = excluded.updated_at
          WHERE competitions.code IS NOT excluded.code
             OR competitions.name IS NOT excluded.name
             OR competitions.competition_type IS NOT excluded.competition_type
        `).bind(
          competitionId,
          String(match.competition.id),
          match.competition.code ?? null,
          match.competition.name,
          match.competition.type ?? null,
          now,
        ),
        upsertTeam(env.DB, match.homeTeam, now),
        upsertTeam(env.DB, match.awayTeam, now),
        env.DB.prepare(`
          INSERT INTO matches (
            id, provider_id, external_id, competition_id, stage, kickoff_at, status, minute,
            home_team_id, away_team_id, home_score, away_score, updated_at
          ) VALUES (?, 'football-data', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(provider_id, external_id) DO UPDATE SET
            competition_id = excluded.competition_id, stage = excluded.stage,
            kickoff_at = excluded.kickoff_at, status = excluded.status, minute = excluded.minute,
            home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
            home_score = excluded.home_score, away_score = excluded.away_score,
            updated_at = excluded.updated_at
          WHERE matches.competition_id IS NOT excluded.competition_id
             OR matches.stage IS NOT excluded.stage
             OR matches.kickoff_at IS NOT excluded.kickoff_at
             OR matches.status IS NOT excluded.status
             OR matches.minute IS NOT excluded.minute
             OR matches.home_team_id IS NOT excluded.home_team_id
             OR matches.away_team_id IS NOT excluded.away_team_id
             OR matches.home_score IS NOT excluded.home_score
             OR matches.away_score IS NOT excluded.away_score
        `).bind(
          `football-data:match:${match.id}`,
          String(match.id),
          competitionId,
          match.stage ?? null,
          match.utcDate,
          normalizeMatchStatus(match.status),
          match.minute ? `${match.minute}${match.injuryTime ? `+${match.injuryTime}` : ""}'` : null,
          `football-data:team:${match.homeTeam.id}`,
          `football-data:team:${match.awayTeam.id}`,
          match.score.fullTime.home ?? null,
          match.score.fullTime.away ?? null,
          now,
        ),
      );
    }
    return runBatches(env.DB, statements);
  });
}

function normalizeOpenLigaStatus(matchIsFinished: boolean, kickoffAt: string): "scheduled" | "live" | "finished" {
  if (matchIsFinished) return "finished";
  const kickoff = Date.parse(kickoffAt);
  const now = Date.now();
  return Number.isFinite(kickoff) && kickoff <= now && kickoff >= now - 4 * 60 * 60 * 1000 ? "live" : "scheduled";
}

function safeRemoteImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolveOpenLigaScore(
  matchResults: Array<{ pointsTeam1: number; pointsTeam2: number; resultOrderID: number }>,
  goals: Array<{ goalID: number; scoreTeam1: number; scoreTeam2: number }>,
): { home: number | null; away: number | null } {
  const finalResult = [...matchResults].sort((a, b) => b.resultOrderID - a.resultOrderID)[0];
  const lastGoal = goals.length > 0
    ? goals.reduce((previous, current) => current.goalID > previous.goalID ? current : previous)
    : null;
  return {
    home: lastGoal?.scoreTeam1 ?? finalResult?.pointsTeam1 ?? null,
    away: lastGoal?.scoreTeam2 ?? finalResult?.pointsTeam2 ?? null,
  };
}

async function syncOpenLigaMatches(env: IngestEnv): Promise<number> {
  return withSyncRun(env, "openligadb", "matches", async () => {
    const leagues = env.OPENLIGADB_LEAGUES.split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 4);
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const entry of leagues) {
      const [shortcut, season] = entry.split(":");
      if (!shortcut || !/^\d{4}$/.test(season ?? "")) continue;
      const response = await fetch(
        `https://api.openligadb.de/getmatchdata/${encodeURIComponent(shortcut)}/${encodeURIComponent(season)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`OpenLigaDB ${response.status}: ${shortcut}/${season}`);
      const matches = openLigaMatchesSchema.parse(await response.json());

      for (const match of matches) {
        const competitionId = `openligadb:competition:${match.leagueId}`;
        const homeTeamId = `openligadb:team:${match.team1.teamId}`;
        const awayTeamId = `openligadb:team:${match.team2.teamId}`;
        const matchId = `openligadb:match:${match.matchID}`;
        const kickoffAt = match.matchDateTimeUTC ?? `${match.matchDateTime}Z`;
        // OpenLigaDB does not update matchResults in real-time during live play; the goals array
        // carries the authoritative running score. Use it first; fall back to matchResults when
        // no goals have been recorded yet (pre-match or genuinely 0-0 start).
        const score = resolveOpenLigaScore(match.matchResults, match.goals);

        statements.push(
          env.DB.prepare(`
            INSERT INTO competitions (id, provider_id, external_id, code, name, competition_type, updated_at)
            VALUES (?, 'openligadb', ?, ?, ?, 'CUP', ?)
            ON CONFLICT(provider_id, external_id) DO UPDATE SET
              code = excluded.code, name = excluded.name, updated_at = excluded.updated_at
            WHERE competitions.code IS NOT excluded.code
               OR competitions.name IS NOT excluded.name
          `).bind(competitionId, String(match.leagueId), match.leagueShortcut, match.leagueName, now),
          env.DB.prepare(`
            INSERT INTO teams (id, provider_id, external_id, name, short_name, crest_url, updated_at)
            VALUES (?, 'openligadb', ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, external_id) DO UPDATE SET
              name = excluded.name, short_name = excluded.short_name,
              crest_url = excluded.crest_url, updated_at = excluded.updated_at
            WHERE teams.name IS NOT excluded.name
               OR teams.short_name IS NOT excluded.short_name
               OR teams.crest_url IS NOT excluded.crest_url
          `).bind(
            homeTeamId,
            String(match.team1.teamId),
            match.team1.teamName,
            match.team1.shortName ?? null,
            safeRemoteImageUrl(match.team1.teamIconUrl),
            now,
          ),
          env.DB.prepare(`
            INSERT INTO teams (id, provider_id, external_id, name, short_name, crest_url, updated_at)
            VALUES (?, 'openligadb', ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, external_id) DO UPDATE SET
              name = excluded.name, short_name = excluded.short_name,
              crest_url = excluded.crest_url, updated_at = excluded.updated_at
            WHERE teams.name IS NOT excluded.name
               OR teams.short_name IS NOT excluded.short_name
               OR teams.crest_url IS NOT excluded.crest_url
          `).bind(
            awayTeamId,
            String(match.team2.teamId),
            match.team2.teamName,
            match.team2.shortName ?? null,
            safeRemoteImageUrl(match.team2.teamIconUrl),
            now,
          ),
          env.DB.prepare(`
            INSERT INTO matches (
              id, provider_id, external_id, competition_id, stage, kickoff_at, status,
              home_team_id, away_team_id, home_score, away_score, updated_at
            ) VALUES (?, 'openligadb', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, external_id) DO UPDATE SET
              stage = excluded.stage, kickoff_at = excluded.kickoff_at, status = excluded.status,
              home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
              home_score = excluded.home_score, away_score = excluded.away_score,
              updated_at = excluded.updated_at
            WHERE matches.stage IS NOT excluded.stage
               OR matches.kickoff_at IS NOT excluded.kickoff_at
               OR matches.status IS NOT excluded.status
               OR matches.home_team_id IS NOT excluded.home_team_id
               OR matches.away_team_id IS NOT excluded.away_team_id
               OR matches.home_score IS NOT excluded.home_score
               OR matches.away_score IS NOT excluded.away_score
          `).bind(
            matchId,
            String(match.matchID),
            competitionId,
            match.group?.groupName ?? null,
            kickoffAt,
            normalizeOpenLigaStatus(match.matchIsFinished, kickoffAt),
            homeTeamId,
            awayTeamId,
            score.home,
            score.away,
            now,
          ),
        );

        for (const goal of match.goals) {
          const playerId = goal.goalGetterID && goal.goalGetterID > 0
            ? `openligadb:player:${goal.goalGetterID}`
            : null;
          if (playerId && goal.goalGetterName) {
            statements.push(env.DB.prepare(`
              INSERT INTO players (id, provider_id, external_id, name, updated_at)
              VALUES (?, 'openligadb', ?, ?, ?)
              ON CONFLICT(provider_id, external_id) DO UPDATE SET
                name = excluded.name, updated_at = excluded.updated_at
              WHERE players.name IS NOT excluded.name
            `).bind(playerId, String(goal.goalGetterID), goal.goalGetterName, now));
          }
          const detail = goal.isOwnGoal ? "own_goal" : goal.isPenalty ? "penalty" : "normal_goal";
          const scoringTeamId = goal.scoringTeamId
            ? `openligadb:team:${goal.scoringTeamId}`
            : null;
          statements.push(env.DB.prepare(`
            INSERT INTO match_events (
              id, provider_id, match_id, external_id, minute, team_id, player_id,
              player_name, event_type, detail, home_score, away_score, updated_at
            ) VALUES (?, 'openligadb', ?, ?, ?, ?, ?, ?, 'goal', ?, ?, ?, ?)
            ON CONFLICT(provider_id, external_id) DO UPDATE SET
              minute = excluded.minute, team_id = excluded.team_id, player_id = excluded.player_id,
              player_name = excluded.player_name, detail = excluded.detail,
              home_score = excluded.home_score, away_score = excluded.away_score,
              updated_at = excluded.updated_at
            WHERE match_events.minute IS NOT excluded.minute
               OR match_events.team_id IS NOT excluded.team_id
               OR match_events.player_id IS NOT excluded.player_id
               OR match_events.player_name IS NOT excluded.player_name
               OR match_events.detail IS NOT excluded.detail
               OR match_events.home_score IS NOT excluded.home_score
               OR match_events.away_score IS NOT excluded.away_score
          `).bind(
            `openligadb:event:${goal.goalID}`,
            matchId,
            String(goal.goalID),
            goal.matchMinute ?? null,
            scoringTeamId,
            playerId,
            goal.goalGetterName ?? null,
            detail,
            goal.scoreTeam1,
            goal.scoreTeam2,
            now,
          ));
        }
      }
    }
    return runBatches(env.DB, statements);
  });
}

async function syncMatches(env: IngestEnv, includeFootballData = true): Promise<number> {
  const tasks: Promise<number>[] = [syncOpenLigaMatches(env)];
  if (includeFootballData && featureEnabled(env.ENABLE_FOOTBALL_DATA)) tasks.push(syncFootballDataMatches(env));
  const results = await Promise.allSettled(tasks);
  const successes = results.filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled");
  if (!successes.length) throw new Error("All match providers failed");
  return successes.reduce((sum, result) => sum + result.value, 0);
}

async function syncStandings(env: IngestEnv): Promise<number> {
  return withSyncRun(env, "football-data", "standings", async () => {
    const codes = env.FOOTBALL_DATA_COMPETITIONS.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 6);
    let written = 0;
    let successfulRequests = 0;
    const errors: string[] = [];
    for (const code of codes) {
      let payload: z.infer<typeof standingsSchema>;
      try {
        payload = standingsSchema.parse(await footballDataRequest(`/competitions/${encodeURIComponent(code)}/standings`, env));
        successfulRequests += 1;
      } catch (error) {
        errors.push(`${code}: ${error instanceof Error ? error.message : "unknown error"}`);
        continue;
      }
      const total = payload.standings.find((standing) => standing.type === "TOTAL") ?? payload.standings[0];
      if (!total) continue;
      const now = new Date().toISOString();
      const competitionId = `football-data:competition:${payload.competition.id}`;
      const statements: D1PreparedStatement[] = [
        env.DB.prepare(`
          INSERT INTO competitions (id, provider_id, external_id, code, name, competition_type, updated_at)
          VALUES (?, 'football-data', ?, ?, ?, ?, ?)
          ON CONFLICT(provider_id, external_id) DO UPDATE SET
            code = excluded.code, name = excluded.name,
            competition_type = excluded.competition_type, updated_at = excluded.updated_at
          WHERE competitions.code IS NOT excluded.code
             OR competitions.name IS NOT excluded.name
             OR competitions.competition_type IS NOT excluded.competition_type
        `).bind(
          competitionId,
          String(payload.competition.id),
          payload.competition.code ?? null,
          payload.competition.name,
          payload.competition.type ?? null,
          now,
        ),
      ];
      for (const row of total.table) {
        statements.push(
          upsertTeam(env.DB, row.team, now),
          env.DB.prepare(`
            INSERT INTO standing_rows (
              provider_id, competition_id, season, position, team_id, team_name,
              played, won, drawn, lost, goal_difference, points, updated_at
            ) VALUES ('football-data', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, competition_id, season, team_id) DO UPDATE SET
              position = excluded.position, team_name = excluded.team_name,
              played = excluded.played, won = excluded.won, drawn = excluded.drawn,
              lost = excluded.lost, goal_difference = excluded.goal_difference,
              points = excluded.points, updated_at = excluded.updated_at
            WHERE standing_rows.position IS NOT excluded.position
               OR standing_rows.team_name IS NOT excluded.team_name
               OR standing_rows.played IS NOT excluded.played
               OR standing_rows.won IS NOT excluded.won
               OR standing_rows.drawn IS NOT excluded.drawn
               OR standing_rows.lost IS NOT excluded.lost
               OR standing_rows.goal_difference IS NOT excluded.goal_difference
               OR standing_rows.points IS NOT excluded.points
          `).bind(
            competitionId,
            payload.season.startDate.slice(0, 4),
            row.position,
            `football-data:team:${row.team.id}`,
            row.team.name,
            row.playedGames,
            row.won,
            row.draw,
            row.lost,
            row.goalDifference,
            row.points,
            now,
          ),
        );
      }
      written += await runBatches(env.DB, statements);
    }
    if (successfulRequests === 0) {
      throw new Error(`football-data.org standings failed for every competition: ${errors.join(" | ").slice(0, 800)}`);
    }
    if (errors.length > 0) {
      console.warn(JSON.stringify({ message: "football-data.org partial standings sync", errors }));
    }
    return written;
  });
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_RSS_BYTES) throw new Error(`RSS payload too large: ${declaredLength}`);
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RSS_BYTES) throw new Error("RSS payload exceeded 1 MB");
  return text;
}

async function syncRss(env: IngestEnv, providerId: "bbc-rss" | "transfermarkt-rss", url: string): Promise<number> {
  return withSyncRun(env, providerId, "news", async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": "SOCCER-KR/0.2 (+https://example.invalid)" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`${providerId} RSS ${response.status}`);
    const xml = await readBoundedText(response);
    const parsed = rssRootSchema.parse(new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml));
    const rawItems = parsed.rss.channel.item === undefined
      ? []
      : Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const rawItem of rawItems.slice(0, 50)) {
      const item = rssItemSchema.safeParse(rawItem);
      if (!item.success) continue;
      const title = textValue(item.data.title);
      const link = textValue(item.data.link);
      if (!title || !link.startsWith("http")) continue;
      const externalId = await stableId(textValue(item.data.guid) || link);
      const publishedAtRaw = textValue(item.data.pubDate);
      const publishedAt = Number.isNaN(Date.parse(publishedAtRaw)) ? now : new Date(publishedAtRaw).toISOString();
      // INSERT OR IGNORE handles both UNIQUE constraints (provider_id+external_id and url).
      // News articles don't need updating once stored — skipping duplicates is correct.
      statements.push(env.DB.prepare(`
        INSERT OR IGNORE INTO news_items (
          id, provider_id, external_id, title, url, published_at, category, summary, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `${providerId}:news:${externalId}`,
        providerId,
        externalId,
        title,
        link,
        publishedAt,
        classifyNews(title),
        stripMarkup(textValue(item.data.description)) || null,
        now,
      ));
    }
    return runBatches(env.DB, statements);
  });
}

async function syncNews(env: IngestEnv): Promise<number> {
  const results = await Promise.allSettled([
    syncRss(env, "bbc-rss", env.BBC_FOOTBALL_RSS),
    syncRss(env, "transfermarkt-rss", env.TRANSFERMARKT_RSS),
  ]);
  const successes = results.filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled");
  if (!successes.length) throw new Error("All RSS providers failed");
  return successes.reduce((sum, result) => sum + result.value, 0);
}

const apiFootballEnvelopeSchema = z.object({
  errors: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown()), z.string()]).optional(),
}).passthrough();

async function apiFootballRequest(path: string, env: IngestEnv): Promise<unknown> {
  const response = await fetch(`${API_FOOTBALL_BASE}${path}`, {
    headers: { "x-apisports-key": env.API_FOOTBALL_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`API-Football ${response.status}: ${path}`);
  const payload: unknown = await response.json();
  const envelope = apiFootballEnvelopeSchema.parse(payload);
  const errors = envelope.errors;
  const hasErrors = Array.isArray(errors)
    ? errors.length > 0
    : typeof errors === "string"
      ? errors.length > 0
      : errors !== undefined && Object.keys(errors).length > 0;
  if (hasErrors) throw new Error(`API-Football rejected ${path}: ${JSON.stringify(errors).slice(0, 500)}`);
  return payload;
}

async function syncTransfers(env: IngestEnv): Promise<number> {
  return withSyncRun(env, "api-football", "transfers", async () => {
    const teamIds = env.API_FOOTBALL_TEAM_IDS.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    for (const teamId of teamIds) {
      const payload = transfersSchema.parse(await apiFootballRequest(`/transfers?team=${encodeURIComponent(teamId)}`, env));
      for (const playerRecord of payload.response) {
        const playerId = `api-football:player:${playerRecord.player.id}`;
        statements.push(env.DB.prepare(`
          INSERT INTO players (id, provider_id, external_id, name, updated_at)
          VALUES (?, 'api-football', ?, ?, ?)
          ON CONFLICT(provider_id, external_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
          WHERE players.name IS NOT excluded.name
        `).bind(playerId, String(playerRecord.player.id), playerRecord.player.name, now));

        for (const transfer of playerRecord.transfers) {
          // Skip transfers where either team ID is unknown (API returns null for untracked clubs).
          if (transfer.teams.out.id === null || transfer.teams.in.id === null) continue;
          const fromId = `api-football:team:${transfer.teams.out.id}`;
          const toId = `api-football:team:${transfer.teams.in.id}`;
          const externalId = `${playerRecord.player.id}:${transfer.date}:${transfer.teams.out.id}:${transfer.teams.in.id}`;
          statements.push(
            env.DB.prepare(`
              INSERT INTO teams (id, provider_id, external_id, name, updated_at)
              VALUES (?, 'api-football', ?, ?, ?)
              ON CONFLICT(provider_id, external_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
              WHERE teams.name IS NOT excluded.name
            `).bind(fromId, String(transfer.teams.out.id), transfer.teams.out.name, now),
            env.DB.prepare(`
              INSERT INTO teams (id, provider_id, external_id, name, updated_at)
              VALUES (?, 'api-football', ?, ?, ?)
              ON CONFLICT(provider_id, external_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
              WHERE teams.name IS NOT excluded.name
            `).bind(toId, String(transfer.teams.in.id), transfer.teams.in.name, now),
            env.DB.prepare(`
              INSERT INTO transfers (
                id, provider_id, external_id, player_id, player_name, from_team_id,
                from_team_name, to_team_id, to_team_name, transfer_date,
                transfer_type, status, updated_at
              ) VALUES (?, 'api-football', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
              ON CONFLICT(provider_id, external_id) DO UPDATE SET
                player_name = excluded.player_name, from_team_id = excluded.from_team_id,
                from_team_name = excluded.from_team_name, to_team_id = excluded.to_team_id,
                to_team_name = excluded.to_team_name, transfer_date = excluded.transfer_date,
                transfer_type = excluded.transfer_type, updated_at = excluded.updated_at
              WHERE transfers.player_name IS NOT excluded.player_name
                 OR transfers.from_team_id IS NOT excluded.from_team_id
                 OR transfers.from_team_name IS NOT excluded.from_team_name
                 OR transfers.to_team_id IS NOT excluded.to_team_id
                 OR transfers.to_team_name IS NOT excluded.to_team_name
                 OR transfers.transfer_date IS NOT excluded.transfer_date
                 OR transfers.transfer_type IS NOT excluded.transfer_type
            `).bind(
              `api-football:transfer:${await stableId(externalId)}`,
              externalId,
              playerId,
              playerRecord.player.name,
              fromId,
              transfer.teams.out.name,
              toId,
              transfer.teams.in.name,
              transfer.date,
              transfer.type ?? null,
              now,
            ),
          );
        }
      }
    }
    return runBatches(env.DB, statements);
  });
}

export function normalizeApiFootballStatus(status: string): "scheduled" | "live" | "finished" | "postponed" {
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(status)) return "live";
  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  if (["PST", "SUSP", "CANC", "ABD", "AWD", "WO"].includes(status)) return "postponed";
  return "scheduled";
}

export function metricCode(type: string): string {
  const known: Record<string, string> = {
    "Shots on Goal": "shots_on_target",
    "Shots off Goal": "shots_off_target",
    "Total Shots": "shots_total",
    "Blocked Shots": "shots_blocked",
    "Shots insidebox": "shots_inside_box",
    "Shots outsidebox": "shots_outside_box",
    Fouls: "fouls",
    "Corner Kicks": "corners",
    Offsides: "offsides",
    "Ball Possession": "possession",
    "Yellow Cards": "yellow_cards",
    "Red Cards": "red_cards",
    "Goalkeeper Saves": "goalkeeper_saves",
    "Total passes": "passes_total",
    "Passes accurate": "passes_accurate",
    "Passes %": "pass_accuracy",
    expected_goals: "expected_goals",
    goals_prevented: "goals_prevented",
  };
  const mapped = known[type];
  if (mapped) return mapped;
  const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  return `api_football_${slug || "other"}`;
}

export function numericStatValue(value: string | number): number | null {
  const numeric = Number(String(value).replace("%", "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function intValue(value: number | null): number | null {
  return value === null ? null : Math.trunc(value);
}

function upsertApiFootballFixture(
  db: D1Database,
  fixture: z.infer<typeof apiFootballFixtureSchema>,
  now: string,
): D1PreparedStatement[] {
  const competitionId = `api-football:competition:${fixture.league.id}`;
  const homeTeamId = `api-football:team:${fixture.teams.home.id}`;
  const awayTeamId = `api-football:team:${fixture.teams.away.id}`;
  const matchId = `api-football:match:${fixture.fixture.id}`;
  const status = normalizeApiFootballStatus(fixture.fixture.status.short);
  const minute = fixture.fixture.status.elapsed === null || fixture.fixture.status.elapsed === undefined
    ? null
    : `${fixture.fixture.status.elapsed}${fixture.fixture.status.extra ? `+${fixture.fixture.status.extra}` : ""}'`;
  return [
    db.prepare(`
      INSERT INTO competitions (id, provider_id, external_id, name, competition_type, updated_at)
      VALUES (?, 'api-football', ?, ?, 'LEAGUE_OR_CUP', ?)
      ON CONFLICT(provider_id, external_id) DO UPDATE SET
        name = excluded.name, updated_at = excluded.updated_at
    `).bind(competitionId, String(fixture.league.id), fixture.league.name, now),
    db.prepare(`
      INSERT INTO teams (id, provider_id, external_id, name, crest_url, updated_at)
      VALUES (?, 'api-football', ?, ?, ?, ?)
      ON CONFLICT(provider_id, external_id) DO UPDATE SET
        name = excluded.name, crest_url = excluded.crest_url, updated_at = excluded.updated_at
    `).bind(homeTeamId, String(fixture.teams.home.id), fixture.teams.home.name, fixture.teams.home.logo ?? null, now),
    db.prepare(`
      INSERT INTO teams (id, provider_id, external_id, name, crest_url, updated_at)
      VALUES (?, 'api-football', ?, ?, ?, ?)
      ON CONFLICT(provider_id, external_id) DO UPDATE SET
        name = excluded.name, crest_url = excluded.crest_url, updated_at = excluded.updated_at
    `).bind(awayTeamId, String(fixture.teams.away.id), fixture.teams.away.name, fixture.teams.away.logo ?? null, now),
    db.prepare(`
      INSERT INTO matches (
        id, provider_id, external_id, competition_id, stage, kickoff_at, status, minute,
        home_team_id, away_team_id, home_score, away_score, updated_at
      ) VALUES (?, 'api-football', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_id, external_id) DO UPDATE SET
        competition_id = excluded.competition_id, stage = excluded.stage,
        kickoff_at = excluded.kickoff_at, status = excluded.status, minute = excluded.minute,
        home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
        home_score = excluded.home_score, away_score = excluded.away_score,
        updated_at = excluded.updated_at
    `).bind(
      matchId,
      String(fixture.fixture.id),
      competitionId,
      fixture.league.round ?? null,
      fixture.fixture.date,
      status,
      minute,
      homeTeamId,
      awayTeamId,
      fixture.goals.home ?? null,
      fixture.goals.away ?? null,
      now,
    ),
  ];
}

export function apiFootballFixtureBudget(competitionCount: number, configuredMax: number): number {
  // Free API-Football accounts allow 10 requests per minute. Each competition
  // needs one fixture-list request and each selected fixture needs two detail
  // requests, so keep the entire scheduled stats sync within that minute.
  const listRequests = Math.min(Math.max(Math.trunc(competitionCount), 0), 6);
  const detailBudget = Math.max(0, Math.floor((10 - listRequests) / 2));
  return Math.min(Math.max(Math.trunc(configuredMax), 0), detailBudget);
}

async function syncApiFootballStats(env: IngestEnv): Promise<number> {
  return withSyncRun(env, "api-football", "match-stats", async () => {
    const competitions = env.API_FOOTBALL_DEEP_COMPETITIONS.split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 6);
    const configuredMax = Number.parseInt(env.API_FOOTBALL_MAX_DEEP_FIXTURES, 10);
    const requestedFixtures = Number.isFinite(configuredMax) ? configuredMax : 4;
    const maxFixtures = apiFootballFixtureBudget(competitions.length, requestedFixtures);
    const fixtureMap = new Map<number, z.infer<typeof apiFootballFixtureSchema>>();

    for (const entry of competitions) {
      const [leagueId, season] = entry.split(":");
      if (!/^\d+$/.test(leagueId ?? "") || !/^\d{4}$/.test(season ?? "")) continue;
      const query = new URLSearchParams({
        league: leagueId,
        season,
        from: todayUtc(-1),
        to: todayUtc(),
        timezone: "Asia/Seoul",
      });
      const payload = apiFootballFixturesSchema.parse(await apiFootballRequest(`/fixtures?${query}`, env));
      for (const fixture of payload.response) {
        if (normalizeApiFootballStatus(fixture.fixture.status.short) === "finished") {
          fixtureMap.set(fixture.fixture.id, fixture);
        }
      }
    }

    const fixtures = Array.from(fixtureMap.values())
      .sort((a, b) => Date.parse(b.fixture.date) - Date.parse(a.fixture.date))
      .slice(0, maxFixtures);
    const now = new Date().toISOString();
    let written = 0;

    for (const fixture of fixtures) {
      const matchId = `api-football:match:${fixture.fixture.id}`;
      const [teamPayload, playerPayload] = await Promise.all([
        apiFootballRequest(`/fixtures/statistics?fixture=${fixture.fixture.id}`, env),
        apiFootballRequest(`/fixtures/players?fixture=${fixture.fixture.id}`, env),
      ]);
      const teamStats = apiFootballTeamStatsSchema.parse(teamPayload);
      const playerStats = apiFootballPlayerStatsSchema.parse(playerPayload);
      const statements = upsertApiFootballFixture(env.DB, fixture, now);

      for (const teamRecord of teamStats.response) {
        const teamId = `api-football:team:${teamRecord.team.id}`;
        for (const stat of teamRecord.statistics) {
          if (stat.value === null || stat.value === undefined) continue;
          const code = metricCode(stat.type);
          const isPercent = String(stat.value).includes("%") || code === "possession" || code === "pass_accuracy";
          statements.push(
            env.DB.prepare(`
              INSERT OR IGNORE INTO metric_definitions (
                code, category, display_name_ko, description_ko, unit, updated_at
              ) VALUES (?, 'provider_specific', ?, ?, ?, ?)
            `).bind(code, stat.type, `API-Football 원문 지표: ${stat.type}`, isPercent ? "percent" : "count", now),
            env.DB.prepare(`
              INSERT INTO team_match_stats (
                provider_id, match_id, team_id, stat_code, value_numeric, value_text, unit, updated_at
              ) VALUES ('api-football', ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(provider_id, match_id, team_id, stat_code) DO UPDATE SET
                value_numeric = excluded.value_numeric, value_text = excluded.value_text,
                unit = excluded.unit, updated_at = excluded.updated_at
            `).bind(
              matchId,
              teamId,
              code,
              numericStatValue(stat.value),
              String(stat.value),
              isPercent ? "percent" : "count",
              now,
            ),
          );
        }
      }

      for (const teamRecord of playerStats.response) {
        const teamId = `api-football:team:${teamRecord.team.id}`;
        for (const record of teamRecord.players) {
          const stat = record.statistics[0];
          if (!stat) continue;
          const playerId = `api-football:player:${record.player.id}`;
          statements.push(
            env.DB.prepare(`
              INSERT INTO players (id, provider_id, external_id, name, current_team_id, source_url, updated_at)
              VALUES (?, 'api-football', ?, ?, ?, ?, ?)
              ON CONFLICT(provider_id, external_id) DO UPDATE SET
                name = excluded.name, current_team_id = excluded.current_team_id,
                source_url = excluded.source_url, updated_at = excluded.updated_at
            `).bind(
              playerId,
              String(record.player.id),
              record.player.name,
              teamId,
              record.player.photo ?? null,
              now,
            ),
            env.DB.prepare(`
              INSERT INTO player_match_stats (
                provider_id, match_id, player_id, team_id, player_name, minutes, position,
                shirt_number, rating, captain, substitute, shots_total, shots_on_target,
                goals, goals_conceded, assists, saves, passes_total, key_passes, pass_accuracy,
                tackles, blocks, interceptions, duels_total, duels_won, dribbles_attempted,
                dribbles_successful, dribbled_past, fouls_drawn, fouls_committed,
                yellow_cards, red_cards, penalties_won, penalties_conceded,
                penalties_scored, penalties_missed, penalties_saved, updated_at
              ) VALUES (
                'api-football', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              )
              ON CONFLICT(provider_id, match_id, player_id) DO UPDATE SET
                team_id = excluded.team_id, player_name = excluded.player_name,
                minutes = excluded.minutes, position = excluded.position,
                shirt_number = excluded.shirt_number, rating = excluded.rating,
                captain = excluded.captain, substitute = excluded.substitute,
                shots_total = excluded.shots_total, shots_on_target = excluded.shots_on_target,
                goals = excluded.goals, goals_conceded = excluded.goals_conceded,
                assists = excluded.assists, saves = excluded.saves,
                passes_total = excluded.passes_total, key_passes = excluded.key_passes,
                pass_accuracy = excluded.pass_accuracy, tackles = excluded.tackles,
                blocks = excluded.blocks, interceptions = excluded.interceptions,
                duels_total = excluded.duels_total, duels_won = excluded.duels_won,
                dribbles_attempted = excluded.dribbles_attempted,
                dribbles_successful = excluded.dribbles_successful,
                dribbled_past = excluded.dribbled_past, fouls_drawn = excluded.fouls_drawn,
                fouls_committed = excluded.fouls_committed, yellow_cards = excluded.yellow_cards,
                red_cards = excluded.red_cards, penalties_won = excluded.penalties_won,
                penalties_conceded = excluded.penalties_conceded,
                penalties_scored = excluded.penalties_scored,
                penalties_missed = excluded.penalties_missed,
                penalties_saved = excluded.penalties_saved, updated_at = excluded.updated_at
            `).bind(
              matchId,
              playerId,
              teamId,
              record.player.name,
              intValue(stat.games.minutes),
              stat.games.position ?? null,
              intValue(stat.games.number),
              stat.games.rating,
              stat.games.captain ? 1 : 0,
              stat.games.substitute ? 1 : 0,
              intValue(stat.shots.total),
              intValue(stat.shots.on),
              intValue(stat.goals.total),
              intValue(stat.goals.conceded),
              intValue(stat.goals.assists),
              intValue(stat.goals.saves),
              intValue(stat.passes.total),
              intValue(stat.passes.key),
              stat.passes.accuracy,
              intValue(stat.tackles.total),
              intValue(stat.tackles.blocks),
              intValue(stat.tackles.interceptions),
              intValue(stat.duels.total),
              intValue(stat.duels.won),
              intValue(stat.dribbles.attempts),
              intValue(stat.dribbles.success),
              intValue(stat.dribbles.past),
              intValue(stat.fouls.drawn),
              intValue(stat.fouls.committed),
              intValue(stat.cards.yellow),
              intValue(stat.cards.red),
              intValue(stat.penalty.won),
              intValue(stat.penalty.conceded ?? stat.penalty.commited ?? null),
              intValue(stat.penalty.scored),
              intValue(stat.penalty.missed),
              intValue(stat.penalty.saved),
              now,
            ),
          );
        }
      }
      written += await runBatches(env.DB, statements);
    }
    return written;
  });
}

async function importMarketValues(request: Request, env: IngestEnv): Promise<Response> {
  const payload = marketValueImportSchema.parse(await request.json());
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  for (const item of payload.items) {
    const externalId = item.playerExternalId ?? item.transfermarktId ?? await stableId(`${item.playerName}:${item.sourceUrl}`);
    const playerId = `manual-authorized:player:${externalId}`;
    statements.push(
      env.DB.prepare(`
        INSERT INTO players (
          id, provider_id, external_id, transfermarkt_id, name, source_url, updated_at
        ) VALUES (?, 'manual-authorized', ?, ?, ?, ?, ?)
        ON CONFLICT(provider_id, external_id) DO UPDATE SET
          transfermarkt_id = excluded.transfermarkt_id, name = excluded.name,
          source_url = excluded.source_url, updated_at = excluded.updated_at
      `).bind(playerId, externalId, item.transfermarktId ?? null, item.playerName, item.sourceUrl, now),
      env.DB.prepare(`
        INSERT INTO market_value_history (
          id, player_id, provider_id, value_amount, currency, valued_at,
          source_url, source_note
        ) VALUES (?, ?, 'manual-authorized', ?, 'EUR', ?, ?, ?)
        ON CONFLICT(player_id, provider_id, valued_at) DO UPDATE SET
          value_amount = excluded.value_amount, source_url = excluded.source_url,
          source_note = excluded.source_note
      `).bind(
        `manual-authorized:value:${await stableId(`${externalId}:${item.valuedAt}`)}`,
        playerId,
        item.valueEur,
        item.valuedAt,
        item.sourceUrl,
        item.sourceNote ?? null,
      ),
    );
  }

  const written = await runBatches(env.DB, statements);
  return json({ ok: true, recordsWritten: written }, { status: 201 });
}

async function runScope(scope: SyncScope, env: IngestEnv): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (scope === "matches" || scope === "all") result.matches = await syncMatches(env);
  if (scope === "standings" || scope === "all") {
    result.standings = featureEnabled(env.ENABLE_FOOTBALL_DATA) ? await syncStandings(env) : 0;
  }
  if (scope === "news" || scope === "all") result.news = await syncNews(env);
  if (scope === "transfers" || scope === "all") {
    result.transfers = featureEnabled(env.ENABLE_API_FOOTBALL) ? await syncTransfers(env) : 0;
  }
  if (scope === "stats" || scope === "all") {
    result.stats = featureEnabled(env.ENABLE_API_FOOTBALL) ? await syncApiFootballStats(env) : 0;
  }
  return result;
}

export function optionalScheduledScopes(nowUtc: Date): Array<"standings" | "transfers" | "stats"> {
  const hour = nowUtc.getUTCHours();
  const minute = nowUtc.getUTCMinutes();
  const scopes: Array<"standings" | "transfers" | "stats"> = [];

  // These times all occur on a */30 trigger. Key-based providers remain gated
  // by their ENABLE_* flags, so public feeds continue when keys are unavailable.
  if (minute === 0 && hour % 6 === 0) scopes.push("standings", "transfers");
  if (hour === 3 && minute === 30) scopes.push("stats");
  return scopes;
}

async function cleanupStaleSyncRuns(env: IngestEnv, nowUtc: Date): Promise<number> {
  const cutoff = new Date(nowUtc.getTime() - 45 * 60 * 1000).toISOString();
  const result = await env.DB.prepare(`
    UPDATE sync_runs
    SET status = 'failed', finished_at = ?,
        error_message = COALESCE(error_message, 'Sync did not complete before the next scheduled run')
    WHERE status = 'running' AND started_at < ?
  `).bind(nowUtc.toISOString(), cutoff).run();
  return result.meta.changes ?? 0;
}

async function runScheduled(cron: string, env: IngestEnv, scheduledAt: Date): Promise<void> {
  if (cron !== "*/30 * * * *") {
    // Dedicated single-scope crons (e.g. if split crons are added later).
    const scope: SyncScope = cron === "0 * * * *"
        ? "standings"
        : cron === "15 */6 * * *"
          ? "transfers"
          : cron === "45 3 * * *"
            ? "stats"
          : "matches";
    const result = await runScope(scope, env);
    console.log(JSON.stringify({ message: "scheduled sync complete", cron, scope, result }));
    return;
  }

  const staleRuns = await cleanupStaleSyncRuns(env, scheduledAt).catch((error) => {
    console.error(JSON.stringify({
      message: "failed to clean stale sync runs",
      error: error instanceof Error ? error.message : "Unknown D1 error",
    }));
    return 0;
  });

  const optionalScopes = optionalScheduledScopes(scheduledAt);

  // A standings run already consumes one football-data.org request per configured
  // competition. Skip its match requests on that tick to stay below the free
  // provider's per-minute throttle; matches resume on the next half-hour tick.
  const result: Record<string, number> = {
    matches: await syncMatches(env, !optionalScopes.includes("standings")),
    news: await syncNews(env),
  };

  if (optionalScopes.includes("standings")) {
    result.standings = featureEnabled(env.ENABLE_FOOTBALL_DATA)
      ? await syncStandings(env).catch(() => 0)
      : 0;
  }

  if (optionalScopes.includes("transfers")) {
    result.transfers = featureEnabled(env.ENABLE_API_FOOTBALL)
      ? await syncTransfers(env).catch(() => 0)
      : 0;
  }

  if (optionalScopes.includes("stats")) {
    result.stats = featureEnabled(env.ENABLE_API_FOOTBALL)
      ? await syncApiFootballStats(env).catch(() => 0)
      : 0;
  }

  console.log(JSON.stringify({ message: "scheduled public sync complete", cron, staleRuns, result }));
}

export default {
  async fetch(request: Request, env: IngestEnv): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
        return json({ ok: database?.ok === 1, worker: "soccer-korea-ingest", now: new Date().toISOString() });
      }

      if (request.method === "POST" && (url.pathname === "/sync" || url.pathname === "/market-values/import")) {
        if (!await isAuthorized(request, env)) return json({ error: "UNAUTHORIZED" }, { status: 401 });
      }

      if (request.method === "POST" && url.pathname === "/sync") {
        const rawScope = url.searchParams.get("scope") ?? "all";
        const scopeSchema = z.enum(["matches", "standings", "news", "transfers", "stats", "all"]);
        const scope = scopeSchema.parse(rawScope);
        const result = await runScope(scope, env);
        return json({ ok: true, scope, result });
      }

      if (request.method === "POST" && url.pathname === "/market-values/import") {
        return await importMarketValues(request, env);
      }

      return json({ error: "NOT_FOUND" }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(JSON.stringify({ message: "request failed", path: url.pathname, error: message }));
      if (error instanceof z.ZodError) return json({ error: "INVALID_INPUT", issues: error.issues }, { status: 400 });
      return json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
  },

  scheduled(controller: ScheduledController, env: IngestEnv, ctx: ExecutionContext): void {
    ctx.waitUntil(runScheduled(controller.cron, env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<IngestEnv>;
