import type { MetadataRoute } from "next";

const baseUrl = "https://soccer-korea-web.life-quiz.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/matches", "/standings", "/transfers", "/tech-stack", "/releases"];
  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date("2026-07-07T00:00:00+09:00"),
    changeFrequency: path === "/releases" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
