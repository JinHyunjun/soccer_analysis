import { CircleDollarSign, ShieldAlert } from "lucide-react";
import type { MarketValueItem } from "@/lib/domain";

const euro = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function MarketValues({ items }: { items: MarketValueItem[] }) {
  if (!items.length) {
    return (
      <div className="value-empty">
        <div className="value-empty-icon"><ShieldAlert size={28} /></div>
        <div>
          <span className="eyebrow">DATA INTEGRITY FIRST</span>
          <h3>몸값 데이터는 아직 연결하지 않았습니다</h3>
          <p>무료라는 이유로 Transfermarkt를 무단 수집하거나 가짜 숫자를 채우지 않습니다. 재게시 권리가 확인된 공개 공급자가 준비되면 어댑터만 추가합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="value-list">
      {items.map((item) => (
        <article key={item.id}>
          <CircleDollarSign size={18} />
          <div><strong>{item.playerName}</strong><span>{item.teamName}</span></div>
          <b>{euro.format(item.valueEur)}</b>
        </article>
      ))}
    </div>
  );
}
