-- htrace2 — Database schema (SQLite)
-- Chạy tự động khi khởi động server (idempotent nhờ IF NOT EXISTS)

PRAGMA foreign_keys = ON;

-- Tài khoản admin
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Game
CREATE TABLE IF NOT EXISTS games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  banner_url  TEXT,
  total_slots INTEGER NOT NULL DEFAULT 10,
  status      TEXT NOT NULL DEFAULT 'waiting',   -- 'waiting' | 'active' | 'ended'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ngân hàng câu hỏi theo game
CREATE TABLE IF NOT EXISTS question_bank (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id        INTEGER NOT NULL,
  question_text  TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT NOT NULL,
  option_d       TEXT NOT NULL,
  correct_answer TEXT NOT NULL,                  -- 'a' | 'b' | 'c' | 'd'
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Trạm thuộc game
CREATE TABLE IF NOT EXISTS stations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id          INTEGER NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  map_link         TEXT,
  map_text         TEXT,
  hint             TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  max_teams        INTEGER NOT NULL DEFAULT 1,
  unit             TEXT,
  is_private       INTEGER NOT NULL DEFAULT 0,   -- 0=public, 1=private
  challenge_type   TEXT NOT NULL DEFAULT 'none', -- 'mcq' | 'physical' | 'none'
  question_id      INTEGER,                      -- FK → question_bank (nullable)
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE SET NULL
);

-- Đội chơi (join slots)
CREATE TABLE IF NOT EXISTS teams (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id            INTEGER NOT NULL,
  name               TEXT NOT NULL,
  slot_number        INTEGER NOT NULL,
  session_token      TEXT NOT NULL UNIQUE,       -- UUID, lưu ở localStorage
  status             TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'finished'
  current_station_id INTEGER,                    -- FK → stations (nullable)
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (current_station_id) REFERENCES stations(id) ON DELETE SET NULL,
  UNIQUE (game_id, slot_number),
  UNIQUE (game_id, name)
);

-- Bản ghi mỗi cặp (đội, trạm)
CREATE TABLE IF NOT EXISTS team_stations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id         INTEGER NOT NULL,
  station_id      INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'requested' | 'active' | 'timeup' | 'completed'
  requested_at    TEXT,                            -- lúc player bấm "Bắt đầu", chờ admin xác nhận (hết hạn sau 60s)
  started_at      TEXT,
  completed_at    TEXT,
  score           INTEGER NOT NULL DEFAULT 0,      -- có thể âm với trạm private
  visit_order     INTEGER,                         -- trạm thứ mấy đội này đến
  score_updated_by TEXT,                           -- 'team' | 'admin'
  answer          TEXT,                            -- đáp án MCQ player đã chọn
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
  UNIQUE (team_id, station_id)
);

CREATE INDEX IF NOT EXISTS idx_stations_game ON stations(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_game ON question_bank(game_id);
CREATE INDEX IF NOT EXISTS idx_teams_game ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_ts_team ON team_stations(team_id);
CREATE INDEX IF NOT EXISTS idx_ts_station ON team_stations(station_id);
