import Link from "next/link";
import type { LeagueTable as LeagueTableType } from "@/lib/domain";

export function LeagueTable({ table, compact = true }: { table: LeagueTableType; compact?: boolean }) {
  const rows = compact ? table.rows.slice(0, 7) : table.rows;
  return (
    <article className="table-card">
      <div className="table-heading">
        <div>
          <span className="eyebrow">LEAGUE TABLE</span>
          <h3>{table.name}</h3>
        </div>
        {table.pending && <span className="pending-chip">시즌 시작 전 · 순위 미정</span>}
        {table.sample && <span className="sample-chip">샘플</span>}
      </div>
      <div className={`standings-head standings-row${compact ? "" : " standings-row-full"}`}>
        <span>#</span><span>팀</span><span>경기</span>
        {!compact && <><span>승</span><span>무</span><span>패</span></>}
        <span>득실</span><span>승점</span>
      </div>
      {rows.map((row) => (
        <div className={`standings-row${compact ? "" : " standings-row-full"}`} key={row.team.id}>
          <span className="standing-position">{table.pending ? "-" : row.position}</span>
          <strong>{row.team.name}</strong>
          <span>{table.pending ? "-" : row.played}</span>
          {!compact && <><span className="positive">{table.pending ? "-" : row.won}</span><span>{table.pending ? "-" : row.drawn}</span><span className="negative">{table.pending ? "-" : row.lost}</span></>}
          <span className={row.goalDifference > 0 ? "positive" : row.goalDifference < 0 ? "negative" : ""}>
            {table.pending ? "-" : <>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</>}
          </span>
          <b>{table.pending ? "-" : row.points}</b>
        </div>
      ))}
      {compact && (
        <div className="table-more-link">
          <Link href={`/standings?league=${table.code}`}>전체 순위 보기 →</Link>
        </div>
      )}
      <div className="source-line">출처 · {table.source}</div>
    </article>
  );
}
