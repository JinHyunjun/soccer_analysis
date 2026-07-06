export type FeedState = "live" | "cached" | "sample" | "unavailable";

export interface SourceMeta {
  provider: string;
  state: FeedState;
  updatedAt: string;
  attribution?: string;
  note?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  shortName?: string;
  crest?: string;
}

export interface MatchSummary {
  id: string;
  competition: string;
  stage?: string;
  kickoff: string;
  status: "scheduled" | "live" | "finished" | "postponed";
  minute?: string;
  home: TeamRef;
  away: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  source: string;
  sample?: boolean;
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface LeagueTable {
  code: string;
  name: string;
  type: string;
  rows: StandingRow[];
  source: string;
  sample?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  category: "gossip" | "transfer" | "news";
  summary?: string;
}

export interface TransferItem {
  id: string;
  playerId?: string;
  playerName: string;
  from: TeamRef;
  to: TeamRef;
  date: string;
  type?: string;
  fee?: string;
  source: string;
  sourceUrl?: string;
}

export interface MarketValueItem {
  id: string;
  playerName: string;
  teamName: string;
  valueEur: number;
  valuedAt: string;
  source: string;
  sourceUrl?: string;
}

export interface OverviewData {
  matches: MatchSummary[];
  tables: LeagueTable[];
  news: NewsItem[];
  rumours: NewsItem[];
  transfers: TransferItem[];
  marketValues: MarketValueItem[];
  sources: SourceMeta[];
  generatedAt: string;
}
