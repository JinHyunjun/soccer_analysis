import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import {
  FALLBACK_RELEASE_FEED,
  NOTION_RELEASE_PAGE_ID,
  type ReleaseFeed,
  type ReleaseNote,
} from "@/content/releases";

const NOTION_API_VERSION = "2026-03-11";
const CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_BLOCKS = 500;
const VERSION_RE = /\bv?(\d+(?:\.\d+){1,2})\b/i;
const DATE_RE = /\b20\d{2}[-./]\d{1,2}[-./]\d{1,2}\b/;

const cacheRowSchema = z.object({ payload_json: z.string(), fetched_at: z.string() });

type ReleaseEnv = CloudflareEnv & {
  NOTION_TOKEN?: string;
  NOTION_RELEASE_PAGE_ID?: string;
};

export async function getReleaseFeed(now = new Date()): Promise<ReleaseFeed> {
  const { env } = getCloudflareContext();
  const releaseEnv = env as ReleaseEnv;
  const pageId = releaseEnv.NOTION_RELEASE_PAGE_ID || NOTION_RELEASE_PAGE_ID;
  const cached = await readCache(releaseEnv.DB, pageId);

  if (cached && now.getTime() - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) {
    return { ...cached, source: cached.source === "snapshot" ? "snapshot" : "cache" };
  }

  try {
    if (!releaseEnv.NOTION_TOKEN) throw new Error("Notion token is not configured");
    const blocks = await fetchNotionBlocks(pageId, releaseEnv.NOTION_TOKEN);
    const releases = parseNotionReleaseBlocks(blocks);
    if (!releases.length) throw new Error("Notion release page has no version headings");

    const feed: ReleaseFeed = {
      releases,
      fetchedAt: now.toISOString(),
      source: "notion",
      stale: false,
    };
    await writeCache(releaseEnv.DB, pageId, feed);
    return feed;
  } catch (error) {
    console.error(JSON.stringify({
      message: "Notion release sync failed",
      error: error instanceof Error ? error.message : "Unknown Notion error",
    }));
    return cached ? { ...cached, source: "cache", stale: true } : {
      ...FALLBACK_RELEASE_FEED,
      fetchedAt: now.toISOString(),
    };
  }
}

export function parseNotionReleaseBlocks(values: readonly unknown[]): ReleaseNote[] {
  const releases: ReleaseNote[] = [];
  let current: MutableRelease | null = null;
  let section = "변경 사항";

  for (const value of values) {
    const block = asRecord(value);
    const type = typeof block?.type === "string" ? block.type : "";
    const text = blockText(block, type).trim();
    if (!text) continue;

    if (type === "heading_1" || type === "heading_2") {
      const heading = parseHeading(text);
      if (heading) {
        current = { ...heading, summary: "", highlights: [], validation: [] };
        releases.push(current);
        section = "변경 사항";
      }
      continue;
    }
    if (!current) continue;

    if (type === "heading_3" || type === "heading_4") {
      section = text;
      continue;
    }
    if (type === "paragraph" && DATE_RE.test(text) && text.length < 40) {
      current.date = normalizeDate(text.match(DATE_RE)?.[0] ?? text);
      continue;
    }
    if (type === "paragraph" && !current.summary) {
      current.summary = text;
      continue;
    }
    if (type === "bulleted_list_item" || type === "numbered_list_item" || type === "to_do") {
      if (/검증|테스트|qa/i.test(section)) current.validation.push(text);
      else current.highlights.push(section === "변경 사항" ? text : `${section}: ${text}`);
    }
  }

  return releases.filter((release) => release.highlights.length || release.validation.length);
}

export function isReleaseFeed(value: unknown): value is ReleaseFeed {
  const feed = asRecord(value);
  return Boolean(
    feed
      && Array.isArray(feed.releases)
      && typeof feed.fetchedAt === "string"
      && ["notion", "cache", "snapshot"].includes(String(feed.source))
      && typeof feed.stale === "boolean",
  );
}

type MutableRelease = {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: string[];
  validation: string[];
};

function parseHeading(text: string): Pick<MutableRelease, "version" | "date" | "title"> | null {
  const version = text.match(VERSION_RE)?.[1];
  if (!version) return null;
  const dateMatch = text.match(DATE_RE)?.[0];
  const title = text
    .replace(VERSION_RE, "")
    .replace(dateMatch ?? "", "")
    .replace(/^[\s📦—–-]+|[\s—–-]+$/g, "")
    .trim();
  return {
    version,
    date: dateMatch ? normalizeDate(dateMatch) : "",
    title: title || "업데이트",
  };
}

function normalizeDate(value: string) {
  const [year, month, day] = value.split(/[-./]/).map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function blockText(block: Record<string, unknown> | null, type: string) {
  const payload = asRecord(block?.[type]);
  const richText = Array.isArray(payload?.rich_text) ? payload.rich_text : [];
  return richText
    .map((item) => asRecord(item)?.plain_text)
    .filter((text): text is string => typeof text === "string")
    .join("");
}

async function fetchNotionBlocks(pageId: string, token: string) {
  const blocks: unknown[] = [];
  let cursor: string | null = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "notion-version": NOTION_API_VERSION,
      },
    });
    if (!response.ok) throw new Error(`Notion API returned ${response.status}`);
    const body = asRecord(await response.json());
    const results = Array.isArray(body?.results) ? body.results : [];
    blocks.push(...results);
    if (blocks.length > MAX_BLOCKS) throw new Error("Notion release page exceeded the block limit");
    cursor = body?.has_more === true && typeof body.next_cursor === "string" ? body.next_cursor : null;
  } while (cursor);

  return blocks;
}

async function readCache(db: D1Database, key: string): Promise<ReleaseFeed | null> {
  const row = cacheRowSchema.safeParse(await db.prepare(`
    SELECT payload_json, fetched_at FROM release_note_cache WHERE cache_key = ?
  `).bind(key).first());
  if (!row.success) return null;
  try {
    const value: unknown = JSON.parse(row.data.payload_json);
    if (!isReleaseFeed(value)) return null;
    return { ...value, fetchedAt: row.data.fetched_at };
  } catch {
    return null;
  }
}

async function writeCache(db: D1Database, key: string, feed: ReleaseFeed) {
  await db.prepare(`
    INSERT INTO release_note_cache (cache_key, payload_json, fetched_at)
    VALUES (?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET payload_json = excluded.payload_json, fetched_at = excluded.fetched_at
  `).bind(key, JSON.stringify(feed), feed.fetchedAt).run();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
