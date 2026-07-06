import type { FeedState } from "@/lib/domain";

const labels: Record<FeedState, string> = {
  live: "연결됨",
  cached: "캐시",
  sample: "샘플",
  unavailable: "미연결",
};

export function SourceBadge({ state }: { state: FeedState }) {
  return <span className={`source-badge source-${state}`}>{labels[state]}</span>;
}
