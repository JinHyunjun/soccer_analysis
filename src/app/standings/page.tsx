import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { LeagueTable } from "@/components/league-table";
import { getFullStandingsFromDB } from "@/lib/db/overview";
import type { LeagueTable as LeagueTableType } from "@/lib/domain";

export const dynamic = "force-dynamic";

const leagueOrder = ["PL", "PD", "BL1", "SA", "FL1", "WC"];
const leagueLabels: Record<string, string> = {
  PL: "프리미어리그",
  PD: "라리가",
  BL1: "분데스리가",
  SA: "세리에 A",
  FL1: "리그 1",
  WC: "월드컵",
};

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  let tables: LeagueTableType[] = [];
  try {
    tables = await getFullStandingsFromDB();
  } catch {
    // DB not connected
  }

  const sorted = tables
    .filter((t) => leagueOrder.includes(t.code))
    .sort((a, b) => leagueOrder.indexOf(a.code) - leagueOrder.indexOf(b.code));

  const availableCodes = sorted.map((t) => t.code);
  const activeCode = availableCodes.includes(params.league ?? "")
    ? (params.league as string)
    : (availableCodes[0] ?? "PL");

  const activeTable = sorted.find((t) => t.code === activeCode);

  return (
    <main>
      <SiteNav active="/standings" />

      <div className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">LEAGUE TABLES</span>
            <h1>리그 순위표</h1>
          </div>
          <p className="page-desc">최신 시즌 기준 전체 순위</p>
        </div>

        <div className="tab-bar">
          {sorted.map((t) => (
            <Link
              key={t.code}
              href={`/standings?league=${t.code}`}
              className={`tab-btn${activeCode === t.code ? " tab-active" : ""}`}
            >
              {leagueLabels[t.code] ?? t.name}
            </Link>
          ))}
        </div>

        {!activeTable ? (
          <div className="empty-panel" style={{ minHeight: 200 }}>
            {tables.length === 0
              ? "DB에 연결된 순위 데이터가 없습니다."
              : "해당 리그 데이터가 없습니다."}
          </div>
        ) : (
          <div className="standings-full-wrap">
            <LeagueTable table={activeTable} compact={false} />
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
