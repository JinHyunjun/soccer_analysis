import type { LeagueTable, MatchSummary } from "@/lib/domain";

export const demoMatches: MatchSummary[] = [
  {
    id: "sample-1",
    competition: "연결 전 화면 샘플",
    stage: "DEMO",
    kickoff: "2026-07-05T18:00:00Z",
    status: "live",
    minute: "67'",
    home: { id: "sample-home", name: "홈 팀" },
    away: { id: "sample-away", name: "원정 팀" },
    homeScore: 2,
    awayScore: 1,
    source: "sample",
    sample: true,
  },
  {
    id: "sample-2",
    competition: "연결 전 화면 샘플",
    stage: "DEMO",
    kickoff: "2026-07-06T01:00:00Z",
    status: "scheduled",
    home: { id: "sample-c", name: "팀 C" },
    away: { id: "sample-d", name: "팀 D" },
    homeScore: null,
    awayScore: null,
    source: "sample",
    sample: true,
  },
];

export const demoTables: LeagueTable[] = [
  {
    code: "DEMO",
    name: "연결 전 순위표 샘플",
    type: "LEAGUE",
    source: "sample",
    sample: true,
    rows: [
      { position: 1, team: { id: "1", name: "팀 A" }, played: 5, won: 4, drawn: 1, lost: 0, goalDifference: 8, points: 13 },
      { position: 2, team: { id: "2", name: "팀 B" }, played: 5, won: 3, drawn: 1, lost: 1, goalDifference: 4, points: 10 },
      { position: 3, team: { id: "3", name: "팀 C" }, played: 5, won: 2, drawn: 1, lost: 2, goalDifference: 0, points: 7 },
      { position: 4, team: { id: "4", name: "팀 D" }, played: 5, won: 1, drawn: 1, lost: 3, goalDifference: -5, points: 4 },
    ],
  },
];
