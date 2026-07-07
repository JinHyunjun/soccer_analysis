import { currentRelease, releases } from "@/content/releases";

export function GET() {
  return Response.json(
    {
      service: "SOCCER/KR",
      currentVersion: currentRelease.version,
      releases,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}
