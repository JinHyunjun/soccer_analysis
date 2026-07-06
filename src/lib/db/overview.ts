import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import type {
  LeagueTable,
  MarketValueItem,
  MatchSummary,
  NewsItem,
  OverviewData,
  SourceMeta,
  TransferItem,
} from "@/lib/domain";

const nullableText = z.string().nullable();
const matchRowSchema = z.object({
  id: z.string(), competition_name: z.string(), stage: nullableText, kickoff_at: z.string(),
  status: z.enum(["scheduled", "live", "finished", "postponed"]), minute: nullableText,
  home_team_id: z.string(), home_team_name: z.string(), home_short_name: nullableText,
  home_crest_url: nullableText, away_team_id: z.string(), away_team_name: z.string(),
  away_short_name: nullableText, away_crest_url: nullableText,
  home_score: z.number().nullable(), away_score: z.number().nullable(), provider_name: z.string(),
});
const standingRowSchema = z.object({
  competition_id: z.string(), competition_code: nullableText, competition_name: z.string(),
  competition_type: nullableText, provider_name: z.string(), position: z.number(), team_id: z.string(),
  team_name: z.string(), team_short_name: nullableText, crest_url: nullableText, played: z.number(),
  won: z.number(), drawn: z.number(), lost: z.number(), goal_difference: z.number(), points: z.number(),
});
const newsRowSchema = z.object({
  id: z.string(), title: z.string(), title_ko: nullableText, url: z.string(), published_at: z.string(),
  category: z.enum(["gossip", "transfer", "news"]), summary: nullableText, provider_name: z.string(),
});
const transferRowSchema = z.object({
  id: z.string(), player_id: nullableText, player_name: z.string(), from_team_id: nullableText,
  from_team_name: z.string(), to_team_id: nullableText, to_team_name: z.string(),
  transfer_date: z.string(), transfer_type: nullableText, fee_text: nullableText,
  source_url: nullableText, provider_name: z.string(),
});
const marketValueRowSchema = z.object({
  id: z.string(), player_name: z.string(), team_name: nullableText, value_amount: z.number(),
  valued_at: z.string(), provider_name: z.string(), source_url: z.string(),
});
const providerRowSchema = z.object({
  id: z.string(), display_name: z.string(), attribution: nullableText, last_status: nullableText,
  last_sync: nullableText, error_message: nullableText,
});

type MatchRow = z.infer<typeof matchRowSchema>;
type StandingRow = z.infer<typeof standingRowSchema>;
type NewsRow = z.infer<typeof newsRowSchema>;
type ProviderRow = z.infer<typeof providerRowSchema>;

function mapMatches(rows: MatchRow[]): MatchSummary[] {
  return rows.map((row) => ({
    id: row.id,
    competition: row.competition_name,
    stage: row.stage ?? undefined,
    kickoff: row.kickoff_at,
    status: row.status,
    minute: row.minute ?? undefined,
    home: {
      id: row.home_team_id,
      name: row.home_team_name,
      shortName: row.home_short_name ?? undefined,
      crest: row.home_crest_url ?? undefined,
    },
    away: {
      id: row.away_team_id,
      name: row.away_team_name,
      shortName: row.away_short_name ?? undefined,
      crest: row.away_crest_url ?? undefined,
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    source: row.provider_name,
  }));
}

function mapTables(rows: StandingRow[]): LeagueTable[] {
  const grouped = new Map<string, LeagueTable>();
  for (const row of rows) {
    const table = grouped.get(row.competition_id) ?? {
      code: row.competition_code ?? row.competition_id,
      name: row.competition_name,
      type: row.competition_type ?? "LEAGUE",
      source: row.provider_name,
      rows: [],
    };
    table.rows.push({
      position: row.position,
      team: {
        id: row.team_id,
        name: row.team_name,
        shortName: row.team_short_name ?? undefined,
        crest: row.crest_url ?? undefined,
      },
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalDifference: row.goal_difference,
      points: row.points,
    });
    grouped.set(row.competition_id, table);
  }
  return Array.from(grouped.values());
}

function mapNews(rows: NewsRow[]): NewsItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title_ko ?? row.title,
    link: row.url,
    publishedAt: row.published_at,
    source: row.provider_name,
    category: row.category,
    summary: row.summary ?? undefined,
  }));
}

function mapSources(rows: ProviderRow[]): SourceMeta[] {
  return rows.map((row) => ({
    provider: row.display_name,
    state: row.last_status === "success" ? "cached" : row.last_status === "partial" ? "cached" : "unavailable",
    updatedAt: row.last_sync ?? new Date(0).toISOString(),
    attribution: row.attribution ?? undefined,
    note: row.error_message ?? (row.last_sync ? `D1 마지막 동기화: ${row.last_sync}` : "아직 동기화되지 않았습니다."),
  }));
}

