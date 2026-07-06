import type { OverviewData } from "@/lib/domain";
import { demoMatches, demoTables } from "@/lib/demo-data";
import { getD1Overview } from "@/lib/db/overview";
import { getFootballData } from "@/lib/providers/football-data";
import { getMarketValues } from "@/lib/providers/market-values";
import { getNewsFeeds } from "@/lib/providers/rss";
import { getTransfers } from "@/lib/providers/api-football";

export async function getOverview(): Promise<OverviewData> {
  try {
    const stored = await getD1Overview();
    if (stored) return stored;
  } catch (error) {
    console.warn(
      JSON.stringify({
        message: "D1 overview fallback",
        error: error instanceof Error ? error.message : "unknown error",
      }),
    );
  }

  const [football, feeds, transfers, marketValues] = await Promise.all([
    getFootballData(),
    getNewsFeeds(),
    getTransfers(),
    getMarketValues(),
  ]);

  const demoEnabled = process.env.ENABLE_DEMO_DATA !== "false";
  const matches = football.matches.length ? football.matches : demoEnabled ? demoMatches : [];
  const tables = football.tables.length ? football.tables : demoEnabled ? demoTables : [];

  return {
    matches,
    tables,
    news: feeds.items.filter((item) => item.category === "news").slice(0, 10),
    rumours: feeds.items.filter((item) => item.category !== "news").slice(0, 12),
    transfers: transfers.items,
    marketValues: marketValues.items,
    sources: [
      football.matches.length || football.tables.length
        ? football.meta
        : { ...football.meta, state: demoEnabled ? "sample" : football.meta.state },
      feeds.meta,
      transfers.meta,
      marketValues.meta,
    ],
    generatedAt: new Date().toISOString(),
  };
}
