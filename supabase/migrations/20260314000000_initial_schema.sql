-- Initial schema: users, habit_logs, notifications, kaggle_ideas

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id       TEXT UNIQUE NOT NULL,
  email           TEXT,
  github_token    TEXT,
  push_subscription JSONB,
  notify_prefs    JSONB,
  roadmap_data    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_github_id ON users (github_id);

-- =============================================================
-- HABIT_LOGS
-- =============================================================
CREATE TABLE habit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  xp_earned   INT DEFAULT 0,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB
);

CREATE INDEX idx_habit_logs_user_time ON habit_logs (user_id, logged_at DESC);
CREATE INDEX idx_habit_logs_type ON habit_logs (type);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  delivered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at    TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_delivered ON notifications (user_id, delivered_at DESC);

-- =============================================================
-- KAGGLE_IDEAS
-- =============================================================
CREATE TABLE kaggle_ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  difficulty  TEXT,
  tags        TEXT[],
  saved       BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_ideas_user_id ON kaggle_ideas (user_id);
CREATE INDEX idx_kaggle_ideas_saved ON kaggle_ideas (user_id) WHERE saved = true;
