import { ArrowRight, BadgeCheck } from "lucide-react";
import type { TransferItem } from "@/lib/domain";

export function Transfers({ items }: { items: TransferItem[] }) {
  if (!items.length) {
    return (
      <div className="empty-panel transfer-empty">
        <BadgeCheck size={28} />
        <strong>확정 이적 공급자 미연결</strong>
        <span>무료 API-Football 키와 추적할 팀 ID를 설정하면 이 영역에 실제 이적이 표시됩니다.</span>
      </div>
    );
  }

  return (
    <div className="transfer-list">
      {items.slice(0, 12).map((item) => (
        <article className="transfer-row" key={item.id}>
          <div className="player-avatar">{item.playerName.slice(0, 1)}</div>
          <div className="transfer-player">
            <strong>{item.playerName}</strong>
            <span>{item.date} · {item.type ?? "이적"}</span>
          </div>
          <div className="club-route">
            <span>{item.from.name}</span><ArrowRight size={16} /><b>{item.to.name}</b>
          </div>
          <span className="source-small">{item.source}</span>
        </article>
      ))}
    </div>
  );
}
