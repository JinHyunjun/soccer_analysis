PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'manual', 'licensed')),
  base_url TEXT,
  terms_url TEXT,
  attribution TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  country TEXT,
  competition_type TEXT,
  emblem_url TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_competitions_code ON competitions(code);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  transfermarkt_id TEXT,
  name TEXT NOT NULL,
  short_name TEXT,
  name_ko TEXT,
  crest_url TEXT,
  country TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_transfermarkt_id ON teams(transfermarkt_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  transfermarkt_id TEXT,
  name TEXT NOT NULL,
  name_ko TEXT,
  position TEXT,
  nationality TEXT,
  date_of_birth TEXT,
  current_team_id TEXT,
  source_url TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (current_team_id) REFERENCES teams(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_id ON players(transfermarkt_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  stage TEXT,
  kickoff_at TEXT NOT NULL,
  status TEXT NOT NULL,
  minute TEXT,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  source_url TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_status_kickoff ON matches(status, kickoff_at);

CREATE TABLE IF NOT EXISTS standing_rows (
  provider_id TEXT NOT NULL,
  competition_id TEXT NOT NULL,
  season TEXT NOT NULL,
  position INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider_id, competition_id, season, team_id),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_standings_competition_position
  ON standing_rows(competition_id, season, position);

CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ko TEXT,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gossip', 'transfer', 'news')),
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category_published ON news_items(category, published_at DESC);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  player_id TEXT,
  player_name TEXT NOT NULL,
  from_team_id TEXT,
  from_team_name TEXT NOT NULL,
  to_team_id TEXT,
  to_team_name TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  transfer_type TEXT,
  fee_text TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('rumour', 'reported', 'confirmed')),
  source_url TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (from_team_id) REFERENCES teams(id),
  FOREIGN KEY (to_team_id) REFERENCES teams(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_player ON transfers(player_id, transfer_date DESC);

CREATE TABLE IF NOT EXISTS market_value_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  value_amount INTEGER NOT NULL CHECK (value_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  valued_at TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  UNIQUE (player_id, provider_id, valued_at)
);

CREATE INDEX IF NOT EXISTS idx_market_value_player_date
  ON market_value_history(player_id, valued_at DESC);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  records_written INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_provider_started
  ON sync_runs(provider_id, started_at DESC);

INSERT OR IGNORE INTO providers
  (id, display_name, source_type, base_url, terms_url, attribution, updated_at)
VALUES
  ('football-data', 'football-data.org', 'api', 'https://api.football-data.org/v4', 'https://www.football-data.org/about', 'Data provided by football-data.org', CURRENT_TIMESTAMP),
  ('api-football', 'API-Football', 'api', 'https://v3.football.api-sports.io', 'https://www.api-football.com/terms', 'Data provided by API-Football', CURRENT_TIMESTAMP),
  ('bbc-rss', 'BBC Sport', 'rss', 'https://feeds.bbci.co.uk/sport/football/rss.xml', 'https://www.bbc.co.uk/usingthebbc/terms', 'From BBC Sport', CURRENT_TIMESTAMP),
  ('transfermarkt-rss', 'Transfermarkt', 'rss', 'https://www.transfermarkt.co.uk/rss/news', 'https://www.transfermarkt.com/intern/anb', 'News: Transfermarkt', CURRENT_TIMESTAMP),
  ('manual-authorized', 'Authorized manual import', 'manual', NULL, NULL, 'Source supplied per record', CURRENT_TIMESTAMP);
