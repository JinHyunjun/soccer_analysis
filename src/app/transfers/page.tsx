import { ArrowRight, BadgeCheck, Newspaper, Rss } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { NewsGrid } from "@/components/news-grid";
import { getOverview } from "@/lib/services/overview";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const data = await getOverview();

  return (
    <main>
      <SiteNav active="/transfers" />

      <div className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">TRANSFER RADAR</span>
            <h1>이적·뉴스</h1>
          </div>
          <p className="page-desc">확정 이적 · 이적 소문 · 최신 축구 뉴스</p>
        </div>

        <div className="transfers-page-grid">
          <section className="transfers-col">
            <div className="transfers-col-heading">
              <BadgeCheck size={18} />
              <div>
                <span className="eyebrow">CONFIRMED MOVES</span>
                <h2>확정 이적</h2>
              </div>
            </div>
            {data.transfers.length ? (
              <div className="transfer-list">
                {data.transfers.map((item) => (
                  <article className="transfer-row" key={item.id}>
                    <div className="player-avatar">{item.playerName.slice(0, 1)}</div>
                    <div className="transfer-player">
                      <strong>{item.playerName}</strong>
                      <span>{item.date} · {item.type ?? "이적"}</span>
                    </div>
                    <div className="club-route">
                      <span>{item.from.name}</span>
                      <ArrowRight size={14} />
                      <b>{item.to.name}</b>
                    </div>
                    {item.sourceUrl && (
                      <a className="source-small" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {item.source}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-panel">
                <BadgeCheck size={24} />
                <span>확정 이적 데이터가 없습니다. API-Football 키 연결 후 동기화하면 표시됩니다.</span>
              </div>
            )}
          </section>

          <section className="transfers-col">
            <div className="transfers-col-heading">
              <Rss size={18} />
              <div>
                <span className="eyebrow">TRANSFER GOSSIP</span>
                <h2>이적 소문</h2>
              </div>
              <span className="rumour-key"><i /> 가십은 확정이 아닙니다</span>
            </div>
            <NewsGrid items={data.rumours} emptyText="현재 분류된 이적 가십이 없습니다." layout="uniform" />
          </section>

          <section className="transfers-col">
            <div className="transfers-col-heading">
              <Newspaper size={18} />
              <div>
                <span className="eyebrow">FOOTBALL NOW</span>
                <h2>최신 뉴스</h2>
              </div>
            </div>
            <NewsGrid items={data.news} emptyText="뉴스 피드를 불러오지 못했습니다." layout="uniform" />
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
