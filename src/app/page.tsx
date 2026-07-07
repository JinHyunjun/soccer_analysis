import { Activity, ArrowRight, BarChart3, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LeagueTable } from "@/components/league-table";
import { MatchStrip } from "@/components/match-strip";
import { SourceBadge } from "@/components/source-badge";
import { Transfers } from "@/components/transfers";
import { SiteNav } from "@/components/site-nav";
import { getOverview } from "@/lib/services/overview";

export const dynamic = "force-dynamic";

const navCards = [
  {
    href: "/matches",
    eyebrow: "MATCH CENTRE",
    title: "경기",
    desc: "월드컵 · 5대 리그 일정과 실시간 스코어",
    icon: <Activity size={22} />,
    color: "card-lime",
  },
  {
    href: "/standings",
    eyebrow: "LEAGUE TABLES",
    title: "순위표",
    desc: "프리미어리그 · 라리가 · 분데스리가 · 세리에A · 리그1 전체 순위",
    icon: <BarChart3 size={22} />,
    color: "card-cyan",
  },
  {
    href: "/transfers",
    eyebrow: "TRANSFER RADAR",
    title: "이적·뉴스",
    desc: "확정 이적, 이적 소문, 최신 축구 뉴스를 한 화면에",
    icon: <ArrowRight size={22} />,
    color: "card-orange",
  },
  {
    href: "/api/health",
    eyebrow: "DATA STATUS",
    title: "데이터 상태",
    desc: "API 연결 · 마지막 동기화 시각 · 출처 정보",
    icon: <Database size={22} />,
    color: "card-muted",
  },
];

export default async function Home() {
  const data = await getOverview();
  const liveCount = data.matches.filter((m) => m.status === "live" && !m.sample).length;
  const leagueOrder = ["PL", "PD", "BL1", "SA", "FL1"];
  const leagueTables = data.tables
    .filter((t) => leagueOrder.includes(t.code))
    .sort((a, b) => leagueOrder.indexOf(a.code) - leagueOrder.indexOf(b.code));

  return (
    <main>
      <SiteNav active="/" />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="live-pill">
            <span />
            {liveCount ? `${liveCount}경기 LIVE 진행 중` : "한국어 축구 데이터 허브"}
          </div>
          <h1>축구의 모든 숫자,<br /><em>번역 없이 한눈에.</em></h1>
          <p>월드컵부터 유럽 5대 리그, 이적 정보까지. 출처와 데이터 상태를 숨기지 않는 한국어 축구 데이터 서비스입니다.</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/matches">경기 일정 보기 <ArrowRight size={17} /></Link>
            <Link className="ghost-button" href="/standings"><BarChart3 size={17} /> 리그 순위</Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="pitch-lines"><span className="pitch-circle" /></div>
          <div className="stat-float stat-a"><span>xG</span><strong>1.84</strong><small>기대 득점</small></div>
          <div className="stat-float stat-b"><span>LIVE</span><strong>67&apos;</strong><small>실시간 경기</small></div>
          <div className="stat-float stat-c"><BarChart3 size={18} /><strong>5개</strong><small>유럽 리그</small></div>
        </div>
      </section>

      <section className="section" id="nav-cards">
        <div className="nav-cards">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href} className={`nav-card ${card.color}`}>
              <div className="nav-card-icon">{card.icon}</div>
              <div>
                <span className="eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
              <ArrowRight size={16} className="nav-card-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section" id="matches">
        <div className="section-heading">
          <div><span className="eyebrow">MATCH CENTRE</span><h2>최근·예정 경기</h2></div>
          <Link className="section-more" href="/matches">전체 경기 보기 <ArrowRight size={13} /></Link>
        </div>
        <MatchStrip matches={data.matches} />
      </section>

      <section className="section" id="leagues">
        <div className="section-heading">
          <div><span className="eyebrow">LEAGUE PULSE</span><h2>리그 한눈에</h2></div>
          <Link className="section-more" href="/standings">전체 순위 보기 <ArrowRight size={13} /></Link>
        </div>
        <div className="tables-grid">
          {leagueTables.map((table) => <LeagueTable table={table} key={table.code} compact />)}
        </div>
      </section>

      <section className="section" id="transfers">
        <div className="section-heading">
          <div><span className="eyebrow">CONFIRMED MOVES</span><h2>최근 확정 이적</h2></div>
          <Link className="section-more" href="/transfers">이적·뉴스 전체 보기 <ArrowRight size={13} /></Link>
        </div>
        <Transfers items={data.transfers.slice(0, 6)} />
      </section>

      <section className="section" id="sources">
        <div className="section-heading">
          <div><span className="eyebrow">DATA SOURCES</span><h2>데이터 출처</h2></div>
        </div>
        <div className="sources-strip">
          {data.sources.map((source) => (
            <article key={source.provider} className="source-card">
              <div className="source-card-top">
                <strong>{source.provider}</strong>
                <SourceBadge state={source.state} />
              </div>
              <p>{source.note}</p>
            </article>
          ))}
        </div>
        <p className="source-policy-strip">
          <ShieldCheck size={12} />
          원문 기사 전체를 복제하지 않고 제목과 링크만 제공합니다.
        </p>
      </section>

      <footer className="site-footer">
        <div className="brand footer-brand"><span className="brand-ball">S</span><span>SOCCER<span className="brand-accent">/KR</span></span></div>
        <p>무료 데이터로 시작하되, 출처와 권리를 흐리지 않습니다.</p>
        <div>
          <Link href="/matches">경기</Link>
          <Link href="/standings">순위표</Link>
          <Link href="/transfers">이적·뉴스</Link>
          <Link href="/api/health">API 상태</Link>
        </div>
      </footer>
    </main>
  );
}
