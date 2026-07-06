import { ArrowUpRight, Radio } from "lucide-react";
import type { NewsItem } from "@/lib/domain";

function relativeTime(value: string): string {
  const diff = Date.now() - Date.parse(value);
  const hours = Math.max(0, Math.floor(diff / 3_600_000));
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function NewsGrid({ items, emptyText }: { items: NewsItem[]; emptyText: string }) {
  if (!items.length) return <div className="empty-panel">{emptyText}</div>;

  return (
    <div className="news-grid">
      {items.map((item, index) => (
        <a className={`news-card ${index === 0 ? "news-featured" : ""}`} href={item.link} target="_blank" rel="noreferrer" key={item.id}>
          <div className="news-meta">
            <span className={`news-category category-${item.category}`}>
              {item.category === "gossip" ? "가십" : item.category === "transfer" ? "이적" : "뉴스"}
            </span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
          <h3>{item.title}</h3>
          {index === 0 && item.summary && <p>{item.summary}</p>}
          <div className="news-source"><Radio size={13} /> {item.source} 원문 <ArrowUpRight size={14} /></div>
        </a>
      ))}
    </div>
  );
}
