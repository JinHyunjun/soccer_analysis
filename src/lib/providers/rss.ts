import { createHash } from "node:crypto";
import Parser from "rss-parser";
import type { NewsItem, SourceMeta } from "@/lib/domain";

const BBC_FOOTBALL_RSS = "https://feeds.bbci.co.uk/sport/football/rss.xml";
const parser = new Parser();

const rumourPattern = /gossip|rumou?r|linked with|could join|eyeing|targeting/i;
const transferPattern = /transfer|signs?|signed|joins?|joined|deal|loan|move|departure|contract/i;

export function classifyNews(title: string): NewsItem["category"] {
  if (rumourPattern.test(title)) return "gossip";
  if (transferPattern.test(title)) return "transfer";
  return "news";
}

function sourceName(feedTitle: string | undefined, url: string): string {
  if (url.includes("bbc.co.uk")) return "BBC Sport";
  return feedTitle?.replace(/\s+-\s+Football.*$/i, "") || new URL(url).hostname;
}

export async function parseRssXml(xml: string, url = BBC_FOOTBALL_RSS): Promise<NewsItem[]> {
  const feed = await parser.parseString(xml);
  const source = sourceName(feed.title, url);

  return (feed.items ?? [])
    .filter((item) => item.title && item.link)
    .slice(0, 30)
    .map((item) => {
      const title = item.title!.trim();
      const link = item.link!;
      return {
        id: createHash("sha1").update(`${source}:${link}`).digest("hex").slice(0, 16),
        title,
        link,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
        source,
        category: classifyNews(title),
        summary: item.contentSnippet?.trim().slice(0, 240),
      };
    });
}

async function fetchFeed(url: string): Promise<NewsItem[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "SoccerKorea/0.1 (+local-development)" },
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`RSS ${response.status}: ${url}`);
  return parseRssXml(await response.text(), url);
}

export async function getNewsFeeds(): Promise<{ items: NewsItem[]; meta: SourceMeta }> {
  const extras = (process.env.EXTRA_RSS_FEEDS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const urls = [BBC_FOOTBALL_RSS, ...extras].slice(0, 4);
  const results = await Promise.allSettled(urls.map(fetchFeed));
  const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const unique = Array.from(new Map(items.map((item) => [item.link, item])).values()).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  return {
    items: unique,
    meta: {
      provider: "RSS headlines",
      state: unique.length ? "live" : "unavailable",
      updatedAt: new Date().toISOString(),
      attribution: "Headlines link to their original publishers",
      note: unique.length ? "제목과 링크만 제공하며 원문은 출처에서 확인합니다." : "RSS 피드를 불러오지 못했습니다.",
    },
  };
}
