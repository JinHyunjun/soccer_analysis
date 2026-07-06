import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Database,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchStats } from "@/lib/db/match-stats";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  live: "LIVE",
  finished: "경기 종료",
  scheduled: "경기 예정",
  postponed: "연기",
};

const eventLabel: Record<string, string> = {
  goal: "득점",
  card: "카드",
  substitution: "교체",
};

const detailLabel: Record<string, string> = {
  normal_goal: "필드골",
  penalty: "페널티킥",
  own_goal: "자책골",
};

function kickoffLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function displayStat(value: number | null, text: string | null, unit: string): string {
  if (value === null) return text ?? "-";
  if (unit === "percent") return `${value}%`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function compactValue(value: number | null, suffix = ""): string {
  return value === null ? "-" : `${value}${suffix}`;
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 200) notFound();
  let matchId: string;
  try {
    matchId = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const data = await getMatchStats(matchId);
  if (!data) notFound();

  const { match, teamStats, playerStats, events } = data;
  const statRows = new Map<string, {
    label: string;
    description: string;
    unit: string;
    home: { value: number | null; text: string | null } | null;
    away: { value: number | null; text: string | null } | null;
  }>();

  for (const stat of teamStats) {
    const row = statRows.get(stat.stat_code) ?? {
      label: stat.display_name_ko,
      description: stat.description_ko,
      unit: stat.unit,
      home: null,
      away: null,
    };
    const value = { value: stat.value_numeric, text: stat.value_text };
    if (stat.team_id === match.home_team_id) row.home = value;
    if (stat.team_id === match.away_team_id) row.away = value;
    statRows.set(stat.stat_code, row);
  }

  const homePlayers = playerStats.filter((player) => player.team_id === match.home_team_id);
  const awayPlayers = playerStats.filter((player) => player.team_id === match.away_team_id);

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <Link className="brand" href="/" aria-label="SOCCER KR 홈">
          <span className="brand-ball">S</span>
          <span>SOCCER<span className="brand-accent">/KR</span></span>
        </Link>
        <Link className="back-link" href="/#matches"><ArrowLeft size={16} /> 경기 목록</Link>
      </header>

      <section className="match-hero-card">
        <div className="match-detail-meta">
          <span><Trophy size={14} /> {match.competition}</span>
          {match.stage && <span>{match.stage}</span>}
          <strong className={`status-${match.status}`}>{statusLabel[match.status] ?? match.status}</strong>
        </div>
        <div className="scoreboard">
          <div className="score-team home-score-team">
            <span className="score-team-mark">{match.home_team.slice(0, 2)}</span>
            <h1>{match.home_team}</h1>
          </div>
          <div className="score-centre">
            <div><strong>{match.home_score ?? "-"}</strong><span>:</span><strong>{match.away_score ?? "-"}</strong></div>
            <small><Clock3 size={13} /> {kickoffLabel(match.kickoff_at)}</small>
          </div>
          <div className="score-team away-score-team">
            <span className="score-team-mark away-score-mark">{match.away_team.slice(0, 2)}</span>
            <h1>{match.away_team}</h1>
          </div>
        </div>
        <div className="provider-line"><Database size={13} /> 데이터 출처: {match.provider}</div>
      </section>

      <div className="detail-grid">
        <section className="detail-panel timeline-panel">
          <div className="detail-section-heading">
            <div><span className="eyebrow">MATCH TIMELINE</span><h2>주요 이벤트</h2></div>
            <Activity size={20} />
          </div>
          {events.length ? (
            <div className="event-list">
              {events.map((event) => {
                const isHome = event.team_name === match.home_team;
                return (
                  <article className={`event-row ${isHome ? "event-home" : "event-away"}`} key={event.id}>
                    <time>{event.minute ?? "-"}{event.stoppage_minute ? `+${event.stoppage_minute}` : ""}&apos;</time>
                    <span className="event-dot" />
                    <div>
                      <strong>{event.player_name ?? event.team_name ?? "경기 이벤트"}</strong>
                      <span>{eventLabel[event.event_type] ?? event.event_type} · {event.detail ? detailLabel[event.detail] ?? event.detail : "상세 미제공"}</span>
                    </div>
                    {event.home_score !== null && event.away_score !== null && (
                      <b>{event.home_score} - {event.away_score}</b>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="detail-empty">아직 기록된 주요 이벤트가 없습니다.</div>
          )}
        </section>

        <aside className="detail-panel data-note-panel">
          <ShieldCheck size={24} />
          <span className="eyebrow">DATA NOTE</span>
          <h2>숫자의 출처를<br />항상 함께 봅니다.</h2>
          <p>득점 이벤트는 OpenLigaDB, 팀·선수 상세 수치는 API-Football처럼 공급자별로 분리합니다. 서로 다른 평점이나 xG를 같은 척도로 합치지 않습니다.</p>
          <div><strong>{events.length}</strong><span>이벤트</span></div>
          <div><strong>{teamStats.length}</strong><span>팀 지표</span></div>
          <div><strong>{playerStats.length}</strong><span>선수 기록</span></div>
        </aside>
      </div>

      <section className="detail-panel team-stats-panel">
        <div className="detail-section-heading">
          <div><span className="eyebrow">TEAM COMPARISON</span><h2>팀 통계 비교</h2></div>
          <BarChart3 size={20} />
        </div>
        {statRows.size ? (
          <div className="team-stat-list">
            <div className="team-stat-head"><strong>{match.home_team}</strong><span>지표</span><strong>{match.away_team}</strong></div>
            {Array.from(statRows.entries()).map(([code, row]) => {
              const home = displayStat(row.home?.value ?? null, row.home?.text ?? null, row.unit);
              const away = displayStat(row.away?.value ?? null, row.away?.text ?? null, row.unit);
              const homeValue = Math.max(0, row.home?.value ?? 0);
              const awayValue = Math.max(0, row.away?.value ?? 0);
              const largestValue = Math.max(homeValue, awayValue, 1);
              const homeWidth = homeValue / largestValue * 38;
              const awayWidth = awayValue / largestValue * 38;
              return (
                <article className="team-stat-row" key={code} title={row.description}>
                  <strong>{home}</strong>
                  <div className="stat-name"><span>{row.label}</span><small>{row.description}</small></div>
                  <strong>{away}</strong>
                  <i className="home-stat-bar" style={{ width: `${homeWidth}%` }} />
                  <i className="away-stat-bar" style={{ width: `${awayWidth}%` }} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="detail-empty large-empty">
            <BarChart3 size={28} />
            <strong>이 경기의 팀 상세 통계는 아직 수집되지 않았습니다.</strong>
            <span>API-Football 무료 키가 연결되고 상세 통계 동기화가 완료되면 슈팅, 점유율, 패스, xG 등이 표시됩니다.</span>
          </div>
        )}
      </section>

      <section className="detail-panel player-stats-panel">
        <div className="detail-section-heading">
          <div><span className="eyebrow">PLAYER PERFORMANCE</span><h2>선수 경기 기록</h2></div>
          <Users size={20} />
        </div>
        {playerStats.length ? (
          <div className="player-team-columns">
            {[
              { name: match.home_team, players: homePlayers },
              { name: match.away_team, players: awayPlayers },
            ].map((team) => (
              <div className="player-stat-team" key={team.name}>
                <h3>{team.name}</h3>
                <div className="player-stat-scroll">
                  <table>
                    <thead><tr><th>선수</th><th>평점</th><th>분</th><th>골</th><th>도움</th><th>슈팅</th><th>패스%</th><th>태클</th><th>경합</th></tr></thead>
                    <tbody>
                      {team.players.map((player) => (
                        <tr key={player.player_id}>
                          <td><strong>{player.player_name}</strong><small>{player.position ?? "-"}{player.substitute ? " · 교체" : ""}</small></td>
                          <td><b className="rating-chip">{compactValue(player.rating)}</b></td>
                          <td>{compactValue(player.minutes)}</td>
                          <td>{compactValue(player.goals)}</td>
                          <td>{compactValue(player.assists)}</td>
                          <td>{compactValue(player.shots_on_target)}/{compactValue(player.shots_total)}</td>
                          <td>{compactValue(player.pass_accuracy, "%")}</td>
                          <td>{compactValue(player.tackles)}</td>
                          <td>{compactValue(player.duels_won)}/{compactValue(player.duels_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-empty large-empty">
            <Users size={28} />
            <strong>선수별 기록이 아직 없습니다.</strong>
            <span>상세 데이터가 제공되는 경기에서는 평점, 출전 시간, 슈팅, 패스, 태클, 경합을 한 화면에서 비교합니다.</span>
          </div>
        )}
      </section>

      <footer className="detail-footer">
        <p>마지막 화면 생성: {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(data.generatedAt))}</p>
        <Link href={`/api/matches/${encodeURIComponent(match.id)}/stats`}>원본 JSON 보기</Link>
      </footer>
    </main>
  );
}
