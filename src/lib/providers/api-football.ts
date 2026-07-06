import { z } from "zod";
import type { SourceMeta, TransferItem } from "@/lib/domain";

const BASE_URL = "https://v3.football.api-sports.io";

const transferResponseSchema = z.object({
  response: z.array(
    z.object({
      player: z.object({ id: z.number(), name: z.string() }),
      transfers: z.array(
        z.object({
          date: z.string(),
          type: z.string().nullish(),
          teams: z.object({
            in: z.object({ id: z.number(), name: z.string() }),
            out: z.object({ id: z.number(), name: z.string() }),
          }),
        }),
      ),
    }),
  ),
});

export function normalizeTransfers(input: unknown): TransferItem[] {
  const { response } = transferResponseSchema.parse(input);
  return response.flatMap(({ player, transfers }) =>
    transfers.map((transfer) => ({
      id: `af-${player.id}-${transfer.date}-${transfer.teams.out.id}-${transfer.teams.in.id}`,
      playerId: String(player.id),
      playerName: player.name,
      from: { id: String(transfer.teams.out.id), name: transfer.teams.out.name },
      to: { id: String(transfer.teams.in.id), name: transfer.teams.in.name },
      date: transfer.date,
      type: transfer.type ?? undefined,
      source: "API-Football",
    })),
  );
}

export async function getTransfers(): Promise<{ items: TransferItem[]; meta: SourceMeta }> {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  const teamIds = (process.env.API_FOOTBALL_TEAM_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!key || !teamIds.length) {
    return {
      items: [],
      meta: {
        provider: "API-Football transfers",
        state: "unavailable",
        updatedAt: new Date().toISOString(),
        note: "무료 API 키와 추적할 팀 ID가 필요합니다.",
      },
    };
  }

  const responses = await Promise.allSettled(
    teamIds.map(async (teamId) => {
      const response = await fetch(`${BASE_URL}/transfers?team=${encodeURIComponent(teamId)}`, {
        headers: { "x-apisports-key": key },
        next: { revalidate: 3600 },
      });
      if (!response.ok) throw new Error(`API-Football ${response.status}`);
      return normalizeTransfers(await response.json());
    }),
  );

  const all = responses.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const items = Array.from(new Map(all.map((item) => [item.id, item])).values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);

  return {
    items,
    meta: {
      provider: "API-Football transfers",
      state: items.length ? "live" : "unavailable",
      updatedAt: new Date().toISOString(),
      note: "무료 플랜 사용. 대회·로고·게시 권리는 출시 전에 별도 확인해야 합니다.",
    },
  };
}
