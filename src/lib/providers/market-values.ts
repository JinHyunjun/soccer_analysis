import type { MarketValueItem, SourceMeta } from "@/lib/domain";

// 무료이면서 실시간·상업 게시까지 명확히 허용하는 안정적인 몸값 API가 없어
// 공급자 계약 전에는 빈 결과를 반환한다. 무단 크롤링이나 허위 샘플 값은 사용하지 않는다.
export async function getMarketValues(): Promise<{
  items: MarketValueItem[];
  meta: SourceMeta;
}> {
  return {
    items: [],
    meta: {
      provider: "Market value provider",
      state: "unavailable",
      updatedAt: new Date().toISOString(),
      note: "무료·실시간·재게시 허용 조건을 만족하는 공급자를 검증 중입니다.",
    },
  };
}
