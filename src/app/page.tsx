import { Activity, ArrowRight, BarChart3, Database, Globe2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LeagueTable } from "@/components/league-table";
import { MarketValues } from "@/components/market-values";
import { MatchStrip } from "@/components/match-strip";
import { NewsGrid } from "@/components/news-grid";
import { SourceBadge } from "@/components/source-badge";
import { Transfers } from "@/components/transfers";
import { getOverview } from "@/lib/services/overview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getOverview();
  const liveCount = data.matches.filter((match) => match.status === "live" && !match.sample).length;
  const leagueOrder = ["PL", "PD", "BL1", "SA", "FL1"];
  const leagueTables = data.tables
    .filter((table) => leagueOrder.includes(table.code))
    .sort((a, b) => leagueOrder.indexOf(a.code) - leagueOrder.indexOf(b.code));

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SOCCER KR 홈">
          <span className="brand-ball">S</span>
          <span>SOCCER<span className="brand-accent">/KR</span></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#matches">경기</a>
          <a href="#leagues">리그</a>
          <a href="#transfers">이적</a>
          <a href="#values">몸값</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="검색"><Search size={18} /></button>
          <a className="header-cta" href="#sources"><Database size={15} /> 데이터 상태</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="live-pill"><span /> {liveCount ? `${liveCount}경기 LIVE` : "무료 데이터 MVP"}</div>
          <h1>축구의 모든 숫자,<br /><em>번역 없이 한눈에.</em></h1>
          <p>월드컵부터 유럽 리그, 이적 가십과 확정 이적까지. 출처와 데이터 상태를 숨기지 않는 한국어 축구 데이터 허브를 만들고 있습니다.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#matches">오늘의 경기 <ArrowRight size={17} /></a>
            <a className="ghost-button" href="#sources"><ShieldCheck size={17} /> 무료 데이터 원칙</a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="pitch-lines"><span className="pitch-circle" /></div>
          <div className="stat-float stat-a"><span>xG</span><strong>1.84</strong><small>기대 득점</small></div>
          <div className="stat-float stat-b"><span>LIVE</span><strong>67&apos;</strong><small>샘플 화면</small></div>
          <div className="stat-float stat-c"><BarChart3 size={18} /><strong>92%</strong><small>데이터 완성도</small></div>
        </div>
      </section>

      <section className="ticker" aria-label="서비스 특징">
        <span><Globe2 size={15} /> 해외 원문을 한국어 맥락으로</span>
        <span><Activity size={15} /> 라이브 경기와 리그 지표</span>
        <span><Sparkles size={15} /> 가십과 확정 이적을 분리</span>
        <span><ShieldCheck size={15} /> 출처·갱신 상태 공개</span>
      </section>

      <section className="section" id="matches">
        <div className="section-heading">
          <div><span className="eyebrow">MATCH CENTRE</span><h2>지금, 축구는</h2></div>
          <span className="section-note">시간은 한국 기준 · 3일 이내 경기</span>
        </div>
        <MatchStrip matches={data.matches} />
      </section>

      <section className="section split-section" id="transfers">
        <div className="split-main">
          <div className="section-heading compact">
            <div><span className="eyebrow">TRANSFER RADAR</span><h2>이적시장 레이더</h2></div>
            <span className="rumour-key"><i /> 가십은 확정이 아닙니다</span>
          </div>
          <NewsGrid items={data.rumours} emptyText="현재 분류된 이적 가십이 없습니다." />
        </div>
        <aside className="source-rail" id="sources">
          <span className="eyebrow">DATA SOURCES</span>
          <h3>숫자보다 먼저<br />출처를 확인합니다.</h3>
          <div className="source-stack">
            {data.sources.map((source) => (
              <article key={source.provider}>
                <div><strong>{source.provider}</strong><SourceBadge state={source.state} /></div>
                <p>{source.note}</p>
              </article>
            ))}
          </div>
          <p className="source-policy">원문 기사 전체를 복제하지 않고 제목과 링크만 제공합니다. 샘플 숫자는 실제 데이터와 명확히 구분합니다.</p>
        </aside>
      </section>

      <section className="section" aria-labelledby="confirmed-title">
        <div className="section-heading">
          <div><span className="eyebrow">CONFIRMED MOVES</span><h2 id="confirmed-title">확정 이적</h2></div>
          <span className="section-note">루머와 별도 데이터로 관리</span>
        </div>
        <Transfers items={data.transfers} />
      </section>

      <section className="section" id="leagues">
        <div className="section-heading">
          <div><span className="eyebrow">LEAGUE PULSE</span><h2>리그 한눈에</h2></div>
          <span className="section-note">프리미어리그 · 라리가 · 분데스리가 · 세리에 A · 리그 1</span>
        </div>
        <div className="tables-grid">
          {leagueTables.map((table) => <LeagueTable table={table} key={table.code} />)}
        </div>
      </section>

      <section className="section" id="values">
        <div className="section-heading">
          <div><span className="eyebrow">MARKET VALUE</span><h2>선수 가치</h2></div>
          <span className="section-note">통화·평가기준·평가일을 함께 표시할 예정</span>
        </div>
        <MarketValues items={data.marketValues} />
      </section>

      <section className="section latest-news">
        <div className="section-heading">
          <div><span className="eyebrow">FOOTBALL NOW</span><h2>최신 축구 뉴스</h2></div>
          <span className="section-note">원문 출처로 이동</span>
        </div>
        <NewsGrid items={data.news.slice(0, 6)} emptyText="뉴스 피드를 불러오지 못했습니다." />
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-ball">S</span><span>SOCCER<span className="brand-accent">/KR</span></span></div>
        <p>무료 데이터로 시작하되, 출처와 권리를 흐리지 않습니다.</p>
        <div><a href="/api/health">API 상태</a><a href="/api/overview">Overview JSON</a></div>
      </footer>
    </main>
  );
}
