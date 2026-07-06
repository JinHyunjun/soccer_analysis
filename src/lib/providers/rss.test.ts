import { describe, expect, it } from "vitest";
import { classifyNews, parseRssXml } from "./rss";

describe("RSS news provider", () => {
  it("separates gossip, transfers and normal news", () => {
    expect(classifyNews("Tuesday's football gossip: Club eyeing striker")).toBe("gossip");
    expect(classifyNews("Midfielder signs three-year deal")).toBe("transfer");
    expect(classifyNews("World Cup quarter-final preview")).toBe("news");
  });

  it("keeps headline links and source attribution", async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <title>BBC Sport - Football</title>
      <item><title>Player joins new club</title><link>https://example.com/story</link><pubDate>Sun, 05 Jul 2026 10:00:00 GMT</pubDate><description>A short summary</description></item>
    </channel></rss>`;

    const items = await parseRssXml(xml, "https://feeds.bbci.co.uk/sport/football/rss.xml");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: "BBC Sport", category: "transfer", link: "https://example.com/story" });
  });
});
