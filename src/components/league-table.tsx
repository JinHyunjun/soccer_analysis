import type { LeagueTable as LeagueTableType } from "@/lib/domain";

export function LeagueTable({ table }: { table: LeagueTableType }) {
  return (
    <article className="table-card">
      <div className="table-heading">
        <div>
          <span className="eyebrow">LEAGUE TABLE</span>
          <h3>{table.name}</h3>
        </div>
        {table.sample && <span className="sample-chip">샘플</span>}
      </div>
      <div className="standings-head standings-row">
        <span>#</span><span>팀</span><span>경기</span><span>득실</span><span>승점</span>
      </div>
      {table.rows.slice(0, 7).map((row) => (
        <div className="standings-row" key={row.team.id}>
          <span className="standing-position">{row.position}</span>
          <strong>{row.team.shortName ?? row.team.name}</strong>
          <span>{row.played}</span>
          <span className={row.goalDifference > 0 ? "positive" : row.goalDifference < 0 ? "negative" : ""}>
            {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
          </span>
          <b>{row.points}</b>
        </div>
      ))}
      <div className="source-line">출처 · {table.source}</div>
    </article>
  );
}
