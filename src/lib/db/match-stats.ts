import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { localizeTeamName } from "@/lib/localization";

const nullableNumber = z.number().nullable();
const nullableText = z.string().nullable();

const matchSchema = z.object({
  id: z.string(),
  competition: z.string(),
  stage: nullableText,
  kickoff_at: z.string(),
  status: z.string(),
  home_team_id: z.string(),
  away_team_id: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  home_short_name: nullableText,
  away_short_name: nullableText,
  home_score: nullableNumber,
  away_score: nullableNumber,
  home_penalties: nullableNumber,
  away_penalties: nullableNumber,
  provider_id: z.string(),
  provider: z.string(),
});

const providerMatchSchema = z.object({
  id: z.string(),
  home_team_id: z.string(),
  away_team_id: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  home_short_name: nullableText,
  away_short_name: nullableText,
});

const teamStatSchema = z.object({
  team_id: z.string(),
  team_name: z.string(),
  stat_code: z.string(),
  display_name_ko: z.string(),
  description_ko: z.string(),
  value_numeric: nullableNumber,
  value_text: nullableText,
  unit: z.string(),
});

const playerStatSchema = z.object({
  player_id: z.string(),
  player_name: z.string(),
  team_id: z.string(),
  team_name: z.string(),
  minutes: nullableNumber,
  position: nullableText,
  shirt_number: nullableNumber,
  rating: nullableNumber,
  captain: z.number(),
  substitute: z.number(),
  shots_total: nullableNumber,
  shots_on_target: nullableNumber,
  goals: nullableNumber,
  assists: nullableNumber,
  passes_total: nullableNumber,
  key_passes: nullableNumber,
  pass_accuracy: nullableNumber,
  tackles: nullableNumber,
  interceptions: nullableNumber,
  duels_total: nullableNumber,
  duels_won: nullableNumber,
  dribbles_attempted: nullableNumber,
  dribbles_successful: nullableNumber,
  fouls_drawn: nullableNumber,
  fouls_committed: nullableNumber,
  yellow_cards: nullableNumber,
  red_cards: nullableNumber,
  saves: nullableNumber,
});

const eventSchema = z.object({
  id: z.string(),
  minute: nullableNumber,
  stoppage_minute: nullableNumber,
  team_name: nullableText,
  player_name: nullableText,
  assist_player_name: nullableText,
  event_type: z.string(),
  detail: nullableText,
  home_score: nullableNumber,
  away_score: nullableNumber,
  team_id: nullableText,
});

