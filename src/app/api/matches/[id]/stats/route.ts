import { getMatchStats } from "@/lib/db/match-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!id || id.length > 200) {
    return Response.json({ error: "INVALID_MATCH_ID" }, { status: 400 });
  }
  let matchId: string;
  try {
    matchId = decodeURIComponent(id);
  } catch {
    return Response.json({ error: "INVALID_MATCH_ID" }, { status: 400 });
  }
  const data = await getMatchStats(matchId);
  if (!data) return Response.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
