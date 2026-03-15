-- Schema alignment: fix drift between DB tables and TypeScript types

-- =============================================================
-- NOTIFICATIONS: add action_url
-- =============================================================
ALTER TABLE notifications ADD COLUMN action_url TEXT;

-- =============================================================
-- KAGGLE_IDEAS: add QuantIdea spec columns
-- =============================================================
ALTER TABLE kaggle_ideas ADD COLUMN hypothesis TEXT;
ALTER TABLE kaggle_ideas ADD COLUMN dataset TEXT;
ALTER TABLE kaggle_ideas ADD COLUMN methodology TEXT;
ALTER TABLE kaggle_ideas ADD COLUMN eval_metric TEXT;

-- =============================================================
-- HABIT_LOGS: add source_id, duration_mins, notes
-- =============================================================
ALTER TABLE habit_logs ADD COLUMN source_id TEXT;
ALTER TABLE habit_logs ADD COLUMN duration_mins INT;
ALTER TABLE habit_logs ADD COLUMN notes TEXT;
