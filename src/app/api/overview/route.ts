import { NextResponse } from "next/server";
import { getOverview } from "@/lib/services/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getOverview();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "OVERVIEW_UNAVAILABLE", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 503 },
    );
  }
}
