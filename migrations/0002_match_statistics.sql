PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS metric_definitions (
  code TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name_ko TEXT NOT NULL,
  description_ko TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'count',
  higher_is_better INTEGER CHECK (higher_is_better IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_match_stats (
  provider_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  stat_code TEXT NOT NULL,
  value_numeric REAL,
  value_text TEXT,
  unit TEXT NOT NULL DEFAULT 'count',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider_id, match_id, team_id, stat_code),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (stat_code) REFERENCES metric_definitions(code)
);

CREATE INDEX IF NOT EXISTS idx_team_match_stats_match
  ON team_match_stats(match_id, team_id);

CREATE TABLE IF NOT EXISTS player_match_stats (
  provider_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  minutes INTEGER,
  position TEXT,
  shirt_number INTEGER,
  rating REAL,
  captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
  substitute INTEGER NOT NULL DEFAULT 0 CHECK (substitute IN (0, 1)),
  shots_total INTEGER,
  shots_on_target INTEGER,
  goals INTEGER,
  goals_conceded INTEGER,
  assists INTEGER,
  saves INTEGER,
  passes_total INTEGER,
  key_passes INTEGER,
  pass_accuracy REAL,
  tackles INTEGER,
  blocks INTEGER,
  interceptions INTEGER,
  duels_total INTEGER,
  duels_won INTEGER,
  dribbles_attempted INTEGER,
  dribbles_successful INTEGER,
  dribbled_past INTEGER,
  fouls_drawn INTEGER,
  fouls_committed INTEGER,
  yellow_cards INTEGER,
  red_cards INTEGER,
  penalties_won INTEGER,
  penalties_conceded INTEGER,
  penalties_scored INTEGER,
  penalties_missed INTEGER,
  penalties_saved INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider_id, match_id, player_id),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_rating
  ON player_match_stats(match_id, rating DESC);

CREATE INDEX IF NOT EXISTS idx_player_match_stats_player
  ON player_match_stats(player_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  minute INTEGER,
  stoppage_minute INTEGER,
  team_id TEXT,
  player_id TEXT,
  player_name TEXT,
  assist_player_name TEXT,
  event_type TEXT NOT NULL,
  detail TEXT,
  home_score INTEGER,
  away_score INTEGER,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  UNIQUE (provider_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_match_events_match_minute
  ON match_events(match_id, minute, stoppage_minute);

INSERT OR IGNORE INTO providers
  (id, display_name, source_type, base_url, terms_url, attribution, updated_at)
VALUES
  ('openligadb', 'OpenLigaDB', 'api', 'https://api.openligadb.de', 'https://www.openligadb.de', 'Data provided by OpenLigaDB', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO metric_definitions
  (code, category, display_name_ko, description_ko, unit, higher_is_better)
VALUES
  ('shots_on_target', 'shooting', '유효 슈팅', '골문 안으로 향해 득점하거나 골키퍼에게 막힌 슈팅 수', 'count', 1),
  ('shots_off_target', 'shooting', '빗나간 슈팅', '골문 밖으로 향한 슈팅 수', 'count', 0),
  ('shots_total', 'shooting', '전체 슈팅', '유효·빗나감·수비 블록을 포함한 전체 슈팅 시도', 'count', 1),
  ('shots_blocked', 'shooting', '블록된 슈팅', '골문에 도달하기 전에 수비수에게 막힌 슈팅 수', 'count', 0),
  ('shots_inside_box', 'shooting', '박스 안 슈팅', '상대 페널티 박스 안에서 시도한 슈팅 수', 'count', 1),
  ('shots_outside_box', 'shooting', '박스 밖 슈팅', '상대 페널티 박스 밖에서 시도한 슈팅 수', 'count', 1),
  ('fouls', 'discipline', '파울', '심판이 해당 팀의 반칙으로 선언한 횟수', 'count', 0),
  ('corners', 'set_piece', '코너킥', '공격 팀이 얻은 코너킥 수', 'count', 1),
  ('offsides', 'attack', '오프사이드', '공격 과정에서 오프사이드가 선언된 횟수', 'count', 0),
  ('possession', 'possession', '점유율', '전체 유효 경기 시간 중 해당 팀이 공을 소유한 비율', 'percent', NULL),
  ('yellow_cards', 'discipline', '경고', '해당 팀이 받은 옐로카드 수', 'count', 0),
  ('red_cards', 'discipline', '퇴장', '해당 팀이 받은 레드카드 수', 'count', 0),
  ('goalkeeper_saves', 'goalkeeping', '골키퍼 선방', '상대 유효 슈팅을 골키퍼가 막아낸 횟수', 'count', 1),
  ('passes_total', 'passing', '전체 패스', '해당 팀이 시도한 전체 패스 수', 'count', 1),
  ('passes_accurate', 'passing', '성공 패스', '동료에게 정확히 연결된 패스 수', 'count', 1),
  ('pass_accuracy', 'passing', '패스 성공률', '전체 패스 중 성공한 패스의 비율', 'percent', 1),
  ('expected_goals', 'shooting', '기대 득점(xG)', '각 슈팅이 득점으로 이어질 확률을 합산한 모델 기반 값', 'decimal', 1),
  ('goals_prevented', 'goalkeeping', '실점 방지', '기대 실점과 실제 실점의 차이를 나타내는 골키퍼 지표', 'decimal', 1),
  ('api_football_other', 'other', '기타 공급자 통계', 'API-Football이 제공하지만 아직 표준 코드로 매핑하지 않은 통계', 'text', NULL);
