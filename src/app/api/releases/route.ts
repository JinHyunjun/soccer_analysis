import { NOTION_RELEASE_PAGE_URL } from "@/content/releases";
import { getReleaseFeed } from "@/lib/notion-releases";

export async function GET() {
  const feed = await getReleaseFeed();
  return Response.json(
    {
      service: "SOCCER/KR",
      currentVersion: feed.releases[0]?.version ?? null,
      notionPageUrl: NOTION_RELEASE_PAGE_URL,
      ...feed,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}
