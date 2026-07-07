import { Clock3, Trophy } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getAllMatchesFromDB } from "@/lib/db/overview";
import type { MatchSummary } from "@/lib/domain";

export const dynamic = "force-dynamic";

const statusLabel: Record<MatchSummary["status"], string> = {
  live: "LIVE",
  finished: "종료",
  scheduled: "예정",
  postponed: "연기",
};

function kickoffLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

const filterLabels: Record<string, string> = {
  all: "전체",
  live: "LIVE",
  scheduled: "예정",
  finished: "종료",
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";

  let matches: MatchSummary[] = [];
  try {
    matches = await getAllMatchesFromDB();
  } catch {
    // DB not connected — show empty state
  }

  const filtered =
    statusFilter === "all"
      ? matches
      : matches.filter((m) => m.status === statusFilter);

  const grouped = new Map<string, MatchSummary[]>();
  for (const m of filtered) {
    const key = m.competition;
    const group = grouped.get(key) ?? [];
    group.push(m);
    grouped.set(key, group);
  }

  return (
    <main>
      <SiteNav active="/matches" />

      <div className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">MATCH CENTRE</span>
            <h1>경기 일정·결과</h1>
          </div>
          <p className="page-desc">최근 7일 · 앞으로 21일</p>
        </div>

        <div className="tab-bar">
          {Object.entries(filterLabels).map(([key, label]) => (
            <Link
              key={key}
              href={key === "all" ? "/matches" : `/matches?status=${key}`}
              className={`tab-btn${statusFilter === key ? " tab-active" : ""}${key === "live" ? " tab-live" : ""}`}
            >
              {key === "live" && <span className="live-dot" />}
              {label}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-panel" style={{ minHeight: 200 }}>
            {matches.length === 0
              ? "DB에 연결된 경기 데이터가 없습니다."
              : "해당 상태의 경기가 없습니다."}
          </div>
        ) : (
          <div className="match-page-groups">
            {Array.from(grouped.entries()).map(([competition, group]) => (
              <section key={competition} className="match-group">
                <div className="match-group-header">
                  <Trophy size={13} />
                  <span>{competition}</span>
                  <span className="match-group-count">{group.length}경기</span>
                </div>
                <div className="match-list">
                  {group.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${encodeURIComponent(match.id)}`}
                      className="match-row-link"
                    >
                      <article className="match-row">
                        <div className="match-row-meta">
                          <span className={`match-row-status status-${match.status}`}>
                            {match.sample ? "샘플" : match.minute ?? statusLabel[match.status]}
                          </span>
                          <span className="match-row-time">
                            <Clock3 size={11} />
                            {kickoffLabel(match.kickoff)}
                          </span>
                        </div>
                        <div className="match-row-teams">
                          <div className="match-row-team">
                            <span className="team-icon">{match.home.name.slice(0, 1)}</span>
                            <strong>{match.home.name}</strong>
                            <b>{match.homeScore ?? "-"}</b>
                          </div>
                          <div className="match-row-team">
                            <span className="team-icon away">{match.away.name.slice(0, 1)}</span>
                            <strong>{match.away.name}</strong>
                            <b>{match.awayScore ?? "-"}</b>
                          </div>
                        </div>
                        <span className="match-row-arrow">→</span>
                      </article>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