export async function getD1Overview(): Promise<OverviewData | null> {
  const { env } = getCloudflareContext();
  const results = await env.DB.batch([
    env.DB.prepare(`
      SELECT m.id, c.name AS competition_name, m.stage, m.kickoff_at, m.status, m.minute,
             ht.id AS home_team_id, ht.name AS home_team_name, ht.short_name AS home_short_name, ht.crest_url AS home_crest_url,
             at.id AS away_team_id, at.name AS away_team_name, at.short_name AS away_short_name, at.crest_url AS away_crest_url,
             m.home_score, m.away_score, p.display_name AS provider_name
      FROM matches m
      JOIN competitions c ON c.id = m.competition_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      JOIN providers p ON p.id = m.provider_id
      WHERE m.kickoff_at >= datetime('now', '-1 day')
      ORDER BY CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, m.kickoff_at
      LIMIT 12
    `),
    env.DB.prepare(`
      WITH latest_seasons AS (
        SELECT competition_id, MAX(season) AS season FROM standing_rows GROUP BY competition_id
      ), ranked AS (
        SELECT sr.*, ROW_NUMBER() OVER (PARTITION BY sr.competition_id ORDER BY sr.position) AS rn
        FROM standing_rows sr
        JOIN latest_seasons ls ON ls.competition_id = sr.competition_id AND ls.season = sr.season
      )
      SELECT r.competition_id, c.code AS competition_code, c.name AS competition_name,
             c.competition_type, p.display_name AS provider_name, r.position, r.team_id,
             r.team_name, t.short_name AS team_short_name, t.crest_url, r.played, r.won,
             r.drawn, r.lost, r.goal_difference, r.points
      FROM ranked r
      JOIN competitions c ON c.id = r.competition_id
      JOIN providers p ON p.id = r.provider_id
      JOIN teams t ON t.id = r.team_id
      WHERE r.rn <= 7
      ORDER BY c.name, r.position
      LIMIT 42
    `),
    env.DB.prepare(`
      SELECT n.id, n.title, n.title_ko, n.url, n.published_at, n.category, n.summary,
             p.display_name AS provider_name
      FROM news_items n JOIN providers p ON p.id = n.provider_id
      ORDER BY n.published_at DESC LIMIT 30
    `),
    env.DB.prepare(`
      SELECT tr.id, tr.player_id, tr.player_name, tr.from_team_id, tr.from_team_name,
             tr.to_team_id, tr.to_team_name, tr.transfer_date, tr.transfer_type,
             tr.fee_text, tr.source_url, p.display_name AS provider_name
      FROM transfers tr JOIN providers p ON p.id = tr.provider_id
      WHERE tr.status = 'confirmed'
      ORDER BY tr.transfer_date DESC LIMIT 40
    `),
    env.DB.prepare(`
      WITH ranked_values AS (
        SELECT mv.*, ROW_NUMBER() OVER (PARTITION BY mv.player_id ORDER BY mv.valued_at DESC) AS rn
        FROM market_value_history mv
      )
      SELECT rv.id, pl.name AS player_name, t.name AS team_name, rv.value_amount,
             rv.valued_at, p.display_name AS provider_name, rv.source_url
      FROM ranked_values rv
      JOIN players pl ON pl.id = rv.player_id
      LEFT JOIN teams t ON t.id = pl.current_team_id
      JOIN providers p ON p.id = rv.provider_id
      WHERE rv.rn = 1
      ORDER BY rv.value_amount DESC LIMIT 30
    `),
    env.DB.prepare(`
      SELECT p.id, p.display_name, p.attribution,
             (SELECT sr.status FROM sync_runs sr WHERE sr.provider_id = p.id ORDER BY sr.started_at DESC LIMIT 1) AS last_status,
             (SELECT sr.finished_at FROM sync_runs sr WHERE sr.provider_id = p.id ORDER BY sr.started_at DESC LIMIT 1) AS last_sync,
             (SELECT sr.error_message FROM sync_runs sr WHERE sr.provider_id = p.id ORDER BY sr.started_at DESC LIMIT 1) AS error_message
      FROM providers p WHERE p.enabled = 1 ORDER BY p.display_name
    `),
  ]);

  const matches = mapMatches(z.array(matchRowSchema).parse(results[0].results));
  const tables = mapTables(z.array(standingRowSchema).parse(results[1].results));
  const allNews = mapNews(z.array(newsRowSchema).parse(results[2].results));
  const transfers = z.array(transferRowSchema).parse(results[3].results).map<TransferItem>((row) => ({
    id: row.id,
    playerId: row.player_id ?? undefined,
    playerName: row.player_name,
    from: { id: row.from_team_id ?? `from-${row.id}`, name: row.from_team_name },
    to: { id: row.to_team_id ?? `to-${row.id}`, name: row.to_team_name },
    date: row.transfer_date,
    type: row.transfer_type ?? undefined,
    fee: row.fee_text ?? undefined,
    source: row.provider_name,
    sourceUrl: row.source_url ?? undefined,
  }));
  const marketValues = z.array(marketValueRowSchema).parse(results[4].results).map<MarketValueItem>((row) => ({
    id: row.id,
    playerName: row.player_name,
    teamName: row.team_name ?? "소속팀 미상",
    valueEur: row.value_amount,
    valuedAt: row.valued_at,
    source: row.provider_name,
    sourceUrl: row.source_url,
  }));

  if (!matches.length && !tables.length && !allNews.length && !transfers.length && !marketValues.length) return null;

  return {
    matches,
    tables,
    news: allNews.filter((item) => item.category === "news").slice(0, 10),
    rumours: allNews.filter((item) => item.category !== "news").slice(0, 12),
    transfers,
    marketValues,
    sources: mapSources(z.array(providerRowSchema).parse(results[5].results)),
    generatedAt: new Date().toISOString(),
  };
}
