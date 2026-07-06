import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "soccer-korea", now: new Date().toISOString() });
}