export async function getMatchStats(matchId: string) {
  const { env } = getCloudflareContext();
  const matchResult = await env.DB.prepare(`
      SELECT m.id, c.name AS competition, m.stage, m.kickoff_at, m.status,
             m.home_team_id, m.away_team_id,
             ht.name AS home_team, at.name AS away_team,
             ht.short_name AS home_short_name, at.short_name AS away_short_name,
             m.home_score, m.away_score, m.home_penalties, m.away_penalties,
             m.provider_id,
             p.display_name AS provider
      FROM matches m
      JOIN competitions c ON c.id = m.competition_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      JOIN providers p ON p.id = m.provider_id
      WHERE m.id = ? LIMIT 1
    `).bind(matchId).all();
  const match = z.array(matchSchema).parse(matchResult.results)[0] ?? null;
  if (!match) return null;

  let statsMatchId = match.id;
  let statsHomeTeamId = match.home_team_id;
  if (match.provider_id !== "api-football") {
    const candidateResult = await env.DB.prepare(`
      SELECT m.id, m.home_team_id, m.away_team_id,
             ht.name AS home_team, at.name AS away_team,
             ht.short_name AS home_short_name, at.short_name AS away_short_name
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      WHERE m.provider_id = 'api-football'
        AND ABS(strftime('%s', m.kickoff_at) - strftime('%s', ?)) <= 600
      LIMIT 8
    `).bind(match.kickoff_at).all();
    const homeKo = localizeTeamName(match.home_short_name, match.home_team);
    const awayKo = localizeTeamName(match.away_short_name, match.away_team);
    const linked = z.array(providerMatchSchema).parse(candidateResult.results).find((candidate) =>
      localizeTeamName(candidate.home_short_name, candidate.home_team) === homeKo
      && localizeTeamName(candidate.away_short_name, candidate.away_team) === awayKo);
    if (linked) {
      statsMatchId = linked.id;
      statsHomeTeamId = linked.home_team_id;
    }
  }

  const results = await env.DB.batch([
    env.DB.prepare(`
      SELECT tms.team_id, t.name AS team_name, tms.stat_code, md.display_name_ko,
             md.description_ko, tms.value_numeric, tms.value_text, tms.unit
      FROM team_match_stats tms
      JOIN teams t ON t.id = tms.team_id
      JOIN metric_definitions md ON md.code = tms.stat_code
      WHERE tms.match_id = ?
      ORDER BY t.name, md.category, md.display_name_ko
    `).bind(statsMatchId),
    env.DB.prepare(`
      SELECT pms.player_id, pms.player_name, pms.team_id, t.name AS team_name,
             pms.minutes, pms.position, pms.shirt_number, pms.rating,
             pms.captain, pms.substitute, pms.shots_total, pms.shots_on_target,
             pms.goals, pms.assists, pms.passes_total, pms.key_passes,
             pms.pass_accuracy, pms.tackles, pms.interceptions, pms.duels_total,
             pms.duels_won, pms.dribbles_attempted, pms.dribbles_successful,
             pms.fouls_drawn, pms.fouls_committed, pms.yellow_cards,
             pms.red_cards, pms.saves
      FROM player_match_stats pms
      JOIN teams t ON t.id = pms.team_id
      WHERE pms.match_id = ?
      ORDER BY pms.rating DESC, pms.minutes DESC, pms.player_name
    `).bind(statsMatchId),
    env.DB.prepare(`
      SELECT me.id, me.minute, me.stoppage_minute, me.team_id, t.name AS team_name,
             me.player_name, me.assist_player_name, me.event_type, me.detail,
             me.home_score, me.away_score
      FROM match_events me
      LEFT JOIN teams t ON t.id = me.team_id
      WHERE me.match_id = ?
      ORDER BY CASE WHEN me.minute IS NULL THEN 1 ELSE 0 END, me.minute, me.stoppage_minute, me.id
    `).bind(statsMatchId),
    env.DB.prepare(`
      SELECT me.id, me.minute, me.stoppage_minute, me.team_id, t.name AS team_name,
             me.player_name, me.assist_player_name, me.event_type, me.detail,
             me.home_score, me.away_score
      FROM match_events me
      LEFT JOIN teams t ON t.id = me.team_id
      WHERE me.match_id = ?
      ORDER BY CASE WHEN me.minute IS NULL THEN 1 ELSE 0 END, me.minute, me.stoppage_minute, me.id
    `).bind(matchId),
  ]);

  const teamStats = z.array(teamStatSchema).parse(results[0].results).map((stat) => ({
    ...stat,
    side: stat.team_id === statsHomeTeamId ? "home" as const : "away" as const,
  }));
  const playerStats = z.array(playerStatSchema).parse(results[1].results).map((player) => ({
    ...player,
    side: player.team_id === statsHomeTeamId ? "home" as const : "away" as const,
  }));
  const providerEvents = z.array(eventSchema).parse(results[2].results);
  const primaryEvents = z.array(eventSchema).parse(results[3].results);
  const selectedEvents = providerEvents.length ? providerEvents : primaryEvents;
  const eventHomeTeamId = providerEvents.length ? statsHomeTeamId : match.home_team_id;
  return {
    match: {
      ...match,
      home_team_ko: localizeTeamName(match.home_short_name, match.home_team),
      away_team_ko: localizeTeamName(match.away_short_name, match.away_team),
    },
    teamStats,
    playerStats,
    events: selectedEvents.map((event) => ({
      ...event,
      side: event.team_id === eventHomeTeamId ? "home" as const : "away" as const,
    })),
    statsProviderLinked: statsMatchId !== match.id,
    generatedAt: new Date().toISOString(),
  };
}
