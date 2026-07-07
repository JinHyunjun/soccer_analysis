import { Clock3 } from "lucide-react";
import Link from "next/link";
import type { MatchSummary } from "@/lib/domain";

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
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function MatchStrip({ matches }: { matches: MatchSummary[] }) {
  if (!matches.length) {
    return <div className="empty-panel">연결된 경기 데이터가 없습니다.</div>;
  }

  return (
    <div className="match-strip">
      {matches.slice(0, 8).map((match) => {
        const card = (
          <article className="match-card">
          <div className="match-card-topline">
            <span>{match.competition}</span>
            <span className={`match-status status-${match.status}`}>
              {match.sample ? "샘플 · " : ""}{match.minute ?? statusLabel[match.status]}
            </span>
          </div>
          <div className="team-line">
            <span className="team-mark">{match.home.name.slice(0, 1)}</span>
            <strong>{match.home.name}</strong>
            <b>{match.homeScore ?? "-"}</b>
          </div>
          <div className="team-line">
            <span className="team-mark away-mark">{match.away.name.slice(0, 1)}</span>
            <strong>{match.away.name}</strong>
            <b>{match.awayScore ?? "-"}</b>
          </div>
          <div className="kickoff"><Clock3 size={13} /> 한국시간 {kickoffLabel(match.kickoff)}</div>
            {!match.sample && <span className="match-detail-hint">경기 상세 보기 →</span>}
          </article>
        );
        return match.sample ? (
          <div key={match.id}>{card}</div>
        ) : (
          <Link
            className="match-card-link"
            href={`/matches/${encodeURIComponent(match.id)}`}
            key={match.id}
            aria-label={`${match.home.name} 대 ${match.away.name} 경기 상세 보기`}
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}
